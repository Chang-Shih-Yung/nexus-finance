
## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review

## Backend Workflow (RPC-First)

This repository is now RPC-first and does not use Supabase Edge Functions in production flow.

Required workflow for backend/data changes:
- Write SQL changes as migrations under [supabase/migrations](supabase/migrations)
- Prefer `SECURITY DEFINER` Postgres functions for aggregated/statistical endpoints
- Expose data to frontend through `supabase.rpc(...)` in [client/src/lib/api.ts](client/src/lib/api.ts)
- Keep function naming under `nf_*` to match existing conventions

Do not do these in this repo:
- Do not add new files under [supabase/functions](supabase/functions)
- Do not run `supabase functions deploy`
- Do not re-introduce edge function invoke paths in frontend

Migration guardrails:
- All schema and RPC changes must be versioned migration files
- Apply with `supabase db push`
- If remote baseline exists but migration history mismatches, repair history first:
	`supabase migration repair <version> --status applied`
