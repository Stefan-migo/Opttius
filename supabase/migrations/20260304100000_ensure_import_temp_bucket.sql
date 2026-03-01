-- Ensure import-temp bucket exists (idempotent - safe to run multiple times)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'import-temp',
  'import-temp',
  false,
  5242880,
  ARRAY['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;
