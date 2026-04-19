-- Remove legacy `journal_accounts` (replaced by `workspace_snapshots` full backups).
-- Safe if the table was never created.

drop table if exists public.journal_accounts cascade;

drop function if exists public.set_journal_accounts_updated_at();
