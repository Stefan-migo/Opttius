-- Add feedback_comment column to ai_insights for qualitative feedback
ALTER TABLE public.ai_insights
ADD COLUMN IF NOT EXISTS feedback_comment TEXT;

COMMENT ON COLUMN public.ai_insights.feedback_comment IS 'Optional free-text comment from user when giving feedback (max 500 chars)';
