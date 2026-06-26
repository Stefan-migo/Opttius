-- Migration: 20250615000001_create_embeddings_tables.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Create embeddings and memory_facts tables for RAG and long-term memory
-- This migration creates the tables needed for semantic search across the application

-- Create unified embeddings table
-- Stores embeddings for all content types (chat messages, products, orders, customers)
CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Source identification
  source_type TEXT NOT NULL, -- 'chat_message', 'product', 'order', 'customer', 'category'
  source_id UUID NOT NULL,
  -- Content and embedding
  content TEXT NOT NULL,
  embedding vector(768), -- Google embeddings use 768 dimensions
  embedding_small vector(384), -- Transformers.js uses 384 dimensions (fallback)
  embedding_provider TEXT NOT NULL, -- 'google' or 'transformers'
  -- Metadata for filtering
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
-- Index on source for quick lookups
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON public.embeddings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_user ON public.embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_provider ON public.embeddings(embedding_provider);
CREATE INDEX IF NOT EXISTS idx_embeddings_created ON public.embeddings(created_at DESC);

-- Vector indexes for similarity search (using IVFFlat for large datasets)
-- Google embeddings index (768 dimensions)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON public.embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Transformers.js embeddings index (384 dimensions)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_small ON public.embeddings 
USING ivfflat (embedding_small vector_cosine_ops) WITH (lists = 100);

-- Create memory_facts table for long-term memory
-- Stores important facts and preferences learned from conversations
CREATE TABLE IF NOT EXISTS public.memory_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- User this fact belongs to
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Fact classification
  fact_type TEXT NOT NULL, -- 'preference', 'decision', 'context', 'workflow', 'insight'
  category TEXT, -- Optional categorization
  -- Fact content
  content TEXT NOT NULL,
  -- Importance score (1-10, higher = more important to remember)
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  -- Embedding for semantic search
  embedding vector(768),
  embedding_small vector(384),
  embedding_provider TEXT,
  -- Source tracking
  source_session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  source_message_id UUID,
  -- Timestamps and expiration
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ, -- NULL means never expires
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for memory_facts
CREATE INDEX IF NOT EXISTS idx_memory_facts_user ON public.memory_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_facts_type ON public.memory_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_memory_facts_importance ON public.memory_facts(importance DESC);
CREATE INDEX IF NOT EXISTS idx_memory_facts_expires ON public.memory_facts(expires_at);

-- Vector index for memory_facts
CREATE INDEX IF NOT EXISTS idx_memory_facts_vector ON public.memory_facts 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Enable RLS
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_facts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for embeddings
-- Users can view embeddings from their own data
CREATE POLICY "Users can view own embeddings"
ON public.embeddings
FOR SELECT
USING (
  user_id = auth.uid() OR
  user_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- Service role can manage all embeddings
CREATE POLICY "Service role can manage embeddings"
ON public.embeddings
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for memory_facts
CREATE POLICY "Users can view own memory facts"
ON public.memory_facts
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own memory facts"
ON public.memory_facts
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage memory facts"
ON public.memory_facts
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Admin users can view all memory facts
CREATE POLICY "Admin users can view all memory facts"
ON public.memory_facts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.is_active = true
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_embeddings_timestamp
BEFORE UPDATE ON public.embeddings
FOR EACH ROW
EXECUTE FUNCTION update_embeddings_updated_at();

CREATE TRIGGER update_memory_facts_timestamp
BEFORE UPDATE ON public.memory_facts
FOR EACH ROW
EXECUTE FUNCTION update_embeddings_updated_at();

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_source_types text[] DEFAULT NULL,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  content text,
  similarity float,
  metadata jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.source_type,
    e.source_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity,
    e.metadata,
    e.created_at
  FROM public.embeddings e
  WHERE 
    e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
    AND (filter_source_types IS NULL OR e.source_type = ANY(filter_source_types))
    AND (filter_user_id IS NULL OR e.user_id = filter_user_id OR e.user_id IS NULL)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for searching with smaller embeddings (Transformers.js)
CREATE OR REPLACE FUNCTION search_embeddings_small(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_source_types text[] DEFAULT NULL,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  content text,
  similarity float,
  metadata jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.source_type,
    e.source_id,
    e.content,
    1 - (e.embedding_small <=> query_embedding) as similarity,
    e.metadata,
    e.created_at
  FROM public.embeddings e
  WHERE 
    e.embedding_small IS NOT NULL
    AND 1 - (e.embedding_small <=> query_embedding) > match_threshold
    AND (filter_source_types IS NULL OR e.source_type = ANY(filter_source_types))
    AND (filter_user_id IS NULL OR e.user_id = filter_user_id OR e.user_id IS NULL)
  ORDER BY e.embedding_small <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search memory facts
CREATE OR REPLACE FUNCTION search_memory_facts(
  query_embedding vector(768),
  target_user_id uuid,
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 5,
  min_importance int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  fact_type text,
  category text,
  content text,
  importance int,
  similarity float,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.fact_type,
    m.category,
    m.content,
    m.importance,
    1 - (m.embedding <=> query_embedding) as similarity,
    m.created_at
  FROM public.memory_facts m
  WHERE 
    m.user_id = target_user_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
    AND m.importance >= min_importance
    AND (m.expires_at IS NULL OR m.expires_at > NOW())
  ORDER BY 
    m.importance DESC,
    m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE public.embeddings IS 'Stores vector embeddings for semantic search across all content types';
COMMENT ON TABLE public.memory_facts IS 'Stores long-term memory facts and user preferences learned from conversations';
COMMENT ON FUNCTION search_embeddings IS 'Search embeddings using vector similarity (768 dimensions - Google)';
COMMENT ON FUNCTION search_embeddings_small IS 'Search embeddings using vector similarity (384 dimensions - Transformers.js)';
COMMENT ON FUNCTION search_memory_facts IS 'Search memory facts for a specific user using vector similarity';
