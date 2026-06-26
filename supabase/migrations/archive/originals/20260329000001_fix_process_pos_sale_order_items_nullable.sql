-- Migration: 20260329000001_fix_process_pos_sale_order_items_nullable.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix process_pos_sale RPC for order_items with temp IDs (lens-, frame-manual-, treatments-, labor-)
-- POS items with temp IDs have no product_id; use NULL for order_items.
-- Also allow order_items.product_id to be NULL for POS compatibility.

-- 1. Allow product_id NULL in order_items (for POS temp lens/labor items)
ALTER TABLE public.order_items
  ALTER COLUMN product_id DROP NOT NULL;

-- 2. Update process_pos_sale to handle null product_id in order_items
CREATE OR REPLACE FUNCTION public.process_pos_sale(
  p_payload JSONB,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_work_order_id UUID;
  v_work_order_number TEXT;
  v_order RECORD;
  v_item JSONB;
  v_payment JSONB;
  v_stock JSONB;
  v_work_order JSONB;
  v_pos_tx JSONB;
  v_branch_id UUID;
  v_pos_session_id UUID;
  v_wo_num TEXT;
  v_product_id UUID;
BEGIN
  -- Extract order data
  v_order := (p_payload->>'order')::jsonb;
  v_branch_id := (v_order->>'branch_id')::uuid;
  v_pos_session_id := (v_order->>'pos_session_id')::uuid;

  -- 1. Insert order
  INSERT INTO public.orders (
    order_number,
    email,
    status,
    payment_status,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    currency,
    mp_payment_method,
    branch_id,
    organization_id,
    field_operation_id,
    is_pos_sale,
    pos_session_id,
    pos_cashier_id,
    customer_name,
    billing_first_name,
    billing_last_name,
    sii_rut,
    sii_business_name,
    customer_id,
    agreement_id,
    purchase_order_id,
    copago_amount,
    institutional_amount
  ) VALUES (
    v_order->>'order_number',
    COALESCE(v_order->>'email', 'venta@pos.local'),
    COALESCE(v_order->>'status', 'processing'),
    COALESCE(v_order->>'payment_status', 'paid'),
    (v_order->>'subtotal')::decimal,
    COALESCE((v_order->>'tax_amount')::decimal, 0),
    COALESCE((v_order->>'discount_amount')::decimal, 0),
    (v_order->>'total_amount')::decimal,
    COALESCE(v_order->>'currency', 'CLP'),
    v_order->>'mp_payment_method',
    v_branch_id,
    (v_order->>'organization_id')::uuid,
    (v_order->>'field_operation_id')::uuid,
    true,
    v_pos_session_id,
    p_user_id,
    v_order->>'customer_name',
    v_order->>'billing_first_name',
    v_order->>'billing_last_name',
    v_order->>'sii_rut',
    v_order->>'sii_business_name',
    (v_order->>'customer_id')::uuid,
    (v_order->>'agreement_id')::uuid,
    (v_order->>'purchase_order_id')::uuid,
    (v_order->>'copago_amount')::decimal,
    (v_order->>'institutional_amount')::decimal
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- 2. Insert order_items (product_id NULL for temp IDs: lens-, frame-manual-, treatments-, labor-)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'order_items')
  LOOP
    -- Parse product_id: NULL if empty, invalid UUID, or temp ID pattern
    BEGIN
      IF v_item->>'product_id' IS NULL OR v_item->>'product_id' = '' THEN
        v_product_id := NULL;
      ELSIF v_item->>'product_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        v_product_id := (v_item->>'product_id')::uuid;
      ELSE
        v_product_id := NULL; -- temp IDs: lens-, frame-manual-, treatments-, labor-, discount-
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_product_id := NULL;
    END;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      total_price,
      sku
    ) VALUES (
      v_order_id,
      v_product_id,
      COALESCE(v_item->>'product_name', 'Producto'),
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::decimal,
      (v_item->>'total_price')::decimal,
      v_item->>'sku'
    );
  END LOOP;

  -- 3. Insert order_payments
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payload->'order_payments')
  LOOP
    INSERT INTO public.order_payments (
      order_id,
      amount,
      payment_method,
      pos_session_id,
      payment_reference,
      created_by,
      notes
    ) VALUES (
      v_order_id,
      (v_payment->>'amount')::decimal,
      v_payment->>'payment_method',
      v_pos_session_id,
      v_payment->>'payment_reference',
      p_user_id,
      v_payment->>'notes'
    );
  END LOOP;

  -- 4. Stock reduction (stock_reductions built by API - only physical products with valid UUIDs)
  FOR v_stock IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'stock_reductions', '[]'::jsonb))
  LOOP
    PERFORM update_product_stock(
      (v_stock->>'product_id')::uuid,
      (v_stock->>'branch_id')::uuid,
      -((v_stock->>'quantity')::int),
      false,
      'sale',
      'order',
      v_order_id,
      p_user_id
    );
  END LOOP;

  -- 5. Lab work order (if provided)
  v_work_order := p_payload->'work_order';
  IF v_work_order IS NOT NULL AND v_work_order != 'null'::jsonb THEN
    v_wo_num := generate_work_order_number();
    INSERT INTO public.lab_work_orders (
      work_order_number,
      branch_id,
      field_operation_id,
      operativo_batch_id,
      customer_id,
      prescription_id,
      quote_id,
      frame_product_id,
      frame_name,
      frame_brand,
      frame_model,
      frame_color,
      frame_size,
      frame_sku,
      lens_family_id,
      lens_type,
      lens_material,
      lens_index,
      lens_treatments,
      lens_tint_color,
      lens_tint_percentage,
      presbyopia_solution,
      far_lens_family_id,
      near_lens_family_id,
      far_lens_cost,
      near_lens_cost,
      contact_lens_family_id,
      contact_lens_quantity,
      contact_lens_cost,
      frame_cost,
      lens_cost,
      treatments_cost,
      labor_cost,
      lab_cost,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      currency,
      status,
      payment_status,
      deposit_amount,
      balance_amount,
      pos_order_id,
      agreement_id,
      internal_notes,
      assigned_to,
      created_by
    ) VALUES (
      v_wo_num,
      v_branch_id,
      (v_work_order->>'field_operation_id')::uuid,
      (v_work_order->>'field_operation_id')::uuid,
      (v_work_order->>'customer_id')::uuid,
      (v_work_order->>'prescription_id')::uuid,
      (v_work_order->>'quote_id')::uuid,
      (v_work_order->>'frame_product_id')::uuid,
      COALESCE(v_work_order->>'frame_name', 'Marco'),
      v_work_order->>'frame_brand',
      v_work_order->>'frame_model',
      v_work_order->>'frame_color',
      v_work_order->>'frame_size',
      v_work_order->>'frame_sku',
      (v_work_order->>'lens_family_id')::uuid,
      COALESCE(v_work_order->>'lens_type', 'single_vision'),
      COALESCE(v_work_order->>'lens_material', 'cr39'),
      (v_work_order->>'lens_index')::decimal,
      COALESCE(
        (SELECT array_agg(x::text) FROM jsonb_array_elements_text(COALESCE(v_work_order->'lens_treatments', '[]'::jsonb)) x),
        '{}'
      ),
      v_work_order->>'lens_tint_color',
      (v_work_order->>'lens_tint_percentage')::int,
      COALESCE(v_work_order->>'presbyopia_solution', 'none'),
      (v_work_order->>'far_lens_family_id')::uuid,
      (v_work_order->>'near_lens_family_id')::uuid,
      (v_work_order->>'far_lens_cost')::decimal,
      (v_work_order->>'near_lens_cost')::decimal,
      (v_work_order->>'contact_lens_family_id')::uuid,
      (v_work_order->>'contact_lens_quantity')::int,
      (v_work_order->>'contact_lens_cost')::decimal,
      (v_work_order->>'frame_cost')::decimal,
      (v_work_order->>'lens_cost')::decimal,
      (v_work_order->>'treatments_cost')::decimal,
      (v_work_order->>'labor_cost')::decimal,
      COALESCE((v_work_order->>'lab_cost')::decimal, 0),
      (v_work_order->>'subtotal')::decimal,
      (v_work_order->>'tax_amount')::decimal,
      COALESCE((v_work_order->>'discount_amount')::decimal, 0),
      (v_work_order->>'total_amount')::decimal,
      COALESCE(v_work_order->>'currency', 'CLP'),
      v_work_order->>'status',
      v_work_order->>'payment_status',
      (v_work_order->>'deposit_amount')::decimal,
      (v_work_order->>'balance_amount')::decimal,
      v_order_id,
      (v_work_order->>'agreement_id')::uuid,
      v_work_order->>'internal_notes',
      p_user_id,
      p_user_id
    )
    RETURNING id, work_order_number INTO v_work_order_id, v_work_order_number;
  END IF;

  -- 6. Insert pos_transaction
  v_pos_tx := p_payload->'pos_transaction';
  IF v_pos_tx IS NOT NULL AND v_pos_session_id IS NOT NULL THEN
    INSERT INTO public.pos_transactions (
      order_id,
      pos_session_id,
      transaction_type,
      payment_method,
      amount,
      change_amount,
      notes
    ) VALUES (
      v_order_id,
      v_pos_session_id,
      'sale',
      v_pos_tx->>'payment_method',
      (v_pos_tx->>'amount')::decimal,
      (v_pos_tx->>'change_amount')::decimal,
      v_pos_tx->>'notes'
    );
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'work_order_id', v_work_order_id,
    'work_order_number', v_work_order_number
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.process_pos_sale(JSONB, UUID) IS 'Transactional POS sale: order, order_items, order_payments, stock reduction, lab_work_order, pos_transactions. All or nothing.';
