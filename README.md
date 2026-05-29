# Dream-Team

A web app that matches students with teammates for hackathons and group projects — 
based on skills, availability, and role preferences.

## Tech Stack

- **Backend:** Node.js / Express
- **ML Microservice:** Python / Flask
- **Database:** PostgreSQL
- **Infrastructure:** Docker / docker-compose

## Running Locally

Make sure you have Docker installed.

```bash
git clone https://github.com/AbhaDes/dream-team
cd dream-team
docker-compose up -d
```

App runs at `http://localhost:3001`

## Architecture

Three services running via docker-compose:

- **Node.js / Express** — handles API, auth, and database queries
- **Flask** — ML microservice exposing a `/match` endpoint
- **PostgreSQL** — persistent database with a Docker volume

## Status

Actively in development. Currently rebuilding the matching algorithm 
using ML-based vectorization (sentence transformers + cosine similarity).

