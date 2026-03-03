-- Allow public (unauthenticated) read of subscription_tiers for landing page pricing
-- The landing /api/landing/tiers fetches this; visitors are not authenticated.
-- Service role bypasses RLS, but if fallback to anon key is used, this policy allows read.

CREATE POLICY "Public can view subscription tiers for landing"
ON public.subscription_tiers
FOR SELECT
USING (true);

COMMENT ON POLICY "Public can view subscription tiers for landing" ON public.subscription_tiers
IS 'Allows unauthenticated visitors to read tier pricing for the public landing page';
