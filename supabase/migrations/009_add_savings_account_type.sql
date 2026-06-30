-- Add 'savings' to the account_type enum.
--
-- ADD VALUE is idempotent (IF NOT EXISTS) and must NOT be wrapped in a
-- transaction that also inserts/updates rows using the new value, because
-- Postgres cannot see the new label inside the same transaction that added it.
-- Apply this migration on its own, then apply any data migrations separately.

alter type public.account_type add value if not exists 'savings';

-- Signal PostgREST to reload its schema cache so the new enum label is visible
-- in the API immediately without restarting the container.
notify pgrst, 'reload schema';
