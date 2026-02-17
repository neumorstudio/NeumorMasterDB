-- Add business phone support end-to-end
-- Assumptions:
-- 1) Table public.businesses exists and identifies business rows by id/business_id.
-- 2) View public.v_service_search exists and is the source for UI queries.
-- 3) RPC ingest_business_payload reads p_payload JSON.

begin;

alter table if exists public.businesses
  add column if not exists business_phone text;

create index if not exists businesses_business_phone_idx
  on public.businesses (business_phone);

-- If your ingest RPC already accepts unknown fields, no change is required.
-- Otherwise update the RPC body to map p_payload->>'business_phone' into businesses.business_phone.

-- IMPORTANT: v_service_search must expose business_phone for filters/UI.
-- You need to apply this in your existing view definition by adding:
--   b.business_phone
-- and keeping business_id join intact.
-- Example pattern (adapt to your current SQL):
-- create or replace view public.v_service_search as
-- select
--   ...,
--   b.business_phone,
--   ...
-- from public.services s
-- join public.businesses b on b.id = s.business_id
-- ...;

commit;
