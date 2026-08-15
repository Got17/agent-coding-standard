# Next.js Frontend Structure Standard

> Copy this block into a Next.js frontend project's `AGENTS.md` when the project uses the App Router.

<!-- AI-COPY-BLOCK
NON-NEGOTIABLE NEXT.JS STRUCTURE RULES (enforce every PR):
1. Use the App Router under `src/app` for new projects. Keep root config files at the project root and application source under `src/`.
2. Treat route folders as URL structure, not as dumping grounds. Public routes exist only when a segment contains `page.tsx` or `route.ts`.
3. Use route groups like `(marketing)`, `(app)`, and `(auth)` to organize sections without changing URLs. Use private folders like `_components`, `_lib`, and `_actions` for segment-local implementation details.
4. Keep shared cross-route code outside `app` under `src/components`, `src/features`, `src/lib`, `src/hooks`, `src/styles`, and `src/types`.
5. Default to Server Components. Add `"use client"` only for components that need state, effects, event handlers, or browser-only APIs.
6. Keep server-only data access in `src/server` or route-local `_data` modules and guard it with `import "server-only"`. Client Components MUST NOT import server-only modules.
7. Put mutations in Server Actions or Route Handlers, validate inputs on the server, and revalidate/update cache intentionally after writes.
8. Do not call internal Route Handlers from Server Components. Server Components should call server-side data functions directly.
9. Use `loading.tsx`, `error.tsx`, `not-found.tsx`, and Suspense boundaries at route segments where users need responsive loading and recovery states.
10. Store public assets in `public/`; use Metadata API files/functions for titles, descriptions, icons, Open Graph images, sitemaps, and robots metadata.
11. Environment variables without `NEXT_PUBLIC_` are server-only. Never read secrets in Client Components or browser-executed modules.
12. Production CI MUST run typecheck, lint, tests, and `next build`; performance-sensitive changes SHOULD run bundle analysis and Web Vitals checks.
-->

<!-- START AGENT-STANDARD: FRONTEND-NEXTJS-STRUCTURE -->

## Next.js App Router Structure Rules
- [ ] Use `src/app` for routes and route-level UI.
- [ ] Keep route groups in parentheses for organization without URL impact.
- [ ] Keep private route implementation folders prefixed with `_`.
- [ ] Keep reusable UI in `src/components` and domain feature code in `src/features`.
- [ ] Keep server-only code in `src/server` or route-local `_data` modules with `import "server-only"`.
- [ ] Use Server Components by default and Client Components only at explicit interaction boundaries.
- [ ] Use route segment files (`layout`, `page`, `loading`, `error`, `not-found`, `route`) according to their framework role.
- [ ] Keep API contracts, validation schemas, and server mutations near the feature that owns them.
- [ ] Verify production readiness with `next build`, linting, typechecking, tests, and bundle/performance checks.

<!-- END AGENT-STANDARD: FRONTEND-NEXTJS-STRUCTURE -->

---

## Detailed Human Guide & Rationale

### 1. Recommended Project Layout

Use this structure for a production Next.js App Router frontend:

```text
project-root/
  next.config.ts
  package.json
  tsconfig.json
  eslint.config.mjs
  middleware.ts
  instrumentation.ts
  public/
    images/
    icons/
  src/
    app/
      layout.tsx
      page.tsx
      globals.css
      not-found.tsx
      global-error.tsx
      (marketing)/
        layout.tsx
        page.tsx
        pricing/
          page.tsx
      (auth)/
        sign-in/
          page.tsx
        sign-up/
          page.tsx
      (app)/
        layout.tsx
        dashboard/
          page.tsx
          loading.tsx
          error.tsx
          _components/
            dashboard-shell.tsx
          _data/
            get-dashboard.ts
          _actions/
            update-dashboard.ts
      api/
        webhooks/
          stripe/
            route.ts
    components/
      ui/
      layout/
      forms/
    features/
      account/
        components/
        hooks/
        schemas/
        types.ts
      billing/
        components/
        actions.ts
        schemas.ts
        types.ts
    lib/
      env.ts
      routes.ts
      fetcher.ts
      utils.ts
    server/
      auth.ts
      db.ts
      repositories/
      services/
    hooks/
    styles/
    types/
```

This layout follows official Next.js conventions while adding production boundaries. The official docs list `app`, `pages`, `public`, and optional `src` as top-level folders, and state that `src` can hold application code, including `app`, while root configuration files remain at the project root. See [Project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure).

### 2. App Router As The Default

For new projects, use the App Router unless the project is maintaining legacy Pages Router code. The App Router is the file-system router built around React Server Components, Suspense, and Server Functions. See [Next.js App Router](https://nextjs.org/docs/app).

Keep the App Router responsible for:

- URL routes.
- Route segment layouts.
- Route-specific loading and error states.
- Metadata.
- Route Handlers where the browser or an external service needs an HTTP endpoint.

Do not turn `app` into a global kitchen sink. If code is shared across many routes, put it outside `app`.

### 3. Route Segments, Route Groups, And Private Folders

Next.js maps nested folders under `app` to route segments, but a folder becomes publicly routable only when it contains `page.tsx` or `route.ts`. This makes colocation safe by default. See [Project structure: Colocation](https://nextjs.org/docs/app/getting-started/project-structure#colocation).

Use these conventions:

- `page.tsx`: route UI.
- `layout.tsx`: shared UI for a route segment and its children.
- `loading.tsx`: Suspense fallback for a segment.
- `error.tsx`: segment error boundary.
- `not-found.tsx`: segment 404 UI.
- `route.ts`: HTTP Route Handler.
- `(group)`: organize routes without changing the URL.
- `_folder`: mark implementation details as private and opted out of routing.

Route groups are useful for sections such as `(marketing)`, `(auth)`, `(dashboard)`, or `(admin)` because folders in parentheses do not affect the URL. Private folders are useful for segment-local UI, data functions, actions, and tests. The official docs describe both route groups and private folders as project organization features. See [Route groups and private folders](https://nextjs.org/docs/app/getting-started/project-structure#route-groups-and-private-folders).

### 4. Server Components And Client Components

Layouts and pages are Server Components by default in the App Router. Use Server Components for data fetching, access to server-side resources, and reducing client JavaScript. Use Client Components only for state, effects, event handlers, and browser-only APIs such as `window`, `localStorage`, or geolocation. See [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components).

Rules:

- Put `"use client"` at the smallest interactive boundary.
- Do not add `"use client"` to full pages or layouts unless the whole segment truly needs browser interactivity.
- Pass serializable props from Server Components to Client Components.
- Keep client-only hooks under `src/hooks` or feature-local `hooks`.
- Guard server-only modules with `import "server-only"` when they access secrets, databases, private API tokens, or privileged SDKs.

### 5. Feature Modules

Use `src/features/<feature>` for domain-oriented frontend slices that cross multiple routes:

```text
src/features/billing/
  components/
  actions.ts
  queries.ts
  schemas.ts
  types.ts
  permissions.ts
```

Feature modules should contain UI and client/server orchestration for one product capability. Shared design-system components stay in `src/components/ui`; feature-specific components stay in the feature or route segment that owns them.

Avoid vague folders:

```text
src/utils/
src/common/
src/helpers/
src/services/
```

Prefer names that reveal ownership: `billing`, `account`, `search`, `checkout`, `analytics`, `auth`.

### 6. Data Fetching And Mutations

Fetch data in Server Components whenever possible. The official docs state that Server Components can fetch with `fetch` or direct server-side resources, and that identical `fetch` requests in a React component tree are memoized by default. See [Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data).

Rules:

- Server Components call server-side data functions directly.
- Client Components use Route Handlers only when they truly need a browser-callable endpoint.
- Do not call your own Route Handlers from Server Components; that adds an unnecessary HTTP hop. Next's production guide explicitly recommends using Route Handlers for Client Components and avoiding internal Route Handler calls from Server Components. See [Production checklist](https://nextjs.org/docs/app/guides/production-checklist).
- Mutations belong in Server Actions or Route Handlers depending on caller and integration needs.
- Validate every mutation payload on the server.
- Revalidate paths/tags or update caches intentionally after writes.
- Keep request deduping, cache lifetime, and revalidation policy visible near the data function.

### 7. Backend-For-Frontend Boundary

When the frontend needs to protect secrets, normalize backend APIs, or call privileged services, use a server-only Backend-for-Frontend boundary:

```text
src/server/
  auth.ts
  api-client.ts
  repositories/
  services/
```

Client Components must never import `src/server`. Route Handlers may use `src/server` when they expose browser-callable or third-party-callable endpoints. Server Components may call `src/server` directly.

Next.js documents that Server Components cover most data-fetching needs, while client-side fetching is still useful for client-only Web APIs and frequently polled data; it also notes that Server Actions are primarily for mutations and are queued, so using them for data fetching creates sequential execution. See [Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend).

### 8. UI And Styling Structure

Recommended UI boundaries:

- `src/components/ui`: reusable primitive components such as Button, Dialog, Input, Tabs.
- `src/components/layout`: shell-level reusable layout components.
- `src/features/<feature>/components`: feature-owned components.
- `src/app/**/_components`: route-owned components that should not be reused elsewhere yet.
- `src/styles`: global styling, tokens, and framework-level CSS organization.

Keep presentational components pure. Move data fetching, URL state, and mutations into Server Components, feature hooks, Server Actions, or route-local data modules.

### 9. Metadata, Assets, And Environment

Use `public/` for static assets served directly. Use Next.js metadata conventions and APIs for titles, descriptions, icons, Open Graph/Twitter images, sitemap, and robots metadata. The project structure docs list metadata file conventions and `public` as the static asset folder. See [Project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure).

Environment rules:

- `.env*` files must not be committed.
- Only variables prefixed with `NEXT_PUBLIC_` may be intentionally exposed to browser bundles.
- Validate environment variables in one server-only module, for example `src/lib/env.ts` or `src/server/env.ts`.
- Never import server environment validation into Client Components.

### 10. Production Readiness

Next.js production guidance emphasizes routing/rendering choices, data fetching and caching, UI/accessibility, security, metadata, type safety, Core Web Vitals, and bundle analysis. See [Production checklist](https://nextjs.org/docs/app/guides/production-checklist).

Minimum CI:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Recommended additions:

- Playwright or Cypress smoke tests for critical flows.
- Testing Library component tests for shared UI and feature states.
- Bundle analyzer on dependency-heavy PRs.
- Lighthouse or Web Vitals checks for key routes.
- Visual regression checks for shared UI and design-token changes.

## Evidence

- [Project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure) — official Next.js App Router structure docs, last updated March 25, 2026; supports `src`, `app`, route files, route groups, private folders, and colocation rules.
- [Next.js App Router](https://nextjs.org/docs/app) — official App Router overview, last updated March 25, 2026; establishes App Router as the React Server Components/Suspense/Server Functions router.
- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — official Next.js docs, last updated March 16, 2026; explains Server Component defaults, `"use client"` boundaries, serializable props, and `server-only`.
- [Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data) — official Next.js docs, last updated March 25, 2026; supports server-side fetching, streaming, Suspense, and client-side fetching guidance.
- [Updating Data](https://nextjs.org/docs/app/getting-started/updating-data) — official Next.js docs, last updated February 27, 2026; defines Server Functions and Server Actions for mutations.
- [Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend) — official Next.js guide; clarifies when client-side fetching is needed and why Server Actions should not be used for normal data fetching.
- [Production checklist](https://nextjs.org/docs/app/guides/production-checklist) — official Next.js production guidance, last updated February 27, 2026; supports build, routing, caching, accessibility, security, metadata, type safety, Web Vitals, and bundle analysis checks.

## Notes

This standard assumes a new App Router project. For legacy Pages Router projects, keep `pages/` conventions isolated and do not mix routing models casually. If a migration is in progress, document which routes still live in `pages/` and which product areas have moved to `app/`.
