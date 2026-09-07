# Sanctions-Guard

Sanctions-Guard is a focused RegTech MVP designed to help compliance teams detect high-risk entities by comparing names against sanctions lists using fuzzy matching and AI-assisted explanations.

## Overview

This project demonstrates a practical sanctions screening workflow for a modern compliance product:

- Fuzzy name matching for near-miss entity detection
- AI-generated explanation for why a match is risky
- Immutable audit trail for screening queries
- Clean, professional dashboard for investigation workflows
- Dockerized local development environment for rapid iteration

## Live Demo

[Open Sanctions-Guard](https://sanctions-guard-client.vercel.app/)

## Core Technical Stack

- Frontend: Next.js + Tailwind CSS
- Backend: NestJS
- Database: PostgreSQL + Prisma
- Caching/Queue: Redis (Upstash-compatible)
- AI: OpenAI or Anthropic API
- Deployment: Railway (API) and Vercel (frontend)

## Core MVP Features

### 1. Fuzzy Matching

- Detects near matches such as "Abramovich" vs "Abramovitz"
- Uses similarity scoring and token-based comparisons to surface likely matches
- Prioritizes the most relevant results for analyst review

### 2. AI Risk Explanation

- Sends the match context to an LLM
- Produces a concise, compliance-focused explanation of why the result is risky
- Helps non-technical users understand the reason behind an alert

### 3. Immutable Audit Log

- Stores screening actions in a persistent audit trail
- Captures who ran the query and what risk context was associated with it
- Keeps a historical record suitable for internal review and compliance evidence

### 4. Modern UI/UX

- Clean, professional dashboard layout
- Clear typography hierarchy and readable spacing
- RegTech style visual system for trust, clarity, and operational efficiency

### 5. Local Infra and CI Baseline

- Docker Compose setup for database and cache
- Basic CI-ready project structure for automated validation

## Project Structure

```bash
.
├── client/                   # Next.js frontend
├── server/                   # NestJS backend
├── docker-compose.yml        # Local infrastructure configuration
├── README.md                 # Project overview and setup guide
└── .gitignore
```

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up -d db redis
```

### 3. Run backend

```bash
cd server
pnpm prisma migrate deploy
pnpm start:dev
```

### 4. Run frontend

```bash
cd client
pnpm dev
```

### 5. Default local URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- PostgreSQL: localhost:5435
- Redis: localhost:6379

## Environment Variables

Create `server/.env` for local development and include the required keys:

```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
OPENAI_API_KEY="..."
# or ANTHROPIC_API_KEY="..."
REDIS_URL="redis://localhost:6379"
FRONTEND_URL="http://localhost:3000"
```

For production, configure these values in Railway Variables instead of committing
`.env` files. Use the Supabase Session Pooler URL for `DATABASE_URL`, the Upstash
Redis URL for `REDIS_URL`, and the deployed Vercel URL for `FRONTEND_URL`.

The frontend requires this Vercel variable:

```bash
NEXT_PUBLIC_API_URL="https://<railway-domain>/api/v1"
```

## MVP Scope

This project intentionally focuses on the core workflow only:

- sanctions screening input
- fuzzy matching
- AI explanation
- audit trail
- polished dashboard experience

The following are intentionally out of scope for this MVP:

- billing and subscriptions
- SaaS/enterprise mode branching
- enterprise license logic
- plan-based feature gating

## Typical User Flow

1. User enters a name to screen
2. Backend compares it against sanctions data using fuzzy matching
3. System calculates risk level and relevant matches
4. AI model explains the risk in plain language
5. Query and results are stored in the audit log
6. Analyst reviews the result in the dashboard

## Validation

For MVP validation, confirm the following flows:

- login works correctly
- screening query returns a result
- fuzzy match score is reasonable
- AI explanation is clear and operationally useful
- audit log captures the request

## Notes

This is a portfolio-focused MVP, not a production-grade multi-tenant SaaS platform. It is designed to prove product understanding, systems thinking, and strong execution in compliance tooling.

## Example: Screen Request

```bash
curl -X POST http://localhost:3001/api/v1/screening/screen \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"queryName": "Viktor Bout", "entityType": "INDIVIDUAL"}'
```

Response:

```json
{
  "query": {
    "id": "clx123...",
    "queryName": "Viktor Bout",
    "riskLevel": "CRITICAL",
    "matchedCount": 2,
    "aiExplanation": "RISK SUMMARY: The queried name matches...",
    "matches": [
      {
        "matchedName": "Viktor Bout",
        "similarityScore": 1.0,
        "listSource": "OFAC",
        "matchedField": "name"
      }
    ]
  },
  "riskLevel": "CRITICAL",
  "fromCache": false
}
```

---

## Configuration

### Risk Level Thresholds

| Level    | Similarity Score | Action                               |
| -------- | ---------------- | ------------------------------------ |
| CRITICAL | ≥ 95%            | Immediate review — block transaction |
| HIGH     | ≥ 85%            | Human review required                |
| MEDIUM   | ≥ 70%            | Review recommended                   |
| LOW      | ≥ 50%            | Flag for awareness                   |
| CLEAR    | < 50%            | No action required                   |

### Environment Variables Reference

| Variable            | Required | Description                       |
| ------------------- | -------- | --------------------------------- |
| `DATABASE_URL`      | ✓        | PostgreSQL connection string      |
| `REDIS_URL`         | ✓        | Redis connection string           |
| `JWT_SECRET`        | ✓        | 64-char hex string                |
| `OPENAI_API_KEY`    | Optional | OpenAI API key (or use Anthropic) |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key (or use OpenAI) |
| `FRONTEND_URL`      | ✓        | Allowed frontend origin for CORS  |

---

## Legal

> This software is for informational purposes only and does not constitute legal advice.
> Screening results must be reviewed by qualified compliance professionals.
> The platform assists human review — it does not replace it.

Data sources: OFAC (U.S. Treasury) · EU External Action Service · UN Security Council · HM Treasury OFSI (OGL v3.0)
