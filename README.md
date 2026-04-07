# SanctionsGuard

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1.6-black" alt="Next.js"/>
  <img src="https://img.shields.io/badge/NestJS-11.0.1-red" alt="NestJS"/>
  <img src="https://img.shields.io/badge/PostgreSQL-15-blue" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Prisma-7.6.0-lightblue" alt="Prisma"/>
  <img src="https://img.shields.io/badge/TypeScript-5.9.3-blue" alt="TypeScript"/>
</div>

<br/>

**SanctionsGuard** is a comprehensive full-stack application designed for screening names against global sanction lists using advanced fuzzy matching techniques. It provides a secure, user-friendly interface for compliance officers to perform risk assessments and maintain immutable audit trails.

## ✨ Features

### 🔍 **Advanced Screening Engine**
- **Fuzzy Name Matching**: Utilizes PostgreSQL's `pg_trgm` extension for intelligent similarity detection
- **AI-Powered Risk Analysis**: Advanced algorithms for risk assessment and scoring
- **Real-time Search**: Instant results with detailed match breakdowns

### 🔐 **Security & Compliance**
- **JWT Authentication**: Secure token-based authentication system
- **Role-Based Access Control**: Admin and User roles with granular permissions
- **Immutable Audit Logs**: Cryptographically signed audit trails for compliance
- **Route Protection**: Middleware-based security for all protected endpoints

### 🎨 **Modern User Interface**
- **Dark Corporate Theme**: Professional UI with Tailwind CSS
- **Responsive Design**: Optimized for desktop and mobile devices
- **Real-time Updates**: Live data synchronization with React Query
- **Intuitive Navigation**: Clean, accessible interface with Lucide icons

### 🏗️ **Scalable Architecture**
- **Monorepo Structure**: Organized client/server workspaces with pnpm
- **Containerized Deployment**: Docker & Docker Compose support
- **Type-Safe APIs**: Full TypeScript coverage across the stack
- **Modular Design**: Clean separation of concerns with NestJS modules

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)

### Backend
- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with `pg_trgm` extension
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [Passport.js](https://www.passportjs.org/) with JWT
- **Validation**: [class-validator](https://github.com/typestack/class-validator)
- **Password Hashing**: [bcrypt](https://www.npmjs.com/package/bcrypt)

### DevOps & Tools
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Containerization**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- **Linting**: [ESLint](https://eslint.org/)
- **Code Formatting**: [Prettier](https://prettier.io/)
- **Testing**: [Jest](https://jestjs.io/)

## 📋 Prerequisites

- **Node.js**: v18 or later
- **pnpm**: v8 or later
- **Docker**: v20 or later
- **Docker Compose**: v2 or later

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd sanctions-guard
```

### 2. Install Dependencies
```bash
# Install all workspace dependencies
pnpm install
```

### 3. Environment Setup

#### Server Environment (.env)
Create `server/.env` file:
```env
DATABASE_URL="postgresql://sg_admin:969696@localhost:5435/sanctions_guard_dev"
POSTGRES_PASSWORD="969696"
JWT_SECRET="your-super-secret-jwt-key-here"
PORT=3001
```

#### Client Environment (.env.local)
Create `client/.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Start Database
```bash
# From project root
pnpm run dev:server

# Or from server directory
cd server
pnpm run docker:up
```

### 5. Run Database Migrations
```bash
# Generate Prisma client
pnpm run prisma:generate

# Run migrations
cd server
npx prisma migrate dev
```

### 6. Seed Database (Optional)
```bash
cd server
npx prisma db seed
```

### 7. Start Development Servers

#### Option A: Start Both Services
```bash
# Terminal 1 - Start Backend
pnpm run dev:server

# Terminal 2 - Start Frontend
pnpm run dev:client
```

#### Option B: Use Individual Commands
```bash
# Backend (from server directory)
pnpm run start:dev

# Frontend (from client directory)
pnpm run dev
```

### 8. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database Studio**: Run `pnpm run studio` (opens at http://localhost:5555)

## 📁 Project Structure

```
sanctions-guard/
├── client/                          # Next.js Frontend
│   ├── src/
│   │   ├── app/                     # Next.js App Router
│   │   │   ├── dashboard/           # Protected dashboard pages
│   │   │   ├── login/               # Authentication pages
│   │   │   └── register/
│   │   ├── components/              # Reusable UI components
│   │   ├── lib/                     # Utilities and API client
│   │   └── store/                   # Zustand state management
│   ├── public/                      # Static assets
│   └── package.json
├── server/                          # NestJS Backend
│   ├── src/
│   │   ├── app.module.ts           # Main application module
│   │   ├── auth/                   # Authentication module
│   │   ├── screening/              # Sanctions screening logic
│   │   ├── audit/                  # Audit logging system
│   │   ├── users/                  # User management
│   │   └── prisma/                 # Database service
│   ├── prisma/                     # Database schema & migrations
│   ├── test/                       # Test files
│   └── package.json
├── package.json                     # Workspace configuration
├── pnpm-workspace.yaml             # pnpm workspace config
└── README.md
```

## 🧪 Testing

### Backend Tests
```bash
cd server

# Run all tests
pnpm run test

# Run tests with coverage
pnpm run test:cov

# Run e2e tests
pnpm run test:e2e

# Run tests with initialization
pnpm run test:init
```

### Frontend Tests
```bash
cd client

# Run linting
pnpm run lint
```

## 🐳 Docker Deployment

### Development with Docker
```bash
cd server

# Start database only
docker-compose up -d sanctions_db

# Or start all services
docker-compose up -d
```

### Production Build
```bash
# Build client
pnpm run build:client

# Build server
pnpm run build:server

# Start production servers
pnpm run start:server  # Backend
pnpm run start:client  # Frontend
```

## 🔧 Available Scripts

### Root Level Scripts
```bash
pnpm run dev:client      # Start frontend dev server
pnpm run dev:server      # Start backend dev server
pnpm run build:client    # Build frontend for production
pnpm run build:server    # Build backend for production
pnpm run start:client    # Start frontend production server
pnpm run start:server    # Start backend production server
pnpm run studio          # Open Prisma Studio
pnpm run prisma:generate # Generate Prisma client
```

### Server Scripts
```bash
cd server
pnpm run start:dev       # Development server with hot reload
pnpm run start:debug     # Debug mode
pnpm run start:prod      # Production server
pnpm run build           # Build for production
pnpm run test            # Run unit tests
pnpm run test:e2e        # Run e2e tests
pnpm run lint            # Run ESLint
pnpm run format          # Format code with Prettier
pnpm run docker:up       # Start Docker containers
pnpm run docker:down     # Stop Docker containers
```

### Client Scripts
```bash
cd client
pnpm run dev             # Development server
pnpm run build           # Production build
pnpm run start           # Production server
pnpm run lint            # Run ESLint
```

## 🔐 Authentication

The application uses JWT-based authentication with the following endpoints:

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /users/me` - Get current user info

### User Roles
- **ADMIN**: Full access to all features including settings
- **USER**: Access to screening and audit logs

## 📊 API Endpoints

### Authentication
- `POST /auth/login`
- `POST /auth/register`

### Users
- `GET /users/me` - Get current user profile

### Screening
- `GET /screening/search?queryName=<name>` - Search sanctions list

### Audit Logs
- `GET /audit/logs` - Get audit trail

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the UNLICENSED License.

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) for the excellent backend framework
- [Next.js](https://nextjs.org/) for the modern React framework
- [Prisma](https://www.prisma.io/) for the type-safe database access
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

---

<div align="center">
  <p>Built with ❤️ for compliance and security</p>
  <p>
    <a href="#sanctionsguard">Back to top</a>
  </p>
</div>
