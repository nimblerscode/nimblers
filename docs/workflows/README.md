# Workflows & Processes

## Table of Contents

1. [Overview](#overview)
2. [User Authentication Flow](#user-authentication-flow)
3. [Organization Management](#organization-management)
4. [Invitation System](#invitation-system)
5. [Shopify Integration](#shopify-integration)
6. [Member Management](#member-management)
7. [Error Handling Workflows](#error-handling-workflows)
8. [Background Processes](#background-processes)

## Overview

Nimblers implements several core workflows that enable multi-tenant organization management with Shopify integration. Each workflow is designed with **Effect-TS patterns** for type safety, error handling, and observability.

### Workflow Categories

| Category                | Purpose                              | Complexity | Dependencies        |
| ----------------------- | ------------------------------------ | ---------- | ------------------- |
| **Authentication**      | User identity and session management | Medium     | Better Auth, D1     |
| **Organization**        | Multi-tenant organization lifecycle  | High       | D1, Durable Objects |
| **Invitations**         | Team member onboarding               | High       | Email, Both DBs     |
| **Shopify Integration** | E-commerce store connections         | Very High  | Shopify API, OAuth  |
| **Member Management**   | Role-based access control            | Medium     | Tenant DB           |

## User Authentication Flow

The authentication system provides secure, session-based user management with multi-organization support.

### Complete Authentication Sequence

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Gateway as Gateway Worker
    participant Auth as Better Auth
    participant D1 as D1 Database
    participant OrgDO as Organization DO

    Note over User,OrgDO: Registration Flow
    User->>Frontend: Access /signup
    Frontend->>Gateway: GET /signup
    Gateway->>Gateway: Check existing session
    Gateway-->>Frontend: Render signup form
    Frontend-->>User: Display form

    User->>Frontend: Submit registration
    Frontend->>Gateway: POST /auth/signup
    Gateway->>Auth: Create user account
    Auth->>D1: Insert user record
    D1-->>Auth: User created
    Auth->>D1: Create session
    D1-->>Auth: Session token
    Auth-->>Gateway: User + Session
    Gateway-->>Frontend: Set cookies
    Frontend-->>User: Redirect to onboarding

    Note over User,OrgDO: Login Flow
    User->>Frontend: Access /login
    Frontend->>Gateway: POST /auth/login
    Gateway->>Auth: Validate credentials
    Auth->>D1: Lookup user
    D1-->>Auth: User data
    Auth->>D1: Create new session
    D1-->>Auth: Session token
    Auth-->>Gateway: Session + User
    Gateway-->>Frontend: Set secure cookies
    Frontend-->>User: Redirect to dashboard

    Note over User,OrgDO: Organization Context
    User->>Frontend: Access organization
    Frontend->>Gateway: GET /organization/slug
    Gateway->>Auth: Validate session
    Auth->>D1: Check session validity
    D1-->>Auth: Session valid + user
    Gateway->>D1: Check organization membership
    D1-->>Gateway: Membership confirmed
    Gateway->>OrgDO: Forward request
    OrgDO-->>Gateway: Organization data
    Gateway-->>Frontend: Render organization
    Frontend-->>User: Display content
```

### Authentication States

```mermaid
stateDiagram-v2
    [*] --> Anonymous
    Anonymous --> Authenticating : Submit credentials
    Authenticating --> Authenticated : Success
    Authenticating --> Anonymous : Failed
    Authenticated --> OrganizationContext : Select organization
    OrganizationContext --> Authenticated : Switch organization
    Authenticated --> Anonymous : Logout/Session expired
    OrganizationContext --> Anonymous : Logout
```

### Session Management

#### Session Creation

```typescript
// Better Auth session creation
export const createSession = (userId: UserId) =>
  Effect.gen(function* () {
    const authService = yield* AuthService;
    const sessionRepo = yield* SessionRepo;

    // Create session with Better Auth
    const session = yield* authService.createSession({
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Store in D1 database
    yield* sessionRepo.create({
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
    });

    return session;
  });
```

#### Session Validation Middleware

```typescript
export const sessionHandler = async ({ request, ctx }: RequestInfo) => {
  const sessionResult = await Effect.runPromise(
    Effect.gen(function* () {
      const authService = yield* AuthService;
      const sessionData = yield* authService.getSession();

      return {
        session: sessionData.session,
        user: sessionData.user,
      };
    }).pipe(
      Effect.provide(AuthServiceLive(request)),
      Effect.catchAll(() => Effect.succeed(null))
    )
  );

  if (!sessionResult) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  // Add to context for downstream handlers
  ctx.session = sessionResult.session;
  ctx.user = sessionResult.user;
};
```

## Organization Management

Organization management encompasses creation, member management, and tenant isolation.

### Organization Creation Workflow

```mermaid
graph TD
    START[User Creates Organization] --> VALIDATE[Validate Input]
    VALIDATE --> CHECK_SLUG[Check Slug Availability]
    CHECK_SLUG --> SLUG_TAKEN{Slug Taken?}
    SLUG_TAKEN -->|Yes| ERROR_SLUG[Return Slug Error]
    SLUG_TAKEN -->|No| CREATE_GLOBAL[Create Global Registry Entry]

    CREATE_GLOBAL --> INIT_DO[Initialize Durable Object]
    INIT_DO --> CREATE_TENANT[Create Tenant Database]
    CREATE_TENANT --> ADD_CREATOR[Add Creator as Owner]
    ADD_CREATOR --> SEND_WELCOME[Send Welcome Email]
    SEND_WELCOME --> SUCCESS[Organization Created]

    ERROR_SLUG --> END[Return Error]
    SUCCESS --> END

    CREATE_GLOBAL --> ROLLBACK1{Error?}
    ROLLBACK1 -->|Yes| CLEANUP_GLOBAL[Remove Global Entry]
    INIT_DO --> ROLLBACK2{Error?}
    ROLLBACK2 -->|Yes| CLEANUP_GLOBAL
    CREATE_TENANT --> ROLLBACK3{Error?}
    ROLLBACK3 -->|Yes| CLEANUP_ALL[Full Rollback]

    CLEANUP_GLOBAL --> END
    CLEANUP_ALL --> END
```

### Implementation Details

#### Organization Creation Use Case

```typescript
export const createOrganization = (input: CreateOrgInput, creatorId: UserId) =>
  Effect.gen(function* () {
    // 1. Validate input and check slug availability
    const validatedInput = yield* validateOrganizationInput(input);
    const slugAvailable = yield* checkSlugAvailability(validatedInput.slug);

    if (!slugAvailable) {
      yield* Effect.fail(
        new SlugUnavailableError({
          slug: validatedInput.slug,
        })
      );
    }

    // 2. Create in global registry (atomic operation)
    const org = yield* Effect.gen(function* () {
      const globalOrgRepo = yield* GlobalOrgRepo;
      return yield* globalOrgRepo.create({
        id: nanoid() as OrganizationId,
        slug: validatedInput.slug,
        name: validatedInput.name,
        status: "active",
      });
    });

    // 3. Initialize tenant environment (with rollback)
    yield* Effect.gen(function* () {
      const doId = orgDONamespace.idFromName(org.slug);
      const orgDO = orgDONamespace.get(doId);

      const response = yield* Effect.tryPromise({
        try: async () => {
          return await orgDO.fetch(
            new Request("http://internal/initialize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                organization: org,
                creator: { id: creatorId },
              }),
            })
          );
        },
        catch: (error) => new TenantInitializationError({ cause: error }),
      });

      if (!response.ok) {
        yield* Effect.fail(
          new TenantInitializationError({
            message: `Failed to initialize tenant: ${response.status}`,
          })
        );
      }
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          // Rollback: Remove from global registry
          const globalOrgRepo = yield* GlobalOrgRepo;
          yield* globalOrgRepo.delete(org.id).pipe(
            Effect.catchAll(() => Effect.succeed(void 0)) // Log but don't fail
          );
          return yield* Effect.fail(error);
        })
      )
    );

    return org;
  }).pipe(
    Effect.withSpan("OrganizationUseCase.create", {
      attributes: {
        organizationSlug: input.slug,
        creatorId,
      },
    })
  );
```

### Tenant Initialization Process

```mermaid
sequenceDiagram
    participant Gateway
    participant GlobalDB as Global D1
    participant OrgDO as Organization DO
    participant TenantDB as Tenant SQLite
    participant Email as Email Service

    Gateway->>GlobalDB: Create organization record
    GlobalDB-->>Gateway: Organization created

    Gateway->>OrgDO: POST /initialize
    OrgDO->>TenantDB: Create schema
    TenantDB-->>OrgDO: Schema created

    OrgDO->>TenantDB: Insert organization
    TenantDB-->>OrgDO: Organization inserted

    OrgDO->>TenantDB: Add creator as owner
    TenantDB-->>OrgDO: Member added

    OrgDO->>Email: Send welcome email
    Email-->>OrgDO: Email sent

    OrgDO-->>Gateway: Initialization complete

    Note over Gateway,Email: Error Handling
    OrgDO->>OrgDO: Rollback on any failure
    OrgDO-->>Gateway: Error + cleanup status
```

## Invitation System

The invitation system enables secure team member onboarding with email verification and role assignment.

### Complete Invitation Flow

```mermaid
graph TD
    subgraph "Invitation Creation"
        START[Admin Creates Invitation] --> VALIDATE_EMAIL[Validate Email]
        VALIDATE_EMAIL --> CHECK_EXISTING[Check Existing Member]
        CHECK_EXISTING --> IS_MEMBER{Already Member?}
        IS_MEMBER -->|Yes| ERROR_MEMBER[Error: Already Member]
        IS_MEMBER -->|No| CHECK_PENDING[Check Pending Invites]
        CHECK_PENDING --> HAS_PENDING{Has Pending?}
        HAS_PENDING -->|Yes| ERROR_PENDING[Error: Invite Pending]
        HAS_PENDING -->|No| CREATE_INVITE[Create Invitation]
        CREATE_INVITE --> GENERATE_TOKEN[Generate Secure Token]
        GENERATE_TOKEN --> SEND_EMAIL[Send Invitation Email]
        SEND_EMAIL --> INVITE_CREATED[Invitation Created]
    end

    subgraph "Invitation Acceptance"
        USER_CLICKS[User Clicks Email Link] --> VALIDATE_TOKEN[Validate Token]
        VALIDATE_TOKEN --> TOKEN_VALID{Token Valid?}
        TOKEN_VALID -->|No| ERROR_TOKEN[Error: Invalid Token]
        TOKEN_VALID -->|Yes| CHECK_USER[Check User Exists]
        CHECK_USER --> USER_EXISTS{User Exists?}
        USER_EXISTS -->|No| REDIRECT_SIGNUP[Redirect to Signup]
        USER_EXISTS -->|Yes| CHECK_LOGIN[Check Login Status]
        CHECK_LOGIN --> IS_LOGGED{Logged In?}
        IS_LOGGED -->|No| REDIRECT_LOGIN[Redirect to Login]
        IS_LOGGED -->|Yes| VERIFY_EMAIL[Verify Email Match]
        VERIFY_EMAIL --> EMAIL_MATCH{Email Matches?}
        EMAIL_MATCH -->|No| ERROR_EMAIL[Error: Email Mismatch]
        EMAIL_MATCH -->|Yes| ACCEPT_INVITE[Accept Invitation]
        ACCEPT_INVITE --> ADD_MEMBER[Add to Organization]
        ADD_MEMBER --> UPDATE_STATUS[Update Invite Status]
        UPDATE_STATUS --> SEND_WELCOME[Send Welcome Email]
        SEND_WELCOME --> SUCCESS[Member Added]
    end

    REDIRECT_SIGNUP --> SIGNUP_FLOW[Signup with Token]
    SIGNUP_FLOW --> ACCEPT_INVITE
    REDIRECT_LOGIN --> LOGIN_FLOW[Login with Token]
    LOGIN_FLOW --> VERIFY_EMAIL
```

### Invitation State Management

```mermaid
stateDiagram-v2
    [*] --> pending : Create invitation
    pending --> accepted : User accepts
    pending --> expired : Time limit exceeded
    pending --> revoked : Admin cancels

    accepted --> [*] : Complete
    expired --> [*] : Complete
    revoked --> [*] : Complete

    note right of pending : 7 days default expiry
    note right of accepted : User becomes member
    note right of expired : Can be recreated
    note right of revoked : Cannot be undone
```

### Implementation Details

#### Invitation Creation

```typescript
export const createInvitation = (input: CreateInvitationInput) =>
  Effect.gen(function* () {
    const invitationRepo = yield* InvitationRepo;
    const memberRepo = yield* MemberRepo;
    const emailService = yield* EmailService;
    const tokenService = yield* InviteTokenService;

    // 1. Validate invitee is not already a member
    const existingMember = yield* memberRepo.findByEmail(input.inviteeEmail);
    if (Option.isSome(existingMember)) {
      yield* Effect.fail(
        new UserAlreadyMember({
          email: input.inviteeEmail,
        })
      );
    }

    // 2. Check for pending invitations
    const pendingInvite = yield* invitationRepo.findPendingByEmail(
      input.inviteeEmail
    );
    if (Option.isSome(pendingInvite)) {
      yield* Effect.fail(
        new DuplicatePendingInvitation({
          email: input.inviteeEmail,
        })
      );
    }

    // 3. Create invitation record
    const invitation = yield* invitationRepo.create({
      id: nanoid() as InvitationId,
      email: input.inviteeEmail,
      inviterId: input.inviterId,
      role: input.role,
      status: "pending",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
    });

    // 4. Generate secure token
    const token = yield* tokenService.generateInvitationToken({
      invitationId: invitation.id,
      email: invitation.email,
      organizationSlug: input.organizationSlug,
    });

    // 5. Send invitation email
    yield* emailService.sendInvitation({
      to: invitation.email,
      inviterName: input.inviterName,
      organizationName: input.organizationName,
      acceptUrl: `${baseUrl}/invite/${token}`,
      role: invitation.role,
    });

    return { invitation, token };
  }).pipe(Effect.withSpan("InvitationUseCase.create"));
```

#### Invitation Acceptance

```typescript
export const acceptInvitation = (token: string, acceptingUserId?: UserId) =>
  Effect.gen(function* () {
    const tokenService = yield* InviteTokenService;
    const invitationRepo = yield* InvitationRepo;
    const memberRepo = yield* MemberRepo;
    const userRepo = yield* UserRepo;

    // 1. Validate and decode token
    const tokenData = yield* tokenService.validateInvitationToken(token);

    // 2. Get invitation and verify it's still valid
    const invitation = yield* invitationRepo.findById(tokenData.invitationId);
    if (Option.isNone(invitation)) {
      yield* Effect.fail(
        new InvitationNotFound({
          invitationId: tokenData.invitationId,
        })
      );
    }

    const invite = invitation.value;
    if (invite.status !== "pending") {
      yield* Effect.fail(
        new InvitationAlreadyProcessed({
          status: invite.status,
        })
      );
    }

    if (invite.expiresAt < Date.now()) {
      yield* Effect.fail(
        new InvitationExpired({
          expiredAt: new Date(invite.expiresAt),
        })
      );
    }

    // 3. Handle user context
    let userId: UserId;
    if (acceptingUserId) {
      // User is logged in - verify email matches
      const user = yield* userRepo.findById(acceptingUserId);
      if (Option.isNone(user) || user.value.email !== invite.email) {
        yield* Effect.fail(
          new EmailMismatchError({
            expectedEmail: invite.email,
            actualEmail: user.value?.email,
          })
        );
      }
      userId = acceptingUserId;
    } else {
      // User needs to sign up or log in
      yield* Effect.fail(
        new AuthenticationRequiredError({
          redirectTo: `/invite/${token}`,
        })
      );
    }

    // 4. Add user as member (atomic operation)
    yield* Effect.gen(function* () {
      // Add to organization
      yield* memberRepo.create({
        id: nanoid() as MemberId,
        userId,
        role: invite.role,
        createdAt: Date.now(),
      });

      // Update invitation status
      yield* invitationRepo.updateStatus(invite.id, "accepted");
    }).pipe(Effect.withSpan("InvitationUseCase.acceptInvitation.atomicUpdate"));

    return { success: true, organizationSlug: tokenData.organizationSlug };
  });
```

### Email Templates

#### Invitation Email

```typescript
// Email template using React Email
export function InvitationEmail({
  inviterName,
  organizationName,
  acceptUrl,
  role,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            You're invited to join {organizationName}
          </Heading>

          <Text style={text}>
            {inviterName} has invited you to join {organizationName} as a {role}
            .
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={acceptUrl}>
              Accept Invitation
            </Button>
          </Section>

          <Text style={footer}>
            This invitation will expire in 7 days. If you don't want to receive
            these emails, you can ignore this message.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

## Shopify Integration

The Shopify integration provides secure OAuth flows and store connection management.

### OAuth Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Gateway
    participant ShopifyDO as Shopify OAuth DO
    participant Shopify as Shopify API

    Note over User,Shopify: Install Request
    User->>Frontend: Click "Connect Shopify"
    Frontend->>Gateway: POST /shopify/install
    Gateway->>ShopifyDO: Forward install request

    ShopifyDO->>ShopifyDO: Generate OAuth state
    ShopifyDO->>ShopifyDO: Store state in SQLite
    ShopifyDO->>Shopify: Build authorization URL
    ShopifyDO-->>Gateway: Authorization URL
    Gateway-->>Frontend: Redirect response
    Frontend-->>User: Redirect to Shopify

    Note over User,Shopify: Authorization
    User->>Shopify: Authorize app
    Shopify->>Shopify: User grants permissions
    Shopify-->>Gateway: Callback with auth code

    Note over User,Shopify: Token Exchange
    Gateway->>ShopifyDO: Handle callback
    ShopifyDO->>ShopifyDO: Validate state
    ShopifyDO->>Shopify: Exchange code for token
    Shopify-->>ShopifyDO: Access token

    ShopifyDO->>ShopifyDO: Store access token
    ShopifyDO->>Shopify: Fetch shop info
    Shopify-->>ShopifyDO: Shop details

    ShopifyDO->>Gateway: Update global registry
    Gateway->>Gateway: Record shop connection
    Gateway-->>Frontend: Success redirect
    Frontend-->>User: Connection successful
```

### OAuth State Management

```mermaid
stateDiagram-v2
    [*] --> initiated : Start OAuth
    initiated --> pending : Redirect to Shopify
    pending --> authorized : User authorizes
    pending --> denied : User denies
    pending --> expired : Timeout

    authorized --> token_exchange : Exchange code
    token_exchange --> connected : Token received
    token_exchange --> failed : Exchange failed

    connected --> [*] : Success
    denied --> [*] : User cancelled
    expired --> [*] : Timeout
    failed --> [*] : Error
```

### Implementation Details

#### OAuth Initiation

```typescript
export const initiateShopifyOAuth = (input: OAuthInitiateInput) =>
  Effect.gen(function* () {
    const oauthRepo = yield* ShopifyOAuthRepo;
    const configService = yield* ShopifyConfigService;

    // 1. Validate shop domain
    const shopDomain = yield* validateShopDomain(input.shopDomain);

    // 2. Check if shop is already connected
    const existingConnection = yield* checkExistingConnection(shopDomain);
    if (existingConnection) {
      yield* Effect.fail(
        new ShopAlreadyConnectedError({
          shopDomain,
          connectedToOrganization: existingConnection.organizationSlug,
        })
      );
    }

    // 3. Generate OAuth state and PKCE parameters
    const state = yield* generateSecureState();
    const codeVerifier = yield* generateCodeVerifier();
    const codeChallenge = yield* generateCodeChallenge(codeVerifier);

    // 4. Store OAuth state
    const oauthState = yield* oauthRepo.createState({
      id: nanoid() as OAuthStateId,
      shopDomain,
      organizationSlug: input.organizationSlug,
      state,
      codeVerifier,
      scope: "read_products,write_products,read_orders",
      status: "initiated",
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      createdAt: Date.now(),
    });

    // 5. Build authorization URL
    const authUrl = yield* configService.buildAuthorizationUrl({
      shopDomain,
      clientId: configService.clientId,
      scope: oauthState.scope,
      redirectUri: `${configService.baseUrl}/shopify/callback`,
      state,
      codeChallenge,
      codeChallengeMethod: "S256",
    });

    return { authUrl, state };
  }).pipe(Effect.withSpan("ShopifyOAuth.initiate"));
```

#### OAuth Callback Handling

```typescript
export const handleOAuthCallback = (callbackData: OAuthCallbackData) =>
  Effect.gen(function* () {
    const oauthRepo = yield* ShopifyOAuthRepo;
    const tokenRepo = yield* ShopifyTokenRepo;
    const shopifyAPI = yield* ShopifyAPIClient;
    const globalRepo = yield* GlobalShopConnectionRepo;

    // 1. Validate callback parameters
    const validatedCallback = yield* validateCallbackData(callbackData);

    // 2. Retrieve and validate OAuth state
    const oauthState = yield* oauthRepo.findByState(validatedCallback.state);
    if (Option.isNone(oauthState)) {
      yield* Effect.fail(
        new InvalidOAuthStateError({
          state: validatedCallback.state,
        })
      );
    }

    const state = oauthState.value;
    if (state.status !== "initiated" || state.expiresAt < Date.now()) {
      yield* Effect.fail(
        new OAuthStateExpiredError({
          stateId: state.id,
        })
      );
    }

    // 3. Exchange authorization code for access token
    const tokenResponse = yield* shopifyAPI.exchangeCodeForToken({
      clientId: configService.clientId,
      clientSecret: configService.clientSecret,
      code: validatedCallback.code,
      codeVerifier: state.codeVerifier,
    });

    // 4. Store access token
    const accessToken = yield* tokenRepo.create({
      id: nanoid() as AccessTokenId,
      shopDomain: state.shopDomain,
      organizationSlug: state.organizationSlug,
      accessToken: tokenResponse.accessToken,
      scope: tokenResponse.scope,
      status: "active",
      expiresAt: tokenResponse.expiresAt,
      createdAt: Date.now(),
    });

    // 5. Fetch shop information
    const shopInfo = yield* shopifyAPI.getShopInfo({
      shopDomain: state.shopDomain,
      accessToken: accessToken.accessToken,
    });

    // 6. Update global shop connection registry
    yield* globalRepo.create({
      shopDomain: state.shopDomain,
      organizationSlug: state.organizationSlug,
      type: "shopify",
      status: "active",
      connectedAt: Date.now(),
    });

    // 7. Update OAuth state
    yield* oauthRepo.updateStatus(state.id, "connected");

    return {
      success: true,
      shopDomain: state.shopDomain,
      organizationSlug: state.organizationSlug,
      shopInfo,
    };
  }).pipe(Effect.withSpan("ShopifyOAuth.callback"));
```

## Member Management

Member management handles role-based access control and organization membership.

### Member Lifecycle

```mermaid
graph LR
    INVITED[Invited] --> PENDING[Invitation Pending]
    PENDING --> MEMBER[Active Member]
    PENDING --> EXPIRED[Invitation Expired]
    PENDING --> REVOKED[Invitation Revoked]

    MEMBER --> ROLE_CHANGED[Role Updated]
    ROLE_CHANGED --> MEMBER
    MEMBER --> REMOVED[Removed from Org]

    EXPIRED --> REINVITED[Re-invited]
    REINVITED --> PENDING

    REMOVED --> END[No longer member]
    EXPIRED --> END
    REVOKED --> END
```

### Role-Based Permissions

| Permission                   | Owner | Admin | Member |
| ---------------------------- | ----- | ----- | ------ |
| **Organization Management**  |
| Delete organization          | ✅    | ❌    | ❌     |
| Update organization settings | ✅    | ✅    | ❌     |
| View organization details    | ✅    | ✅    | ✅     |
| **Member Management**        |
| Invite members               | ✅    | ✅    | ❌     |
| Remove members               | ✅    | ✅    | ❌     |
| Change member roles          | ✅    | ✅    | ❌     |
| View member list             | ✅    | ✅    | ✅     |
| **Store Integration**        |
| Connect stores               | ✅    | ✅    | ❌     |
| Disconnect stores            | ✅    | ✅    | ❌     |
| View store data              | ✅    | ✅    | ✅     |

### Role Change Workflow

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant Gateway
    participant OrgDO
    participant TenantDB

    Admin->>Frontend: Change member role
    Frontend->>Gateway: PUT /api/members/:id/role
    Gateway->>Gateway: Validate admin permissions
    Gateway->>OrgDO: Forward role change request

    OrgDO->>TenantDB: Begin transaction
    OrgDO->>TenantDB: Validate member exists
    TenantDB-->>OrgDO: Member found

    OrgDO->>OrgDO: Validate role transition
    OrgDO->>TenantDB: Update member role
    TenantDB-->>OrgDO: Role updated

    OrgDO->>TenantDB: Commit transaction
    TenantDB-->>OrgDO: Transaction committed

    OrgDO-->>Gateway: Role change successful
    Gateway-->>Frontend: Success response
    Frontend-->>Admin: Display confirmation
```

## Error Handling Workflows

The system implements comprehensive error handling with structured error types and recovery strategies.

### Error Categories

```mermaid
graph TD
    ERRORS[Application Errors] --> DOMAIN[Domain Errors]
    ERRORS --> INFRASTRUCTURE[Infrastructure Errors]
    ERRORS --> EXTERNAL[External Service Errors]

    DOMAIN --> VALIDATION[Validation Errors]
    DOMAIN --> BUSINESS[Business Rule Errors]
    DOMAIN --> AUTHORIZATION[Authorization Errors]

    INFRASTRUCTURE --> DATABASE[Database Errors]
    INFRASTRUCTURE --> NETWORK[Network Errors]
    INFRASTRUCTURE --> STORAGE[Storage Errors]

    EXTERNAL --> SHOPIFY_API[Shopify API Errors]
    EXTERNAL --> EMAIL[Email Service Errors]
    EXTERNAL --> AUTH[Auth Provider Errors]
```

### Error Recovery Patterns

#### Retry with Exponential Backoff

```typescript
export const retryWithBackoff = <A, E>(
  effect: Effect.Effect<A, E>,
  maxRetries: number = 3
) =>
  effect.pipe(
    Effect.retry({
      times: maxRetries,
      delay: (attempt) => `${Math.pow(2, attempt) * 1000}ms`,
    }),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError("Operation failed after retries", { error });
        return yield* Effect.fail(error);
      })
    )
  );
```

#### Graceful Degradation

```typescript
export const getOrganizationWithFallback = (slug: OrganizationSlug) =>
  Effect.gen(function* () {
    // Try primary data source
    const primary = yield* orgRepo
      .findBySlug(slug)
      .pipe(Effect.catchAll(() => Effect.succeed(Option.none())));

    if (Option.isSome(primary)) {
      return primary.value;
    }

    // Fallback to cached data
    const cached = yield* cacheService
      .get(`org:${slug}`)
      .pipe(Effect.catchAll(() => Effect.succeed(Option.none())));

    if (Option.isSome(cached)) {
      yield* Effect.logWarning("Using cached organization data", { slug });
      return cached.value;
    }

    // Final fallback
    yield* Effect.fail(new OrganizationNotFound({ slug }));
  });
```

## Background Processes

### Cleanup and Maintenance

```mermaid
graph TD
    SCHEDULER[Background Scheduler] --> EXPIRED_INVITES[Clean Expired Invitations]
    SCHEDULER --> ORPHANED_SESSIONS[Remove Orphaned Sessions]
    SCHEDULER --> METRICS[Collect Metrics]
    SCHEDULER --> HEALTH_CHECKS[Health Checks]

    EXPIRED_INVITES --> UPDATE_STATUS[Update to 'expired']
    ORPHANED_SESSIONS --> DELETE_SESSIONS[Delete from D1]
    METRICS --> ANALYTICS[Send to Analytics Engine]
    HEALTH_CHECKS --> ALERTS[Send Alerts if Needed]
```

### Scheduled Tasks

#### Invitation Cleanup

```typescript
// Scheduled function (could be implemented with Cloudflare Cron Triggers)
export const cleanupExpiredInvitations = () =>
  Effect.gen(function* () {
    const invitationRepo = yield* InvitationRepo;
    const now = Date.now();

    // Find all expired pending invitations
    const expiredInvitations = yield* invitationRepo.findExpired(now);

    // Update status to expired
    yield* Effect.all(
      expiredInvitations.map((invitation) =>
        invitationRepo.updateStatus(invitation.id, "expired")
      ),
      { concurrency: 5 }
    );

    yield* Effect.logInfo("Cleaned up expired invitations", {
      count: expiredInvitations.length,
    });
  }).pipe(Effect.withSpan("BackgroundTask.cleanupExpiredInvitations"));
```

---

**Next**: [API Documentation](../api/README.md)
