# Database migrations

Run these in order in the Supabase SQL Editor on a fresh project:

| File | What it sets up |
| ---- | --------------- |
| 001_profiles.sql | Profiles, signup trigger, role protection, API grants |
| 002_businesses_staff.sql | Businesses, staff, create/add/remove functions |
| 003_branches_services.sql | Branches and services with owner-only RLS |
| 004_queue_core.sql | Tokens, join/call/cancel/status functions, queue summary |
| 005_learned_wait_times.sql | Median-based learned service time, blended with the owner's estimate |
| 006_realtime.sql | `queue_state` table, sync trigger, Realtime publication |
| 007_account_management.sql | Delete business and delete account with role cleanup |

All queue writes go through `security definer` functions; tables only expose `select` through RLS.