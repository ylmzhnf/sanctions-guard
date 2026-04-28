# 🛡️ Sanctions-Guard

**Real-time sanctions screening platform** — runs as SaaS or Enterprise internal tool.

[![Stack](https://img.shields.io/badge/stack-NestJS%20%7C%20Next.js%2014%20%7C%20PostgreSQL%20%7C%20Redis-blue)]()
[![Mode](https://img.shields.io/badge/mode-SaaS%20%7C%20Enterprise-purple)]()
[![Docker](https://img.shields.io/badge/deploy-docker--compose%20up%20-d-green)]()

---

## Table of Contents

- [Overview](#overview)
- [Modes](#modes)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Admin Dashboard](#admin-dashboard)
- [Configuration](#configuration)
- [Development](#development)

---

## Overview

Sanctions-Guard screens entities (individuals, companies, vessels) against **OFAC, EU, UN, and UK HMT** sanctions lists using fuzzy name matching and AI-powered risk explanations.

### Key Features

| Feature | SaaS | Enterprise |
|---------|------|-----------|
| Levenshtein + Token matching | ✓ | ✓ |
| PostgreSQL trigram similarity | ✓ | ✓ |
| AI risk explanations (Claude) | ✓ | ✓ |
| HMAC-signed audit log | ✓ | ✓ |
| Admin dashboard | ✓ | ✓ |
| License management | ✓ | ✓ |
| Stripe billing | ✓ | — |
| Plan limits | ✓ | — |
| Query/user limits | ✓ | — (unlimited) |
| All features unlocked | — | ✓ |
| White-label | — | ✓ |

---

## Modes

### SaaS Mode (`APP_MODE=saas`)

- Stripe subscription billing active
- Plan limits enforced (FREE: 10 queries, STARTER: 500, BUSINESS: 10,000)
- Feature gating by plan
- Admin can still manually override limits per org

### Enterprise Mode (`APP_MODE=enterprise`)

- No Stripe — all billing endpoints return 404
- All features unlocked for all users
- No query or user limits
- Admin dashboard for license/credit management

**Switching modes:** Change `APP_MODE` in `.env` and restart containers. The application logs the active mode on startup.

---

## Quick Start

### 1. Configure

```bash
cp installer/.env.template .env
nano .env    # Fill in required values
```

**Minimum required values:**
```env
APP_MODE=saas            # or enterprise
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePass123!
POSTGRES_PASSWORD=strongpassword
REDIS_PASSWORD=strongpassword
JWT_SECRET=64-char-hex-string    # openssl rand -hex 32
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Start

```bash
docker-compose -f installer/docker-compose.yml up -d
```

### 3. Verify

```bash
# Health check
curl http://localhost:3001/api/v1/health
# Expected: {"status":"ok","mode":"saas","db":"ok"}

# Open Swagger UI
open http://localhost:3001/api/docs

# Open frontend
open http://localhost:3000
```

### 4. Initial Data Sync

```bash
# Login as admin and get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Trigger OFAC sanctions list sync
curl -X POST http://localhost:3001/api/v1/admin/sanctions-sync/trigger \
  -H "Authorization: Bearer $TOKEN"
```

---

## Architecture

### Matching Algorithm

The platform uses a **hybrid multi-stage matching system** for maximum accuracy:

**Stage 1: PostgreSQL Trigram Pre-filter**
- Uses `pg_trgm` extension for fast similarity search
- Threshold: `similarity(name, query) >= 0.15`
- Returns top 50 candidates per query

**Stage 2: Levenshtein Distance**
- Calculates edit distance between query and candidate
- Normalizes to 0-100 score
- Handles typos and minor variations

**Stage 3: Token-Based Matching**
- Splits names into tokens (words)
- Checks if all query tokens exist in target name
- Handles cases like "Vladimir Putin" → "Vladimir Vladimirovich Putin"
- Boosts score to 85-99 when all tokens match

**Stage 4: Risk Classification**
```
Score ≥ 95% → CRITICAL (exact/near-exact match)
Score ≥ 85% → HIGH (strong match, review required)
Score ≥ 70% → MEDIUM (possible match)
Score ≥ 50% → LOW (weak match, flag for awareness)
Score < 50% → CLEAR (no significant match)
```

**Example:**
```
Query: "Vladimir Putin"
Database: "VLADIMIR VLADIMIROVICH PUTIN"

Stage 1: PostgreSQL trigram → 0.65 similarity → passes
Stage 2: Levenshtein → 50% (length difference)
Stage 3: Token match → ["vladimir", "putin"] all found → 94%
Final Score: 94% → HIGH risk
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (Port 80/443)                      │
│              SSL termination + reverse proxy                │
└───────────────┬─────────────────────┬───────────────────────┘
                │                     │
    ┌───────────▼───────┐   ┌─────────▼──────────┐
    │  Next.js Frontend │   │   NestJS Backend    │
    │    (Port 3000)    │   │    (Port 3001)      │
    │                   │   │                     │
    │  Feature flags ←──┼───┼── APP_MODE env      │
    │  ModeGate comps   │   │  AppConfigService   │
    │  Admin dashboard  │   │  ModeGuard (bypass) │
    └───────────────────┘   │  QueryLimitGuard    │
                            │  PlanFeatureGuard   │
                            └────────┬───────────┘
                                     │
               ┌─────────────────────┼────────────────────┐
               │                     │                    │
    ┌──────────▼──────┐  ┌───────────▼────┐  ┌──────────▼──────┐
    │  PostgreSQL     │  │  Redis Cache   │  │ Anthropic API  │
    │  (Port 5432)    │  │  (Port 6379)   │  │  (External)    │
    │  Internal net   │  │  Internal net  │  │                │
    └─────────────────┘  └────────────────┘  └────────────────┘
```

### Mode Guard Flow

```
Request → JwtAuthGuard → ModeGuard → QueryLimitGuard → Controller
                             │               │
                    Enterprise: pass   Enterprise: bypass
                    SaaS: check mode   SaaS: check DB limit
```

### Screening Pipeline (13 Steps)

```
1. JWT validate    → 8.  Persist query + matches
2. License check   → 9.  Write HMAC audit log
3. Cache check     → 10. Cache result (1hr TTL)
4. Load entities   → 11. Increment usage counter
5. PostgreSQL trgm → 12. Return JSON response
6. Levenshtein+tok → 13. Frontend renders result
7. Risk scoring    →
```

---

## API Reference

Interactive Swagger UI: `http://localhost:3001/api/docs`

### Authentication

All protected endpoints require: `Authorization: Bearer <token>`

Get token:
```bash
curl -X POST /api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

### Core Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | Public | Register user + org |
| `POST` | `/api/v1/auth/login` | Public | Get JWT token |
| `GET`  | `/api/v1/auth/me` | JWT | Current user info |
| `POST` | `/api/v1/screening/screen` | JWT | Screen entity |
| `GET`  | `/api/v1/screening/history` | JWT | Query history |
| `GET`  | `/api/v1/audit/logs` | JWT | Audit log |
| `GET`  | `/api/v1/audit/verify/:id` | JWT | Verify log integrity |
| `GET`  | `/api/v1/health` | Public | System health |

### Admin Endpoints (ADMIN role)

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/v1/admin/system` | System info + mode |
| `GET`  | `/api/v1/admin/stats` | Query statistics |
| `GET`  | `/api/v1/admin/organizations` | List all orgs |
| `POST` | `/api/v1/admin/organizations` | Create org |
| `POST` | `/api/v1/admin/licenses/assign` | Assign license |
| `POST` | `/api/v1/admin/licenses/revoke/:orgId` | Revoke license |
| `PATCH`| `/api/v1/admin/organizations/:id/limits` | Update limits |
| `GET`  | `/api/v1/admin/users` | List users |
| `PATCH`| `/api/v1/admin/users/:id` | Update user |
| `GET`  | `/api/v1/admin/settings` | System settings |
| `PATCH`| `/api/v1/admin/settings` | Update settings |
| `POST` | `/api/v1/admin/sanctions-sync/trigger` | Trigger sync |

### SaaS-only Endpoints (404 in Enterprise)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/billing/checkout` | Stripe checkout |
| `POST` | `/api/v1/billing/portal` | Billing portal |
| `POST` | `/api/v1/billing/webhook` | Stripe webhook |

### Example: Screen Request

```bash
curl -X POST http://localhost:3001/api/v1/screening/screen \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Viktor Bout"}'
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

## Admin Dashboard

Access at `/dashboard/admin` (requires ADMIN or SUPER_ADMIN role).

### Assigning Licenses

The admin can assign any license type to any organization without developer involvement:

```
License Types:
  UNLIMITED   → No limits — all features — ideal for Enterprise customers
  CREDIT      → X queries total — depletes on use
  SUBSCRIPTION → Plan-based (synced with Stripe in SaaS mode)
  CUSTOM      → Admin-defined custom behavior
```

**Via API:**
```bash
curl -X POST http://localhost:3001/api/v1/admin/licenses/assign \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "clx123...",
    "type": "UNLIMITED",
    "credits": null,
    "expiresAt": "2026-12-31",
    "notes": "Annual enterprise deal"
  }'
```

**Via UI:** Go to Admin → click "Assign License" next to any organization.

---

## Configuration

### Risk Level Thresholds

| Level | Similarity Score | Action |
|-------|-----------------|--------|
| CRITICAL | ≥ 97% | Immediate review — block transaction |
| HIGH | ≥ 85% | Human review required |
| MEDIUM | ≥ 70% | Review recommended |
| LOW | ≥ 55% | Flag for awareness |
| CLEAR | < 55% | No action required |

### System Settings (Admin-configurable)

| Key | Default | Description |
|-----|---------|-------------|
| `app_name` | Sanctions-Guard | Displayed in UI |
| `default_query_limit` | 10 (SaaS) / -1 (Enterprise) | New org default |
| `ai_enabled` | true | Enable AI explanations |
| `osint_enabled` | false (SaaS) / true (Enterprise) | Enable OSINT enrichment |

---


### Environment Variables Reference

| Variable | Required | Description |
|----------|---------|-------------|
| `APP_MODE` | ✓ | `saas` or `enterprise` |
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `REDIS_URL` | ✓ | Redis connection string |
| `JWT_SECRET` | ✓ | 64-char hex string |
| `ANTHROPIC_API_KEY` | ✓ | Claude API key |
| `ADMIN_EMAIL` | ✓ | First admin user email |
| `ADMIN_PASSWORD` | ✓ | First admin user password |
| `STRIPE_SECRET_KEY` | SaaS only | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | SaaS only | Stripe webhook signing secret |

---

## Legal

> This software is for informational purposes only and does not constitute legal advice.
> Screening results must be reviewed by qualified compliance professionals.
> The platform assists human review — it does not replace it.

Data sources: OFAC (U.S. Treasury) · EU External Action Service · UN Security Council · HM Treasury OFSI (OGL v3.0)
