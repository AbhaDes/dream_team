# Dream-Team

A web app that matches students with teammates for hackathons and group projects —
based on skills, availability, and role preferences.

## Tech Stack

- **Backend:** Node.js / Express 5 (JavaScript, CommonJS)
- **Frontend:** Next.js (App Router) / React / TypeScript, deployed on Vercel
- **Database:** PostgreSQL 16
- **Auth:** Session-based — `express-session` with a Postgres session store (`connect-pg-simple`), bcrypt password hashing
- **Infrastructure:** Docker / docker-compose (API + database)

## Architecture

Two services run via docker-compose; the frontend runs separately (Vercel in production, `next dev` locally):

- **web** — the Express API on port 3001. Layered as routes → middleware → controllers, with the DB pool in `config/database.js` and the matching logic in `utils/matchingAlgorithm.js`. Sessions are stored in Postgres and sent as httpOnly cookies (CORS is configured with credentials for the frontend origin).
- **db** — PostgreSQL 16 (alpine) with a named Docker volume and a healthcheck that gates API startup.
- **frontend/** — a decoupled Next.js app that calls the API with `credentials: 'include'`. Route groups: `(auth)` for login/signup, `(app)` for dashboard, profile, matches, and connections. Points at the backend via `NEXT_PUBLIC_API_URL`.

### Matching algorithm

Rule-based compatibility scoring (0–100) in `utils/matchingAlgorithm.js`:

- **Complementary roles** — up to 45 points (e.g. Frontend + Backend is a strong pair)
- **Experience level** — up to 30 points (same level scores highest)
- **Availability** — 25 points for matching commitment levels ("Flexible" pairs with anyone)

Candidate pairs are normalized by user-ID order so each pair is evaluated once per event.

### Database schema

`db/schema.sql` defines `users`, `events`, `event_participants` (profile + role/availability/experience enums), `matches` (with a `UNIQUE(user1_id, user2_id, event_id)` constraint and a status enum), and `session` (session store).

## API Endpoints

All routes are prefixed with `/api`. Routes marked 🔒 require a logged-in session.

| Method | Route | Description |
|---|---|---|
| POST | `/auth/register` | Create an account |
| POST | `/auth/login` | Log in, start a session |
| GET | `/auth/me` | 🔒 Current user |
| POST | `/events/:eventId/join` | 🔒 Join an event with a profile |
| GET | `/events/:eventId/participants/me` | 🔒 Own event profile |
| PUT | `/events/:eventId/participants/me` | 🔒 Update event profile |
| GET | `/events/:eventId/participants/:participantId` | 🔒 View a participant |
| GET | `/events/:eventId/matches` | 🔒 Ranked match suggestions |
| POST | `/events/:eventId/like` | 🔒 Like a suggested teammate |
| GET | `/events/:eventId/matches/pending` | 🔒 Likes awaiting a like-back |
| GET | `/events/:eventId/matches/mutual` | 🔒 Mutual matches (connections) |

## Running Locally

Make sure you have Docker installed.

```bash
git clone https://github.com/AbhaDes/dream-team
cd dream-team
docker-compose up -d          # API on http://localhost:3001, Postgres on 5432
```

The API reads a `.env` file (loaded into the container by compose): `SESSION_SECRET` is required; `DATABASE_URL`, `PORT`, `FRONTEND_URL`, and `NODE_ENV` are optional overrides. Inside compose, the database host is the `db` service; the localhost `DATABASE_URL` in `.env` is for running `node server.js` directly.

To run the frontend:

```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`) in `frontend/.env.local` to point it at the API.

## Status

Actively in development — current focus is engineering hardening: automated tests (Jest + supertest), input validation, TypeScript on the backend, and DB migrations.
