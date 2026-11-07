# 🎟️ QueueLess

**Skip the line. Not the service.**

A virtual queue management platform. Customers scan a QR code, pick a service and get a live digital token. Businesses run their queues from a simple dashboard, and wait-time estimates get smarter with every completed visit.

> **Live demo:** _coming soon_

---

## Screenshots

### Customer

| Sign in | Sign up | Home |
| :---: | :---: | :---: |
| <img src="screenshots/login.png" width="260"> | <img src="screenshots/signup.png" width="260"> | <img src="screenshots/cust_home.png" width="260"> |

| Waiting | Your turn | Being served | Done |
| :---: | :---: | :---: | :---: |
| <img src="screenshots/cust_token.png" width="200"> | <img src="screenshots/cust_called.png" width="200"> | <img src="screenshots/cust_serving.png" width="200"> | <img src="screenshots/cust_done.png" width="200"> |

The ticket page updates live over Supabase Realtime, with no refreshing.

### Business owner

| Dashboard | Learned wait times | Business QR poster |
| :---: | :---: | :---: |
| <img src="screenshots/biz_home.png" width="260"> | <img src="screenshots/biz_wait.png" width="260"> | <img src="screenshots/biz_qr.png" width="260"> |

| Edit business | Edit profile |
| :---: | :---: |
| <img src="screenshots/biz_update.png" width="260"> | <img src="screenshots/acc_update.png" width="260"> |

### Staff

| Staff home | Manage Staff | Customer called |
| :---: | :---: | :---: |
| <img src="screenshots/staff_home.png" width="260"> | <img src="screenshots/staff_manage.png" width="260"> | <img src="screenshots/que_called.png" width="260"> |

---

## Features

**Customers**
- Browse and search businesses, or scan a business QR code
- Pick a branch and service, then get a numbered token
- Live ticket page with people ahead, estimated wait and a progress tracker
- The browser tab title flips to "Your turn!" when you're called
- Cancel a token, edit your profile, or delete your account

**Business owners**
- Register a business with multiple branches and services
- Open or close individual services
- Add and remove staff by email
- One printable **QR poster per business**: customers scan it, then choose the service
- Edit or delete the business (with name-to-confirm protection)

**Staff**
- Queue control panel: call next, start serving, mark done, or mark no-show
- See live waiting and now-serving counts

**Smart wait times**
- Starts from the owner's estimate and learns from real visits (see below)

---

## How it works

### Architecture

```mermaid
flowchart LR
  A["React + Vite + Tailwind"] -->|"REST + JWT"| B["Flask API"]
  B -->|"user-scoped client (RLS applies)"| C[("Supabase Postgres")]
  A -->|"Realtime subscriptions"| C
  B --> D["Supabase Auth"]
  A -->|"session"| D
```

Flask validates every request by checking the bearer token with Supabase Auth, then talks to Postgres **as that user**, so Row Level Security is enforced on every query.

### Token lifecycle

```mermaid
stateDiagram-v2
  [*] --> waiting: join queue
  waiting --> called: call next
  waiting --> cancelled: customer cancels
  called --> serving: start
  called --> done
  called --> skipped: no-show
  called --> cancelled: customer cancels
  serving --> done
```

### Learned wait-time estimates

Each service starts with the owner's guess. Every time a visit is marked **Done**, the app measures the real service time and keeps the **median of the last 20 visits** (so one unusually long case can't skew it; accidental sub-10-second clicks are ignored).

The estimate blends the two, trusting real data more as samples grow:

```
estimate = w × learned_median + (1 − w) × owner_estimate
w = min(samples / 10, 1)
```

At 0 visits it uses the owner's number, at 5 visits it's a 50/50 mix, and from 10 visits on it's fully learned. Estimated wait = people ahead × estimate. The UI shows its confidence ("based on the last 15 visits").

### Realtime without leaking data

Customers can't read other people's tokens (RLS). A trigger keeps a public `queue_state` table (waiting count and now-serving number) up to date, and the browser subscribes to it through Supabase Realtime. Customers see the queue move without ever seeing anyone else's data.

---

## Security and correctness

- **Row Level Security everywhere.** Tables are read-only through the API, and all queue writes go through `security definer` Postgres functions that check who is calling.
- **Roles can't be self-assigned.** A trigger blocks users from changing their own role. Roles change only through trusted functions (create business, add or remove staff).
- **No duplicate tokens.** A per-service advisory lock makes token numbering race-safe, and a partial unique index allows one active token per customer per service.
- **Owners and staff can't join their own queues.**
- **Safe deletes.** You can't delete an account while owning a business, and deleting a business needs its name typed to confirm.
- Token numbers reset daily (Asia/Kolkata).

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Python, Flask |
| Database | Supabase PostgreSQL (RLS, triggers, PL/pgSQL functions) |
| Auth | Supabase Auth (JWT) |
| Realtime | Supabase Realtime |
| QR codes | qrcode.react |

---

## Project structure

```
queueless/
├── backend/
│   ├── app/
│   │   ├── routes/        auth, businesses, catalog, tokens
│   │   ├── auth.py        token verification decorator
│   │   ├── estimates.py   learned wait-time blending
│   │   └── supabase_client.py
│   ├── sql/               numbered migrations (001-007)
│   ├── scripts/seed.py    demo data
│   └── run.py
├── frontend/
│   └── src/
│       ├── pages/         Home, BusinessPage, BusinessJoinPage, TicketPage, ManagePage, AccountPage
│       ├── components/    Layout, QRCard, StaffPanel, BusinessSettings, StatusPill
│       └── lib/           api client, supabase client, useLive hook
└── screenshots/
```

---

## Running locally

### 1. Database

Create a free [Supabase](https://supabase.com) project, turn off **Confirm email** under Authentication → Providers → Email (development only), then run `backend/sql/001` to `007` in order in the SQL Editor. See [`backend/sql/README.md`](backend/sql/README.md).

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
```

```bash
python run.py                  # http://localhost:5000/api/health
```

### 3. Frontend

Create `frontend/.env`:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:5000/api
```

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

### 4. Demo data (optional)

With the backend running:

```bash
cd backend
python scripts/seed.py
```

Creates 5 businesses (salon, dental clinic, cafe, bank, repair shop) with branches, services, staff, and 8 customers with live queues. **All seeded accounts use the password `test1234`** (local development only):

| Role | Email |
| --- | --- |
| Owner | `riya.salon@example.com` |
| Staff | `neha.staff@example.com` |
| Customer | `tara@example.com` |

---

## API overview

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `/login`, `/logout` · `GET`, `PATCH`, `DELETE /api/auth/me` |
| Businesses | `GET`, `POST /api/businesses` · `GET /api/businesses/mine` · `GET`, `PATCH`, `DELETE /api/businesses/:id` |
| Staff | `GET`, `POST /api/businesses/:id/staff` · `DELETE /api/businesses/:id/staff/:userId` |
| Branches | `GET`, `POST /api/businesses/:id/branches` · `PATCH`, `DELETE /api/branches/:id` |
| Services | `GET`, `POST /api/branches/:id/services` · `GET`, `PATCH`, `DELETE /api/services/:id` |
| Queue | `POST /api/services/:id/join` · `GET /api/services/:id/queue` · `GET /api/services/:id/tokens` · `POST /api/services/:id/call-next` |
| Tokens | `GET /api/tokens/mine` · `GET /api/tokens/:id` · `POST /api/tokens/:id/status` · `POST /api/tokens/:id/cancel` |

---

## Roadmap

- [ ] Deploy (Render + Vercel)
- [ ] SMS / push notifications when you're almost up
- [ ] Wait-time estimates by time of day
- [ ] Owner analytics (peak hours, average wait, no-show rate)
- [ ] Automated tests and CI

---

Built by [Ambali](https://github.com/ambfr)
