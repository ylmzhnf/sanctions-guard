# Sanctions Guard

**Sanctions Guard** is a robust backend service designed for screening names against sanction lists using advanced fuzzy matching techniques. It ensures compliance and transparency through immutable audit logs.

## 🚀 Features

- **Fuzzy Name Matching**: Utilizes PostgreSQL's `pg_trgm` extension to detect name similarities, handling typos and variations effectively.
- **Immutable Audit Logs**: Automatically records every screening query. Logs are immutable to ensure data integrity and compliance.
- **Sanction List Management**: Efficiently store and query sanctioned individuals and entities.
- **Scalable Architecture**: Built with NestJS and Prisma for high performance and maintainability.

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: PostgreSQL (with `pg_trgm` extension)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Runtime**: Node.js
- **Containerization**: Docker & Docker Compose

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or later)
- Docker & Docker Compose
- PostgreSQL (if running locally without Docker)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/sanctions-guard.git
   cd sanctions-guard/server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file in the `server` directory and configure your database connection string and other settings.

### Running the Application

1. **Start the Database (Docker):**
   ```bash
   npm run docker:up
   ```

2. **Run Migrations:**
   ```bash
   npx prisma migrate dev
   ```

3. **Start the Server:**
   ```bash
   npm run start:dev
   ```

## 🧪 Testing

Run the test suite to ensure everything is working correctly:

```bash
# Unit tests
npm run test:init

```
