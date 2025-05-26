# Nimblers - Multi-Tenant Backend System

A sophisticated multi-tenant backend system built with Cloudflare Workers, Durable Objects, and D1 database, implementing Clean Architecture patterns with Effect-TS.

## Architecture Overview

This system implements a **multi-tenant architecture** with:

- **Global Database (D1)**: User accounts, sessions, organizations, and cross-tenant relationships
- **Tenant Databases (SQLite in Durable Objects)**: Organization-specific data (members, invitations, etc.)
- **Effect-TS Clean Architecture**: Domain-driven design with dependency inversion
- **RedwoodSDK**: React Server Components with server actions

## Technology Stack

- **Runtime**: Cloudflare Workers + Durable Objects
- **Database**: Cloudflare D1 (global) + SQLite (tenant-specific)
- **Architecture**: Effect-TS Clean Architecture patterns
- **Frontend**: React 19 (Server Components) + RedwoodSDK
- **ORM**: Drizzle ORM
- **Authentication**: Better Auth
- **Styling**: Panda CSS
- **Testing**: Vitest with Cloudflare Workers testing

## Project Structure

```
src/
├── domain/                    # Domain layer (business logic)
│   ├── global/               # Cross-tenant entities
│   │   ├── user/            # User domain models & services
│   │   ├── organization/    # Organization domain models
│   │   ├── session/         # Session management
│   │   └── auth/            # Authentication domain
│   └── tenant/              # Tenant-specific entities
│       ├── invitations/     # Invitation system
│       ├── member/          # Organization members
│       └── organization/    # Tenant organization data
├── application/             # Application layer (use cases)
│   ├── global/             # Cross-tenant use cases
│   └── tenant/             # Tenant-specific use cases
├── infrastructure/         # Infrastructure layer
│   ├── cloudflare/        # Cloudflare Workers & Durable Objects
│   ├── persistence/       # Database repositories
│   ├── auth/             # Authentication infrastructure
│   └── email/            # Email services
├── config/               # Configuration & dependency wiring
└── app/                 # UI layer (React Server Components)
    ├── actions/         # Server actions
    └── components/      # React components
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Cloudflare account
- Cloudflare Wrangler CLI

### Installation

```bash
git clone <repository-url>
cd nimblers
pnpm install
```

### Environment Setup

1. Copy environment variables:

```bash
cp .dev.vars.example .dev.vars
```

2. Configure your `.dev.vars` file with:

```
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token
SESSION_SECRET=your-session-secret
# Add other required environment variables
```

### Database Setup

1. **Create D1 Database** (Global):

```bash
npx wrangler d1 create nimblers-registry
```

2. **Update wrangler.jsonc** with your database ID

3. **Run Migrations**:

```bash
# Global database migrations
pnpm migrate:gateway

# Tenant database migrations are handled automatically by Durable Objects
```

### Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
```

### Deployment

```bash
# Deploy to Cloudflare Workers
pnpm deploy

# Deploy with migrations
pnpm deploy:with-migrations
```

## Key Features

### Multi-Tenant Architecture

- **Global Database**: User accounts, sessions, organization registry
- **Tenant Isolation**: Each organization has its own Durable Object with SQLite database
- **Cross-Tenant Operations**: Global membership tracking for user profiles

### Invitation System

- **Email-based Invitations**: Secure token-based invitation flow
- **Dual Database Updates**: Atomic operations across global and tenant databases
- **Email Verification**: Ensures invited email matches authenticated user

### Authentication & Authorization

- **Better Auth Integration**: Session-based authentication
- **Role-Based Access Control**: Organization-level permissions
- **Secure Token Handling**: JWT-based invitation tokens

### Effect-TS Clean Architecture

- **Domain Layer**: Pure business logic with branded types
- **Application Layer**: Use case orchestration
- **Infrastructure Layer**: External service implementations
- **Dependency Injection**: Context.Tag-based dependency management

## API Endpoints

### Authentication

- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `POST /auth/logout` - User logout

### Organizations

- `GET /organizations` - List user's organizations
- `POST /organizations` - Create new organization
- `GET /organizations/:slug` - Get organization details

### Invitations

- `POST /organizations/:slug/invitations` - Create invitation
- `POST /invitations/accept` - Accept invitation
- `GET /invitations/:token` - Get invitation details

## Development Guidelines

### Adding New Features

Follow the Effect-TS Clean Architecture pattern:

1. **Domain Layer**: Define models, errors, and abstract services
2. **Infrastructure Layer**: Implement repositories and external services
3. **Application Layer**: Implement use cases with business logic
4. **Configuration Layer**: Wire dependencies with Effect layers
5. **UI Layer**: Create server actions and React components

### Error Handling

- Use `Data.TaggedError` for domain errors
- Map infrastructure errors to domain errors
- Implement graceful degradation with `Effect.catchAll`

### Testing

- Unit tests for domain logic
- Integration tests for use cases
- End-to-end tests for critical flows

## Monitoring & Observability

- **Cloudflare Analytics**: Request metrics and performance
- **Effect Tracing**: Built-in observability with `Effect.withSpan`
- **Error Tracking**: Structured error logging

## Contributing

1. Follow the Clean Architecture patterns
2. Use Effect-TS for all business logic
3. Write tests for new features
4. Update documentation for API changes

## License

[Your License Here]

## Support

[Your Support Information Here]
