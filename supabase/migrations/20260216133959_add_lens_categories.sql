-- Insert lens categories for filtering families by prescription type

INSERT INTO public.categories (name, slug, description, is_active, sort_order, is_system, created_at)
VALUES
  ('Monofocales', 'monofocales', 'Lentes monofocales', true, 10, true, NOW()),
  ('Progresivos', 'progresivos', 'Lentes progresivos', true, 11, true, NOW()),
  ('Bifocales', 'bifocales', 'Lentes bifocales', true, 12, true, NOW()),
  ('Lectura', 'lectura', 'Lentes de lectura', true, 13, true, NOW()),
  ('Ocupacional', 'ocupacional', 'Lentes ocupacionales', true, 14, true, NOW()),
  ('Deportivo', 'deportivo', 'Lentes deportivos', true, 15, true, NOW()),
  ('Lentes de contacto', 'lentes-contacto', 'Lentes de contacto', true, 16, true, NOW())
ON CONFLICT (slug) DO NOTHING;
