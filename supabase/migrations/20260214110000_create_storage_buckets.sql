-- Create storage buckets for production (matching config.toml)
-- product-images, images, uploads are for app assets
-- database-backups is for maintenance backups

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 52428800, ARRAY['image/png','image/jpeg','image/webp','image/gif']),
  ('images', 'images', true, 52428800, ARRAY['image/png','image/jpeg','image/webp','image/gif']),
  ('uploads', 'uploads', true, 52428800, ARRAY['image/png','image/jpeg','image/webp','image/gif']),
  ('database-backups', 'database-backups', false, 104857600, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;
