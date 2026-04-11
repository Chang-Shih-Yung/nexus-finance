# Archived AI migrations (squashed into baseline)

These 21 files were the prompt-engineering iteration history of `nf_ai_ask`
and `nf_ai_ask_deep` from 2026-04-10 to 2026-04-11. Each one is a full
`CREATE OR REPLACE FUNCTION` body that was superseded by the next iteration
within hours.

On **2026-04-11** they were consolidated into a single baseline:

```
supabase/migrations/20260411002000_ai_consolidated_baseline.sql
```

The baseline is idempotent (`CREATE OR REPLACE`, `ADD COLUMN IF NOT EXISTS`,
`DROP CONSTRAINT IF EXISTS … ADD CONSTRAINT`) so it re-installs the exact
final state regardless of what came before.

## Why archive instead of delete?

Git blame on `nf_ai_ask` would otherwise point to the consolidated baseline
with no clue about *why* a particular line is the way it is. The header
comments inside each archived file document the design decision that drove
that iteration (timeout fixes, prompt simplification, fallback strategy,
model swap, etc.). Search this folder if you ever need to understand
"why is the data_blob capped at 3000 chars" or "why does Call 2 use 26B".

## How to find a specific decision

```bash
grep -l "data_blob" supabase/migrations/_archive/*.sql
grep -l "26B A4B"   supabase/migrations/_archive/*.sql
grep -l "prefill"   supabase/migrations/_archive/*.sql
```

## Will Supabase CLI try to apply these?

**No.** The `_archive/` directory starts with an underscore, which the
Supabase CLI's migration runner ignores. It only picks up files that match
`<14-digit-timestamp>_<name>.sql` directly under `supabase/migrations/`.
The archived files don't run on `supabase db reset` or `supabase db push`.

## Remote migration history repair

If your remote DB has the 21 prior migrations recorded as applied (which
it does — they were pushed during the iteration session), `supabase db push`
after this consolidation will detect a mismatch: 21 entries in
`supabase_migrations.schema_migrations` that no longer exist locally.

**Two ways to handle this:**

### Option 1 — Mark archived versions as reverted (recommended)

Tells Supabase "those versions are no longer authoritative; the new
consolidated baseline is the source of truth".

```bash
# Run once each (or paste them all in a single session — they're independent)
supabase migration repair 20260410003200 --status reverted
supabase migration repair 20260410003300 --status reverted
supabase migration repair 20260410003400 --status reverted
supabase migration repair 20260410003500 --status reverted
supabase migration repair 20260411000100 --status reverted
supabase migration repair 20260411000200 --status reverted
supabase migration repair 20260411000300 --status reverted
supabase migration repair 20260411000400 --status reverted
supabase migration repair 20260411000500 --status reverted
supabase migration repair 20260411000600 --status reverted
supabase migration repair 20260411000700 --status reverted
supabase migration repair 20260411000800 --status reverted
supabase migration repair 20260411000900 --status reverted
supabase migration repair 20260411001000 --status reverted
supabase migration repair 20260411001100 --status reverted
supabase migration repair 20260411001200 --status reverted
supabase migration repair 20260411001300 --status reverted
supabase migration repair 20260411001400 --status reverted
supabase migration repair 20260411001500 --status reverted
supabase migration repair 20260411001600 --status reverted
supabase migration repair 20260411001700 --status reverted

# Now push the consolidated baseline
supabase db push
```

Because the baseline is idempotent and the remote DB already has the
final state of the columns + functions installed, `supabase db push` will
apply `20260411002000_ai_consolidated_baseline.sql` as a no-op (every
`CREATE OR REPLACE` re-installs the same body, every `ADD COLUMN IF NOT
EXISTS` skips).

### Option 2 — Tell the CLI to accept history as-is

Mark the consolidated baseline as already applied without actually running
it. Faster but skips the safety net of re-applying the canonical state.

```bash
supabase migration repair 20260411002000 --status applied
```

Use this only if you're confident the remote schema already matches the
baseline file.

## File index

| Date       | Version           | Function     | Why                                      |
|------------|-------------------|--------------|------------------------------------------|
| 04-10 0032 | v12 gemma         | nf_ai_ask    | Initial Gemma function-calling           |
| 04-10 0033 | v12 http_timeout  | nf_ai_ask    | Add curl timeout                          |
| 04-10 0034 | v12 clean_narration | nf_ai_ask  | Strip markdown from narration             |
| 04-10 0035 | v12 chart_hint    | nf_ai_ask    | Add chart_hint column + sync support      |
| 04-11 0001 | v12 render_hint   | nf_ai_ask    | Add render_hint column + sync support     |
| 04-11 0002 | v13 gemma4_narration | nf_ai_ask | Migrate Call 2 to Gemma 4                 |
| 04-11 0003 | deep              | nf_ai_ask_deep | Initial four-section deep analysis      |
| 04-11 0004 | v13 rank_yfield_fix | nf_ai_ask  | Fix y_field selection on rank queries     |
| 04-11 0005 | deep v1.1 zhtw_prefill | deep    | zh-TW prefill seed                        |
| 04-11 0006 | v13.2 degraded_flag | nf_ai_ask  | Surface degraded boolean to frontend      |
| 04-11 0007 | deep v1.2 fewshot | deep         | Add few-shot example                      |
| 04-11 0008 | v13.3 skip_call2_text | nf_ai_ask | Skip Call 2 for single-row results       |
| 04-11 0009 | deep v1.3 statement_timeout | deep | Set statement_timeout via SET LOCAL    |
| 04-11 0010 | statement_timeout function_attr | deep | Switch to function-attribute SET   |
| 04-11 0011 | deep v1.4 switch_to_26b | deep    | Migrate Deep to 26B A4B                   |
| 04-11 0012 | deep v1.5 abstract_skeleton | deep | Strip few-shot, simplify prompt        |
| 04-11 0013 | deep v1.6 budget_cut | deep       | Reduce maxOutputTokens / data_blob        |
| 04-11 0014 | deep v1.7 structured_json | deep  | Try responseSchema (failed)               |
| 04-11 0015 | deep v1.8 minimal | deep         | **Final** — manual JSON extraction        |
| 04-11 0016 | v13.4 call2_fallback | nf_ai_ask | Primary 31B + fallback 26B (failed)     |
| 04-11 0017 | v13.5 call2_26b_minimal | nf_ai_ask | **Final** — single-track 26B A4B       |
