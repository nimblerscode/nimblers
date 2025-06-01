# Architecture Overview

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Clean Architecture Layers](#clean-architecture-layers)
3. [Multi-Tenant Design](#multi-tenant-design)
4. [Cloudflare Workers Platform](#cloudflare-workers-platform)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Security Architecture](#security-architecture)
7. [Performance Architecture](#performance-architecture)

## System Architecture

Nimblers is built on a **serverless-first** architecture using Cloudflare Workers with Effect-TS Clean Architecture patterns. The system provides multi-tenant SaaS capabilities with strong isolation and scalability.

### High-Level System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        API_CLIENT[API Clients]
    end

    subgraph "Cloudflare Edge Network"
        CDN[CDN / Static Assets]
        WORKER[Workers Runtime]
    end

    subgraph "Application Services"
        GATEWAY[Gateway Worker]
        ORG_DO[Organization<br/>Durable Objects]
        SHOPIFY_DO[Shopify OAuth<br/>Durable Objects]
    end

    subgraph "Data Layer"
        D1_GLOBAL[D1 Database<br/>Global Schema]
        DO_STORAGE[Durable Object<br/>SQLite Storage]
        R2[R2 Object Storage<br/>File Assets]
    end

    subgraph "External Services"
        SHOPIFY[Shopify API]
        RESEND[Resend Email]
        BETTER_AUTH[Better Auth]
    end

    WEB --> CDN
    WEB --> WORKER
    API_CLIENT --> WORKER

    WORKER --> GATEWAY
    GATEWAY --> ORG_DO
    GATEWAY --> SHOPIFY_DO

    ORG_DO --> DO_STORAGE
    GATEWAY --> D1_GLOBAL

    SHOPIFY_DO --> SHOPIFY
    GATEWAY --> RESEND
    GATEWAY --> BETTER_AUTH

    CDN --> R2
```

### Core Components

| Component              | Purpose                                               | Technology               | Scalability        |
| ---------------------- | ----------------------------------------------------- | ------------------------ | ------------------ |
| **Gateway Worker**     | Request routing, authentication, global operations    | Cloudflare Workers       | Auto-scaling       |
| **Organization DO**    | Tenant-specific business logic and data               | Durable Objects + SQLite | Per-tenant scaling |
| **Shopify OAuth DO**   | OAuth flow management and token storage               | Durable Objects + SQLite | Per-store scaling  |
| **D1 Global Database** | User accounts, sessions, global organization registry | Cloudflare D1            | Managed scaling    |
| **R2 Storage**         | Static assets, uploaded files                         | Cloudflare R2            | Global CDN         |

## Clean Architecture Layers

The project strictly follows Clean Architecture principles with Effect-TS for maximum maintainability and testability.

### Architecture Layer Diagram

```mermaid
graph TD
    subgraph "UI Layer (src/app/)"
        ACTIONS[Server Actions]
        COMPONENTS[React Components]
        PAGES[Page Layouts]
    end

    subgraph "Application Layer (src/application/)"
        USE_CASES[Use Cases]
        ORCHESTRATION[Business Orchestration]
        APP_SERVICES[Application Services]
    end

    subgraph "Domain Layer (src/domain/)"
        ENTITIES[Business Entities]
        VALUE_OBJECTS[Value Objects]
        BUSINESS_RULES[Business Rules]
        INTERFACES[Abstract Interfaces]
    end

    subgraph "Infrastructure Layer (src/infrastructure/)"
        REPOSITORIES[Repository Implementations]
        EXTERNAL_APIS[External API Clients]
        DATABASES[Database Adapters]
        CLOUDFLARE[Cloudflare Services]
    end

    subgraph "Configuration Layer (src/config/)"
        LAYERS[Effect Layers]
        DI[Dependency Injection]
        ENV_CONFIG[Environment Config]
    end

    ACTIONS --> USE_CASES
    COMPONENTS --> ACTIONS
    PAGES --> COMPONENTS

    USE_CASES --> ENTITIES
    USE_CASES --> INTERFACES
    ORCHESTRATION --> USE_CASES

    REPOSITORIES --> INTERFACES
    EXTERNAL_APIS --> INTERFACES
    DATABASES --> INTERFACES

    LAYERS --> REPOSITORIES
    LAYERS --> EXTERNAL_APIS
    DI --> LAYERS
```

### Layer Responsibilities

#### 1. Domain Layer (`src/domain/`)

**Core Business Logic & Contracts**

- **Entities**: Pure business objects (User, Organization, Invitation)
- **Value Objects**: Immutable data types (Email, OrganizationSlug)
- **Business Rules**: Domain-specific validation and logic
- **Interfaces**: Abstract contracts for repositories and services
- **Errors**: Domain-specific error types

**Key Principles:**

- No external dependencies
- Pure functions only
- Immutable data structures
- Framework-agnostic

#### 2. Application Layer (`src/application/`)

**Business Use Case Orchestration**

- **Use Cases**: Complex business workflows
- **Application Services**: Coordinate multiple domain services
- **Business Logic**: Rules that span multiple entities
- **Data Transformation**: Convert between domain and infrastructure models

**Effect-TS Patterns:**

```typescript
export const CreateOrganizationUseCase = Effect.gen(function* () {
  const orgRepo = yield* OrganizationRepo;
  const userRepo = yield* UserRepo;
  const emailService = yield* EmailService;

  // Orchestrate multiple domain services
  // Handle complex business workflows
  // Transform data between layers
});
```

#### 3. Infrastructure Layer (`src/infrastructure/`)

**External System Integration**

- **Repositories**: Database access implementations
- **API Clients**: External service integrations
- **Adapters**: Framework-specific implementations
- **Durable Objects**: Cloudflare Workers-specific services

**Integration Points:**

- Cloudflare D1 Database
- Durable Object Storage
- Shopify API
- Resend Email Service
- Better Auth

#### 4. Configuration Layer (`src/config/`)

**Dependency Injection & Wiring**

- **Effect Layers**: Dependency composition
- **Environment Configuration**: Runtime settings
- **Service Wiring**: Connect interfaces to implementations

#### 5. UI Layer (`src/app/`)

**User Interface & Actions**

- **Server Actions**: Backend integration points
- **React Components**: UI presentation
- **Page Layouts**: Route-level organization

## Multi-Tenant Design

Nimblers implements a **hybrid multi-tenancy** model with both shared and isolated resources.

### Tenant Isolation Model

```mermaid
graph TB
    subgraph "Global Shared Layer"
        USERS[User Accounts]
        AUTH[Authentication]
        ORG_REGISTRY[Organization Registry]
        GLOBAL_CONFIG[Global Configuration]
    end

    subgraph "Tenant A"
        ORG_A[Organization DO A]
        MEMBERS_A[Members A]
        INVITES_A[Invitations A]
        STORES_A[Connected Stores A]
        DATA_A[SQLite Storage A]
    end

    subgraph "Tenant B"
        ORG_B[Organization DO B]
        MEMBERS_B[Members B]
        INVITES_B[Invitations B]
        STORES_B[Connected Stores B]
        DATA_B[SQLite Storage B]
    end

    subgraph "Tenant C"
        ORG_C[Organization DO C]
        MEMBERS_C[Members C]
        INVITES_C[Invitations C]
        STORES_C[Connected Stores C]
        DATA_C[SQLite Storage C]
    end

    USERS --> ORG_A
    USERS --> ORG_B
    USERS --> ORG_C

    ORG_REGISTRY --> ORG_A
    ORG_REGISTRY --> ORG_B
    ORG_REGISTRY --> ORG_C
```

### Isolation Boundaries

| Resource                  | Scope      | Technology              | Isolation Level |
| ------------------------- | ---------- | ----------------------- | --------------- |
| **User Accounts**         | Global     | D1 Database             | Shared          |
| **Authentication**        | Global     | Better Auth + D1        | Shared          |
| **Organization Registry** | Global     | D1 Database             | Shared          |
| **Organization Data**     | Per-Tenant | Durable Object SQLite   | Isolated        |
| **Members & Roles**       | Per-Tenant | Durable Object SQLite   | Isolated        |
| **Invitations**           | Per-Tenant | Durable Object SQLite   | Isolated        |
| **Connected Stores**      | Per-Tenant | Durable Object SQLite   | Isolated        |
| **Business Logic**        | Per-Tenant | Durable Object Instance | Isolated        |

### Tenant Addressing

Each organization is addressed by a unique slug and maps to a dedicated Durable Object:

```typescript
// Organization slug -> Durable Object ID
const doId = env.ORG_DO.idFromName(organizationSlug);
const orgDO = env.ORG_DO.get(doId);
```

## Cloudflare Workers Platform

### Platform Components

```mermaid
graph LR
    subgraph "Cloudflare Edge"
        EDGE[Edge Locations<br/>200+ Cities]
    end

    subgraph "Workers Runtime"
        ISOLATES[V8 Isolates]
        WORKER_INSTANCES[Worker Instances]
    end

    subgraph "Storage Services"
        D1[D1 Database<br/>SQLite]
        DO_STORAGE[Durable Object<br/>Storage]
        KV[Workers KV<br/>Key-Value]
        R2[R2 Storage<br/>Objects]
    end

    subgraph "Compute Services"
        DO[Durable Objects<br/>Stateful Compute]
        AI[Workers AI<br/>Inference]
        ANALYTICS[Analytics Engine<br/>Time Series]
    end

    EDGE --> ISOLATES
    ISOLATES --> WORKER_INSTANCES
    WORKER_INSTANCES --> D1
    WORKER_INSTANCES --> DO
    DO --> DO_STORAGE
    WORKER_INSTANCES --> KV
    WORKER_INSTANCES --> R2
    WORKER_INSTANCES --> AI
    WORKER_INSTANCES --> ANALYTICS
```

### Performance Characteristics

| Metric                  | Value        | Notes                        |
| ----------------------- | ------------ | ---------------------------- |
| **Cold Start**          | < 5ms        | V8 Isolates (not containers) |
| **Memory Limit**        | 128MB        | Per isolate                  |
| **CPU Time**            | 50ms/request | Standard plan                |
| **Duration Limit**      | 15 minutes   | Durable Objects              |
| **Request Size**        | 100MB        | Max request/response         |
| **Concurrent Requests** | 1000+        | Per Worker                   |

### Durable Objects Architecture

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as Gateway Worker
    participant OrgDO as Organization DO
    participant Storage as SQLite Storage

    Client->>Gateway: HTTP Request
    Gateway->>Gateway: Route to organization
    Gateway->>OrgDO: Forward request (by slug)
    OrgDO->>Storage: Query/Update data
    Storage-->>OrgDO: Data response
    OrgDO->>OrgDO: Business logic
    OrgDO-->>Gateway: Response
    Gateway-->>Client: HTTP Response

    Note over OrgDO,Storage: Strong consistency<br/>Single instance per organization
```

## Data Flow Architecture

### Request Processing Flow

```mermaid
graph TD
    START[HTTP Request] --> AUTH{Authenticated?}

    AUTH -->|No| LOGIN[Redirect to Login]
    AUTH -->|Yes| ROUTE[Route Analysis]

    ROUTE --> API{API Request?}
    ROUTE --> UI{UI Request?}

    API --> VALIDATE[Input Validation]
    UI --> SSR[Server-Side Rendering]

    VALIDATE --> AUTHORIZE{Authorized?}
    SSR --> FETCH[Fetch Data]

    AUTHORIZE -->|No| ERROR_403[403 Forbidden]
    AUTHORIZE -->|Yes| BUSINESS[Business Logic]

    BUSINESS --> PERSIST[Persist Changes]
    FETCH --> RENDER[Render Components]

    PERSIST --> RESPONSE[JSON Response]
    RENDER --> HTML[HTML Response]

    RESPONSE --> END[HTTP Response]
    HTML --> END
    LOGIN --> END
    ERROR_403 --> END
```

### Data Persistence Flow

```mermaid
graph LR
    subgraph "Application Layer"
        USE_CASE[Use Case]
    end

    subgraph "Domain Layer"
        ENTITY[Domain Entity]
        REPO_INTERFACE[Repository Interface]
    end

    subgraph "Infrastructure Layer"
        REPO_IMPL[Repository Implementation]
        DB_CLIENT[Database Client]
    end

    subgraph "Storage Layer"
        D1_DB[D1 Database]
        DO_SQLITE[DO SQLite]
    end

    USE_CASE --> REPO_INTERFACE
    REPO_INTERFACE --> REPO_IMPL
    REPO_IMPL --> DB_CLIENT
    DB_CLIENT --> D1_DB
    DB_CLIENT --> DO_SQLITE

    ENTITY -.-> REPO_INTERFACE
```

## Security Architecture

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant App as Frontend App
    participant Worker as Gateway Worker
    participant Auth as Better Auth
    participant D1 as D1 Database
    participant OrgDO as Organization DO

    User->>App: Login Request
    App->>Worker: POST /auth/login
    Worker->>Auth: Validate Credentials
    Auth->>D1: Lookup User
    D1-->>Auth: User Data
    Auth->>D1: Create Session
    D1-->>Auth: Session Token
    Auth-->>Worker: Session + User
    Worker-->>App: Set Cookies
    App-->>User: Redirect to Dashboard

    Note over User,OrgDO: Subsequent Requests

    User->>App: Access Organization
    App->>Worker: GET /organization/slug
    Worker->>Auth: Validate Session
    Auth->>D1: Lookup Session
    D1-->>Auth: Session Valid
    Worker->>OrgDO: Forward Request
    OrgDO->>OrgDO: Check Membership
    OrgDO-->>Worker: Organization Data
    Worker-->>App: JSON/HTML Response
    App-->>User: Display Content
```

### Security Layers

| Layer                | Protection         | Implementation          |
| -------------------- | ------------------ | ----------------------- |
| **Transport**        | HTTPS/TLS          | Cloudflare SSL          |
| **Authentication**   | Session-based      | Better Auth             |
| **Authorization**    | Role-based         | Organization membership |
| **Input Validation** | Schema validation  | Effect Schema           |
| **CORS**             | Origin validation  | Custom middleware       |
| **Rate Limiting**    | Request throttling | Cloudflare rules        |
| **Data Encryption**  | At rest & transit  | Cloudflare encryption   |

### Privacy & Compliance

```mermaid
graph TB
    subgraph "Privacy Controls"
        GDPR[GDPR Compliance]
        CCPA[CCPA Compliance]
        DATA_MIN[Data Minimization]
        RETENTION[Retention Policies]
    end

    subgraph "Webhook Handlers"
        CUSTOMER_DATA[Customer Data Request]
        CUSTOMER_ERASE[Customer Data Erasure]
        SHOP_ERASE[Shop Data Erasure]
    end

    subgraph "Data Processing"
        ENCRYPT[Encryption at Rest]
        AUDIT[Audit Logging]
        ACCESS_CONTROL[Access Control]
        BACKUP[Secure Backups]
    end

    GDPR --> CUSTOMER_DATA
    CCPA --> CUSTOMER_ERASE
    DATA_MIN --> SHOP_ERASE

    CUSTOMER_DATA --> ENCRYPT
    CUSTOMER_ERASE --> AUDIT
    SHOP_ERASE --> ACCESS_CONTROL

    ENCRYPT --> BACKUP
    AUDIT --> BACKUP
    ACCESS_CONTROL --> BACKUP
```

## Performance Architecture

### Caching Strategy

```mermaid
graph TB
    subgraph "CDN Layer"
        CLOUDFLARE_CACHE[Cloudflare Cache<br/>Static Assets]
    end

    subgraph "Application Layer"
        WORKER_CACHE[Worker Memory<br/>Short-term Cache]
        KV_CACHE[Workers KV<br/>Global Cache]
    end

    subgraph "Data Layer"
        D1_CACHE[D1 Query Cache<br/>Automatic]
        DO_MEMORY[DO Memory Cache<br/>In-Process]
    end

    CLIENT[Client Browser] --> CLOUDFLARE_CACHE
    CLOUDFLARE_CACHE --> WORKER_CACHE
    WORKER_CACHE --> KV_CACHE
    KV_CACHE --> D1_CACHE
    D1_CACHE --> DO_MEMORY

    CLOUDFLARE_CACHE -.->|Cache Miss| WORKER_CACHE
    WORKER_CACHE -.->|Cache Miss| KV_CACHE
    KV_CACHE -.->|Cache Miss| D1_CACHE
```

### Scalability Patterns

| Component            | Scaling Method          | Triggers                |
| -------------------- | ----------------------- | ----------------------- |
| **Gateway Worker**   | Horizontal auto-scaling | Request volume          |
| **Organization DOs** | Per-tenant scaling      | Organization activity   |
| **D1 Database**      | Automatic sharding      | Query volume            |
| **Static Assets**    | Global CDN              | Geographic distribution |
| **API Endpoints**    | Load balancing          | Response time           |

### Performance Monitoring

```mermaid
graph LR
    subgraph "Metrics Collection"
        WORKER_METRICS[Worker Analytics]
        DO_METRICS[DO Performance]
        D1_METRICS[D1 Query Metrics]
        REAL_USER[Real User Monitoring]
    end

    subgraph "Alerting"
        ERROR_RATE[Error Rate Alerts]
        LATENCY[Latency Alerts]
        AVAILABILITY[Availability Alerts]
    end

    subgraph "Dashboards"
        CLOUDFLARE_DASH[Cloudflare Dashboard]
        CUSTOM_DASH[Custom Dashboards]
        HEALTH_CHECK[Health Checks]
    end

    WORKER_METRICS --> ERROR_RATE
    DO_METRICS --> LATENCY
    D1_METRICS --> AVAILABILITY
    REAL_USER --> CLOUDFLARE_DASH

    ERROR_RATE --> CUSTOM_DASH
    LATENCY --> CUSTOM_DASH
    AVAILABILITY --> HEALTH_CHECK
```

## Architecture Benefits

### Scalability Benefits

1. **Per-Tenant Scaling**: Each organization scales independently
2. **Global Distribution**: Cloudflare's edge network reduces latency
3. **Serverless Architecture**: No server management overhead
4. **Resource Efficiency**: Pay only for actual usage

### Maintainability Benefits

1. **Clean Architecture**: Clear separation of concerns
2. **Type Safety**: Compile-time error detection with TypeScript + Effect-TS
3. **Dependency Injection**: Easy testing and modular development
4. **Functional Programming**: Predictable, composable code

### Reliability Benefits

1. **Strong Consistency**: Durable Objects provide ACID guarantees
2. **Automatic Failover**: Cloudflare handles infrastructure failures
3. **Error Handling**: Structured error types prevent silent failures
4. **Observability**: Built-in tracing and monitoring

---

**Next**: [Data Models & Schemas](../data-models/README.md)
