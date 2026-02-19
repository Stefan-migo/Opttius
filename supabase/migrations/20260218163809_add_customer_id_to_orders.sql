-- Add customer_id to orders for proper CRM integration
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

-- Migrate existing orders: link by email + branch_id where customer exists
UPDATE public.orders o
SET customer_id = c.id
FROM public.customers c
WHERE o.customer_id IS NULL
  AND o.email IS NOT NULL
  AND o.branch_id IS NOT NULL
  AND c.email IS NOT NULL
  AND LOWER(TRIM(o.email)) = LOWER(TRIM(c.email))
  AND c.branch_id = o.branch_id;
