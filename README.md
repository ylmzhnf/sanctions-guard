# Sanctions-Guard

Sanctions-Guard is a focused RegTech MVP designed to help compliance teams identify potentially high-risk entities by comparing names against sanctions data using fuzzy matching, OSINT-assisted investigation, and AI-assisted risk explanations.

## Overview

This project demonstrates a practical sanctions screening workflow for a modern compliance product:

- Fuzzy name matching for near-miss entity detection
- OSINT-assisted investigation using public web sources
- AI-assisted explanations of screening results
- Immutable audit trail for screening queries
- Organization-isolated data access
- Role-based access control
- Restricted public demo environment
- Clean, professional investigation dashboard
- Dockerized local development environment

## Live Demo

Try the real Sanctions-Guard screening workflow without creating an account or entering API credentials.

[Open Sanctions-Guard](https://sanctions-guard-client.vercel.app/)

The live demo uses the same core screening pipeline as the normal application and supports:

- Real sanctions screening
- Fuzzy name matching
- OSINT-assisted investigation
- AI-assisted risk analysis
- Persistent audit history

The demo runs in a dedicated, isolated organization with restricted permissions. Sensitive administrative operations and credential management are disabled for demo users.

## Core Technical Stack

- Frontend: Next.js + Tailwind CSS
- Backend: NestJS
- Database: PostgreSQL + Prisma
- Caching/Rate Limiting: Redis
- AI: OpenAI or Anthropic API
- OSINT: Serper API
- Authentication: JWT + Passport.js
- Authorization: RBAC + organization isolation
- Deployment: Railway (API) and Vercel (frontend)

## Core MVP Features

### 1. Fuzzy Matching

- Detects near matches such as `"Abramovich"` vs `"Abramovitz"`
- Uses similarity scoring and token-based comparisons to surface likely matches
- Prioritizes relevant results for analyst review

### 2. OSINT-Assisted Investigation

- Searches publicly available web sources for relevant entity information
- Provides additional context alongside sanctions matches
- Helps surface potentially relevant news and open-source intelligence
- Integrates OSINT findings into the investigation workflow
- Keeps OSINT API credentials server-side

### 3. AI Risk Explanation

- Sends relevant screening and investigation context to an LLM
- Produces a concise, compliance-focused explanation of the potential risk
- Helps non-technical users understand why a result may require review
- Supports OpenAI and Anthropic as configurable providers

### 4. Immutable Audit Log

- Stores screening actions in a persistent audit trail
- Captures the user and organization associated with the screening
- Keeps a historical record suitable for internal review and compliance evidence
- Protects audit records against unauthorized modification

### 5. Organization Isolation & Access Control

- Associates authenticated users with an organization
- Uses JWT-based authentication and role-based authorization
- Prevents users from accessing data belonging to other organizations
- Restricts sensitive administrative operations based on user permissions
- Applies additional backend restrictions to the public demo environment

### 6. Modern UI/UX

- Clean, professional dashboard layout
- Clear typography hierarchy and readable spacing
- RegTech-style visual system focused on trust, clarity, and operational efficiency
- Designed around a practical investigation workflow

### 7. Local Infrastructure & CI Baseline

- Docker Compose setup for PostgreSQL and Redis
- Environment-based configuration
- CI-ready project structure for automated validation

## Demo Environment

The live demo provides a restricted environment for evaluating the screening workflow without requiring an account or API credentials.

The demo supports:

- Real sanctions screening
- Fuzzy name matching
- OSINT-assisted investigation
- AI-assisted risk analysis
- Persistent audit history

Demo users cannot:

- Manage API credentials
- Invite or manage users
- Create, delete, or modify users
- Change organization settings
- Change user roles
- Access other organizations
- Upload batch screening data
- Perform destructive administrative operations

AI and OSINT credentials are handled server-side and are never exposed to the client.

Demo screening requests are rate-limited to help prevent abuse while keeping the normal production user flow unaffected.

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

### 5. Default Local URLs

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
# or
ANTHROPIC_API_KEY="..."

SERPER_API_KEY="..."

REDIS_URL="redis://localhost:6379"

FRONTEND_URL="http://localhost:3000"
```

For production, configure these values in Railway Variables instead of committing `.env` files.

Use the Supabase Session Pooler URL for `DATABASE_URL`, the Upstash Redis URL for `REDIS_URL`, and the deployed Vercel URL for `FRONTEND_URL`.

The frontend requires:

```bash
NEXT_PUBLIC_API_URL="https://<railway-domain>/api/v1"
```

API credentials must remain server-side and should never be committed to the repository or exposed through frontend environment variables.

## MVP Scope

This project intentionally focuses on the core compliance investigation workflow:

- Sanctions screening
- Fuzzy matching
- OSINT-assisted investigation
- AI risk explanation
- Audit trail
- Organization isolation
- Role-based access control
- Public demo environment
- Investigation dashboard

The following are intentionally out of scope for this MVP:

- Billing and subscriptions
- SaaS/enterprise licensing
- Plan-based feature gating
- Enterprise account management
- Full compliance case-management workflows

The project is designed as a portfolio-focused RegTech MVP rather than a complete enterprise compliance platform.

## Typical User Flow

1. User enters a person or organization name to screen
2. Backend compares it against sanctions data using fuzzy matching
3. System identifies relevant matches and calculates a risk level
4. OSINT search provides additional publicly available context
5. AI analyzes the available screening context and generates a risk explanation
6. Query and results are persisted
7. Audit history records the screening activity
8. Analyst reviews the findings in the dashboard

## Validation

The application has been validated through automated tests and real HTTP requests against a local database and Redis environment.

Validated areas include:

- Authentication and JWT validation
- Expired and forged token rejection
- Organization isolation
- Fuzzy matching
- Real OSINT integration
- AI-assisted risk analysis
- Audit logging
- Demo access restrictions
- Demo screening rate limiting
- Sensitive administrative operation blocking
- Normal user workflows
- SUPER_ADMIN workflows
- TypeScript compilation
- Frontend and backend builds
- Unit test suite

## Security Notes

The demo environment is intentionally restricted:

- Demo users are assigned to a dedicated organization
- Demo users cannot manage credentials or organization members
- Demo users cannot modify organization settings
- Demo users cannot access another organization's data
- Demo screening is rate-limited
- JWT signatures and expiration are validated server-side
- AI and OSINT credentials remain server-side
- Audit records are protected against unauthorized modification

The demo uses the same core screening workflow as the normal application while applying additional authorization restrictions specifically to the demo account.

## Example: Screen Request

```bash
curl -X POST http://localhost:3001/api/v1/screening/screen   -H "Authorization: Bearer <token>"   -H "Content-Type: application/json"   -d '{"queryName": "Viktor Bout", "entityType": "INDIVIDUAL"}'
```

Example response:

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

The example above is illustrative. Actual screening results depend on the queried entity and the available sanctions and OSINT data.

---

## Configuration

### Risk Level Thresholds

| Level | Similarity Score | Action |
| --- | ---: | --- |
| CRITICAL | ≥ 95% | Immediate review — block transaction |
| HIGH | ≥ 85% | Human review required |
| MEDIUM | ≥ 70% | Review recommended |
| LOW | ≥ 50% | Flag for awareness |
| CLEAR | < 50% | No action required |

### Environment Variables Reference

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `REDIS_URL` | ✓ | Redis connection string |
| `JWT_SECRET` | ✓ | JWT signing secret |
| `OPENAI_API_KEY` | Optional | OpenAI API key |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key |
| `SERPER_API_KEY` | Optional | Serper API key for OSINT search |
| `FRONTEND_URL` | ✓ | Allowed frontend origin for CORS |
| `NEXT_PUBLIC_API_URL` | ✓ | Backend API URL used by the frontend |

At least one supported AI provider should be configured when AI-assisted explanations are enabled.

## Legal

> This software is for informational purposes only and does not constitute legal advice.

> Screening results must be reviewed by qualified compliance professionals.

> The platform assists human review — it does not replace it.

Data sources: OFAC (U.S. Treasury) · EU External Action Service · UN Security Council · HM Treasury OFSI (OGL v3.0)
