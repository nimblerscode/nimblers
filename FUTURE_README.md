# RedwoodSDK Example: Nimblers Gateway (Future README)

## 1. Project Title & Description

- **Elevator Pitch:** Nimblers Gateway provides the core API routing, authentication, and data persistence layer for the Nimblers platform, managing organization state and user sessions.
- **Core Responsibilities:** Handles incoming HTTP requests, routes them to appropriate handlers or Durable Objects, manages user sessions (potentially using KV or signed cookies), interacts with D1 for relational data via Drizzle ORM, and utilizes Durable Objects for coordinating organization-specific state.

## 2. Table of Contents

- (Link to Section 1)
- (Link to Section 3)
- ...

## 3. Tech Stack & Architecture

- **Frameworks/Languages:** RedwoodSDK, TypeScript
- **Platform:** Cloudflare Workers
- **Routing:** RedwoodSDK Router (`src/worker/routes.ts`)
- **Data Persistence:**
  - Cloudflare D1 (Relational data via Drizzle ORM)
  - Cloudflare Workers KV (Optional: Session tokens, config)
  - Cloudflare Durable Objects (Organization state, e.g., `OrganizationDurableObject`)
- **ORM:** Drizzle ORM
- **Bundling/Dev:** Vite
- **Testing:** Vitest
- **Formatting/Linting:** Biome
- **(Optional) Architecture Diagram:**
  ```mermaid
  graph LR
      A[Client Request] --> B(Cloudflare Worker);
      B --> C{RedwoodSDK Router};
      C -- Route Match --> D[Route Handler / Server Component];
      D --> E[Durable Object (Org State)];
      D --> F[D1 Database (via Drizzle)];
      D --> G[Workers KV (Sessions/Config)];
      E --> F;
      D --> H[Response];
      B --> H;
  ```

## 4. Prerequisites

- Node.js (v18+ recommended)
- `pnpm` (or `npm`/`yarn`)
- Cloudflare Account
- Wrangler CLI (`npm install -g wrangler`)
- **(Optional) VSCode Extensions:**
  - Biome
  - SQLite Viewer / Better SQLite
  - Cloudflare Workers

## 5. Getting Started / Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url> nimblers-gateway
    cd nimblers-gateway
    ```
2.  **Install dependencies:**
    ```bash
    pnpm install
    ```
3.  **Configure environment variables:**
    - Copy `.dev.vars.example` to `.dev.vars` (for local development).
    - Copy `.env.example` to `.env` (potentially for build/deployment secrets, though `.dev.vars` is preferred locally).
    - Fill in the required values:
      ```text
      # .dev.vars / .env
      CLOUDFLARE_ACCOUNT_ID=YOUR_CLOUDFLARE_ACCOUNT_ID
      CLOUDFLARE_API_TOKEN=YOUR_CLOUDFLARE_API_TOKEN # Needs D1:Edit, Workers:Edit perms
      SESSION_SECRET=generate-a-strong-random-secret # For session management
      D1_DATABASE_ID=YOUR_D1_DATABASE_ID
      # Add any other necessary vars
      ```

## 6. Local Development

1.  **Start the development server:**

    ```bash
    pnpm dev
    ```

    This command uses `wrangler dev` internally, which:

    - Starts the Vite dev server for frontend assets.
    - Runs your Cloudflare Worker locally.
    - Simulates D1 using a local SQLite file (`.wrangler/state/d1/DB.sqlite`).
    - Simulates KV and Durable Objects in memory.

2.  **Database Migrations (Drizzle):**

    - Modify your database schema in `src/infra/drizzle/schema.ts` (or relevant schema files).
    - Generate a new migration file:
      ```bash
      pnpm migrate:new YourMigrationName # Creates a file in drizzle/gateway/migrations
      ```
    - Apply migrations to your local D1 database:
      ```bash
      pnpm migrate:dev
      ```

3.  **Interacting with Durable Objects:** Your DOs (`OrganizationDurableObject`) will be instantiated locally as needed when their routes are hit during `pnpm dev`.

## 7. Testing

- **Run unit/integration tests:**
  ```bash
  pnpm test
  ```
- **Check for linting/formatting issues:**
  ```bash
  pnpm lint
  ```
- **Apply automatic formatting:**
  ```bash
  pnpm format
  ```

## 8. Deployment

1.  **Ensure `wrangler.jsonc` is configured:**
    - Verify the `name`, `main` entrypoint.
    - Confirm `d1_databases` bindings have the correct `database_id` for production.
    - Confirm `durable_objects` bindings list the correct `class_name`.
    - Set up `routes` or `workers_dev` for your production environment.
    - Add any necessary production `vars` (though using secrets is preferred: `wrangler secret put VAR_NAME`).
2.  **Apply migrations to production D1 (if needed):**
    ```bash
    pnpm migrate:prod
    ```
3.  **Deploy the Worker:**
    ```bash
    pnpm deploy
    ```

## 9. Project Structure

```plaintext
nimblers-gateway/
├── .github/          # GitHub Actions workflows
├── .wrangler/        # Local development state (ignored by git)
├── dist/             # Build output (ignored by git)
├── drizzle/          # Drizzle migration files
│   └── gateway/      # Migrations specific to the gateway DB
├── node_modules/     # Project dependencies (ignored by git)
├── public/           # Static assets served by the Worker
├── src/
│   ├── app/          # RedwoodSDK frontend components, pages, server functions
│   ├── core/         # Core business logic, types, shared utilities
│   ├── infra/        # Infrastructure-related code (Drizzle schema, configs)
│   │   └── drizzle/  # Drizzle schema definitions
│   ├── legacy/       # (If applicable) Older code being phased out
│   ├── test/         # Vitest test files
│   └── worker/       # Cloudflare Worker specific code
│       ├── durable-objects/ # Durable Object class definitions
│       ├── organization/    # Logic related to organizations (could be in core/)
│       ├── index.ts       # Main Worker entry point (using defineApp)
│       └── routes.ts      # RedwoodSDK route definitions for the worker
├── types/            # Custom type definitions
├── .dev.vars         # Local environment variables (ignored by git)
├── .editorconfig     # Editor configuration
├── .env.example      # Example environment variables
├── .gitignore        # Git ignore rules
├── biome.json        # Biome formatter/linter configuration
├── drizzle.config.*.ts # Drizzle configuration files
├── package.json      # Project metadata and dependencies
├── pnpm-lock.yaml    # Lockfile for pnpm
├── README.md         # This file
├── tsconfig.json     # TypeScript configuration
├── vite.config.mts   # Vite configuration
├── vitest.config.ts  # Vitest configuration
└── wrangler.jsonc    # Cloudflare Worker configuration
```

- `src/worker`: Handles incoming requests, routing, and integrates with CF platform features.
- `src/app`: Contains the RedwoodSDK application code (UI components, server functions).
- `src/core`: Shared business logic, types, and utilities independent of Worker/UI.
- `src/infra`: Infrastructure setup like database schema.
- `drizzle`: Stores SQL migration files generated by Drizzle.

## 10. Configuration

- **`wrangler.jsonc`:** Defines Worker name, entry point, compatibility settings, bindings (D1, DO, KV, Assets), environment variables (`vars`), and deployment routes.
- **`drizzle.config.*.ts`:** Configures Drizzle Kit for migrations, specifying schema location and output directory.
- **`tsconfig.json`:** TypeScript compiler options.
- **`vite.config.mts`:** Vite build/dev server configuration.
- **`biome.json`:** Formatter and linter rules.

## 11. Environment Variables & Secrets

- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID (used by Wrangler).
- `CLOUDFLARE_API_TOKEN`: API token for Wrangler to interact with Cloudflare API (D1, Workers deployment).
- `SESSION_SECRET`: A long, random string used for signing/encrypting session data.
- `D1_DATABASE_ID`: The ID of your Cloudflare D1 database (used by Drizzle config for migrations).
- **(Production):** Use `wrangler secret put VAR_NAME` for sensitive production variables instead of committing them or putting them in `vars` in `wrangler.jsonc`.

## 12. Contributing

- Follow conventional commit guidelines for commit messages.
- Create feature branches off `main` (e.g., `feat/add-user-profile`).
- Run `pnpm format` and `pnpm lint` before committing.
- Open Pull Requests against `main`.

## 13. Troubleshooting & FAQ

- **Error: D1_ERROR: No database specified.** Ensure `D1_DATABASE_ID` is set correctly in `.dev.vars` and referenced in `drizzle.config.*.ts`.
- **Error: Durable Object not found.** Double-check the `class_name` in `wrangler.jsonc` matches your DO class, and ensure migrations including `new_sqlite_classes` (if using DO state) have run.
- **How to reset local DB?** Delete the `.wrangler/state/d1/DB.sqlite` file and re-run `pnpm migrate:dev`.

## 14. Further Reading & Links

- [RedwoodSDK Documentation](https://redwoodjs.com/docs/sdk)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Vite Documentation](https://vitejs.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Biome Documentation](https://biomejs.dev/)

## 15. License

- (Specify your project's license, e.g., MIT, Apache 2.0)
