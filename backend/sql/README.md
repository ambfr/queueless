# Database migrations

Plain SQL files for the QueueLess schema, in the order they must run. They are the final state of the database, so they work on a **fresh** Supabase project (don't re-run them on one that's already set up).

## How to run

1. Create a [Supabase](https://supabase.com) project
2. Authentication → Providers → Email → turn off **Confirm email** (development only)
3. Open the **SQL Editor** and run each file below, top to bottom, one at a time

| File | What it sets up |
| ---- | --------------- |
| `001_profiles.sql` | Profiles, signup trigger, role-change protection, API grants |
| `002_businesses_staff.sql` | Businesses, staff, create/add/remove-staff functions |
| `003_branches_services.sql` | Branches and services with owner-only RLS |
| `004_queue_core.sql` | Tokens, join/call/cancel/status functions, queue summary |
| `005_learned_wait_times.sql` | Median-based learned service time, blended with the owner's estimate |
| `006_realtime.sql` | `queue_state` table, sync trigger, Realtime publication |
| `007_account_management.sql` | Delete business and delete account with role cleanup |

## Design notes

- **Tables are read-only through the API.** Every write goes through a `security definer` function that checks `auth.uid()` itself.
- **Roles can't be self-assigned.** A trigger blocks role changes unless a trusted function sets `app.allow_role_change`.
- **Token numbers are race-safe.** A per-service advisory lock serializes numbering, and a partial unique index allows one active token per customer per service.
- **Realtime without leaks.** Customers can't read other people's tokens, so a trigger maintains a public `queue_state` table that the browser subscribes to.
- Token numbers reset daily (Asia/Kolkata).

## Sanity check after running everything

```sql
-- should list 7 tables: branches, business_staff, businesses, profiles, queue_state, services, tokens
select tablename from pg_tables where schemaname = 'public' order by 1;

-- should list tokens and queue_state
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
```

Then sign up through the app, and `select * from public.profiles;` should show your row with `role = customer`.