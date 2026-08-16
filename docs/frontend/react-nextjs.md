# React & Next.js Production Standard

> Copy this block into a React & Next.js frontend project's `AGENTS.md`.

```markdown
<!-- AI-COPY-BLOCK
NON-NEGOTIABLE REACT & NEXT.JS PRODUCTION RULES (enforce every PR):
1. Default to React Server Components (RSC) under `src/app`. Add `"use client"` only at explicit interaction boundaries (state, hooks, event listeners, browser-only APIs).
2. Never import server-only code (DB drivers, private secrets, internal SDKs) into Client Components; guard server-only modules with `import "server-only"`.
3. Organize routes with route groups `(marketing)`, `(app)`, `(auth)` and mark non-routable private folders with `_` prefixes (`_components`, `_data`, `_actions`).
4. Fetch data in Server Components or dedicated server queries. Do NOT call internal Route Handlers from Server Components — access server-side data directly.
5. Mutate state using Server Actions or Route Handlers; validate all mutation payloads on the server using Zod/Valibot schemas before executing business logic.
6. Decouple server data from client UI state. Use URL search parameters for shareable page state and TanStack Query / SWR for client-side server cache. Never duplicate server props into local `useState`.
7. Enforce metadata and SEO using Next.js Metadata API (`export const metadata` or `generateMetadata`); static assets belong in `public/`.
8. Enforce security: pass only serializable, non-sensitive props from RSC to Client Components. Keep secrets in server environment variables without `NEXT_PUBLIC_`.
9. Enforce Core Web Vitals targets (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1). Use Next.js `<Image>`, `<Font>`, and dynamic imports for heavy components.
10. CI MUST run typechecking (`tsc --noEmit`), linting (`eslint`), unit/component tests, and `next build` before deployment.

<!-- START AGENT-STANDARD: FRONTEND-REACT-NEXTJS -->
## React & Next.js Production Rules
- [ ] Default to React Server Components (RSC) and place `"use client"` at the lowest interactive component subtree.
- [ ] Guard server-only modules using `import "server-only"` to prevent secret leaks in client bundles.
- [ ] Structure App Router using route groups `(group)` and private implementation folders `_folder`.
- [ ] Call data-layer functions directly in Server Components — do not execute HTTP hops to internal Route Handlers.
- [ ] Validate Server Action inputs on the server using Zod/Valibot before mutating state or database records.
- [ ] Decouple server state from client UI state; store shareable UI state in URL search params.
- [ ] Implement SEO and Open Graph metadata using Next.js Metadata API (`metadata` / `generateMetadata`).
- [ ] Keep non-public environment variables un-prefixed and isolated to server execution contexts.
- [ ] Optimize images, fonts, and scripts using `next/image`, `next/font`, and dynamic code-splitting (`next/dynamic`).
- [ ] Validate production readiness in CI using typechecking, linting, component tests (React Testing Library), and `next build`.
<!-- END AGENT-STANDARD: FRONTEND-REACT-NEXTJS -->
-->
```

---

## Detailed Human Guide & Rationale

### 1. React Server Components (RSC) vs Client Components

React Server Components (RSC) decouple rendering execution by allowing components to execute exclusively on the server, generating HTML and a streamable binary JSON-like payload (RSC payload) sent to the client. Client Components execute on the server during initial HTML generation and hydrate in the browser to enable interactivity, state, and browser APIs.

#### Key Invariants

1. **Default to Server Components**: Every component inside `src/app` (pages, layouts, sections) is a Server Component by default. Server Components carry zero client JavaScript bundle impact.
2. **Explicit Client Boundaries**: Place the `'use client'` directive at the top of the file only at leaf interactive boundaries (e.g., buttons with event handlers, forms with local interactive state, components using hooks like `useState`, `useReducer`, or `useEffect`, or components calling browser-only APIs such as `window` or `localStorage`).
3. **Serializable Props Boundary**: Props passed from a Server Component to a Client Component MUST be serializable by React (primitives, plain objects, arrays, Promises, JSX elements, or Server Actions). Functions, class instances, Symbols, and complex non-serializable objects cannot cross this boundary.
4. **Server-Only Module Protection**: Modules containing sensitive server logic, database clients, or un-prefixed environment variables must import `server-only` (`import "server-only";`). If a Client Component inadvertently imports a module guarded by `server-only`, the build compiler throws an explicit build-time error.

#### Example: Server Component and Client Component Boundary

```tsx
// src/server/db/users.ts
import "server-only"; // Guarantees this module cannot be imported by Client Components
import { db } from "@/server/db";

export async function getUserProfile(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true }, // Select non-sensitive fields only
  });
}
```

```tsx
// src/app/(app)/dashboard/_components/user-profile-card.tsx
"use client";

import { useState, useTransition } from "react";

interface UserProfileCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onUpdateRole: (userId: string, newRole: string) => Promise<{ success: boolean; error?: string }>;
}

export function UserProfileCard({ user, onUpdateRole }: UserProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Do NOT duplicate server prop (user.role) into persistent state.
  // Draft state exists only during active edit mode.
  const [draftRole, setDraftRole] = useState<string | null>(null);

  const activeRole = draftRole ?? user.role;

  function handleSaveRole() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await onUpdateRole(user.id, activeRole);
        if (res.success) {
          setIsEditing(false);
          setDraftRole(null);
        } else {
          setError(res.error || "Failed to update role");
        }
      } catch (err) {
        setError("An unexpected network error occurred.");
      }
    });
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold">{user.name}</h3>
      <p className="text-sm text-gray-600">{user.email}</p>
      
      {error && <div className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">{error}</div>}

      {isEditing ? (
        <div className="mt-2 flex items-center space-x-2">
          <select
            value={activeRole}
            onChange={(e) => setDraftRole(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleSaveRole}
            disabled={isPending}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setDraftRole(null);
              setError(null);
            }}
            className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center">
          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
            {user.role}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            className="ml-4 px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Edit Role
          </button>
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/app/(app)/dashboard/page.tsx (Server Component)
import { getUserProfile } from "@/server/db/users";
import { updateUserRoleAction } from "../_actions/update-user-role";
import { UserProfileCard } from "./_components/user-profile-card";
import { notFound } from "next/navigation";

export default async function DashboardPage() {
  const user = await getUserProfile("user_123");
  if (!user) notFound();

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">User Dashboard</h1>
      {/* Passing serializable user object and bound Server Action */}
      <UserProfileCard user={user} onUpdateRole={updateUserRoleAction} />
    </main>
  );
}
```

---

### 2. App Router Architecture & Code Organization

The Next.js App Router uses file-system routing under `src/app`. Folder structures represent URL segments, but files inside folders determine page routing and layout composition.

#### Core Organization Principles

1. **Route Groups `(group)`**: Use parenthesis-enclosed folders to logically group routes (e.g. `(marketing)`, `(auth)`, `(app)`) without introducing extra URL paths. This enables separate layout hierarchies (e.g. marketing layout vs dashboard layout).
2. **Private Folders `_folder`**: Use underscore-prefixed folders to opt implementation details out of routing. Route-local components (`_components`), data helpers (`_data`), Server Actions (`_actions`), and hooks (`_hooks`) stay colocated with the route.
3. **Global Shared Modules**: Shared UI primitives belong in `src/components/ui`, domain feature slices in `src/features/<feature>`, server-only logic in `src/server`, and domain utilities in `src/lib`.
4. **Standard File Conventions**:
   - `page.tsx`: Route UI entry point.
   - `layout.tsx`: Shared UI surrounding child segments. Retains state across navigation.
   - `loading.tsx`: Instant Suspense fallback UI for streamable route content.
   - `error.tsx`: React Error Boundary for segment-level runtime exceptions (MUST be `'use client'`).
   - `global-error.tsx`: Root error boundary replacing root layout during critical rendering failures (MUST explicitly render custom `<html>` and `<body>` tags).
   - `not-found.tsx`: 404 UI triggered by `notFound()`.
   - `route.ts`: HTTP API Route Handler endpoint.
5. **Root Configuration Files**:
   - `middleware.ts`: Edge runtime routing and authentication guard. Placed inside `src/` (`src/middleware.ts`) when using a `src/` layout, or at project root if `src/` is omitted. MUST NOT execute heavy database ORM operations (Edge runtime memory/I/O limits).
   - `instrumentation.ts`: Server startup hook used for initializing OpenTelemetry and observability SDKs. Placed inside `src/` (`src/instrumentation.ts`) when using `src/`, or at project root.

#### Recommended Directory Layout

```text
src/
  middleware.ts
  instrumentation.ts
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
      layout.tsx
      sign-in/
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
          get-dashboard-data.ts
        _actions/
          update-dashboard-settings.ts
    api/
      webhooks/
        stripe/
          route.ts
  components/
    ui/
      button.tsx
      dialog.tsx
      input.tsx
    layout/
      header.tsx
      footer.tsx
  features/
    billing/
      components/
      actions.ts
      queries.ts
      schemas.ts
      types.ts
  lib/
    env/
      server.ts
      client.ts
    utils.ts
  server/
    auth.ts
    db.ts
    repositories/
```

#### Error Boundary Telemetry Example (`error.tsx`)

```tsx
// src/app/(app)/dashboard/error.tsx
"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Forward route error to central observability platform
    console.error("Dashboard route error:", error);
    // Mandatory error boundary telemetry emission via SDK module import
    Sentry.captureException(error, {
      extra: { digest: error.digest },
    });
  }, [error]);

  function handleReset() {
    startTransition(() => {
      router.refresh(); // Refresh Server Components to recover from transient server failures
      reset();
    });
  }

  return (
    <div className="p-6 text-center rounded-lg bg-red-50 border border-red-200">
      <h2 className="text-xl font-semibold text-red-800">Something went wrong!</h2>
      <p className="mt-2 text-sm text-red-600">
        {error.message || "An unexpected error occurred while loading dashboard data."}
      </p>
      <button
        onClick={handleReset}
        disabled={isPending}
        className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? "Retrying..." : "Try Again"}
      </button>
    </div>
  );
}
```

---

### 3. Server Actions & Data Fetching

Data fetching and mutations in the App Router leverage React Server Components, Server Functions / Actions, and Next.js caching primitives.

#### Data Fetching & API Security Rules

1. **Direct Data Access in RSC**: Server Components call database repositories, ORMs, or server services directly via async functions.
2. **No Self-HTTP Hops**: Server Components MUST NOT issue `fetch()` calls to internal App Router Route Handlers (`/api/*`). Calling internal endpoints introduces an unnecessary network loopback hop, adds serialization overhead, and can exhaust server connection pools.
3. **Route Handlers & Anti-CSRF Protection**: Use Route Handlers (`route.ts`) only when browser client components need external HTTP endpoints or third-party webhooks require dedicated paths. State-changing non-GET mutations in Route Handlers MUST enforce origin checks (`Origin` / `Referer` verification or W3C Fetch Metadata `Sec-Fetch-Site`) or double-submit anti-CSRF headers.
4. **W3C Trace Context Propagation & 5-Key Error Envelope**:
   - Client fetch requests and server handlers MUST propagate the W3C `traceparent` header to maintain distributed tracing across boundaries.
   - Route Handlers MUST format all application failure responses using the standard flat 5-key JSON error envelope (`code`, `message`, `details`, `timestamp`, `request_id`).

#### Server Actions & Mutation Rules

1. **Explicit Server Directives**: Server Actions MUST be marked with `'use server'` either at top-of-file (for dedicated action files) or inline inside an async function.
2. **Zero-Trust Input Validation**: Treat every Server Action parameter as untrusted input. Validate all incoming action arguments using Zod or Valibot schemas before performing business logic or database writes.
3. **Authorization Verification**: Server Actions are public POST HTTP endpoints under the hood. Always verify user authentication and resource authorization (BOLA/IDOR checks) inside the action execution body.
4. **Targeted Cache Revalidation**: After successful mutations, purge relevant server caches using `revalidatePath('/dashboard')` or `revalidateTag('user-posts')` to guarantee UI freshness.

#### Example: Validated Server Action with Cache Revalidation

```typescript
// src/features/account/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getAuthenticatedUser } from "@/server/auth";

const UpdateNameSchema = z.object({
  name: z.string().min(2).max(50),
});

export async function updateUserNameAction(formData: FormData) {
  // 1. Authenticate requester
  const currentUser = await getAuthenticatedUser();
  if (!currentUser) {
    return {
      success: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "User session required",
        details: null,
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      },
    };
  }

  // 2. Validate input schema
  const rawData = {
    name: formData.get("name"),
  };
  const parsed = UpdateNameSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Invalid account update parameters",
        details: parsed.error.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      },
    };
  }

  // 3. Authorize ownership (derive target user ID from authenticated session context to prevent BOLA)
  const userId = currentUser.id;

  // 4. Perform database update wrapped in try/catch for unexpected DB exceptions
  try {
    await db.user.update({
      where: { id: userId },
      data: { name: parsed.data.name },
    });
  } catch (err) {
    console.error("Failed to update user name:", err);
    return {
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "An error occurred while updating account settings.",
        details: null,
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID(),
      },
    };
  }

  // 5. Revalidate route cache
  revalidatePath("/dashboard/settings");

  return { success: true, error: null };
}
```

---

### 4. State Management (Server State vs Client UI State)

Production Next.js applications maintain a strict separation between Server State (cached data originating from backend databases or APIs) and Client UI State (interactive browser state).

#### State Classification Rules

1. **Server State**: Managed on the server via Server Components or on the client using specialized caching libraries (TanStack Query / SWR) when polling or client-side caching is required.
2. **Client UI State**: Ephemeral UI interactive state (open dropdowns, modal visibility, active tab toggles) managed via local `useState`, `useReducer`, or lightweight global stores (Zustand).
3. **Zero State Duplication**: Do NOT copy server data props directly into client component `useState` (e.g., `const [user, setUser] = useState(props.user)`). Copying server props causes state desynchronization during server revalidations and hydration mismatches.
4. **URL as Authoritative State**: Shareable UI parameters (search queries, pagination offsets, filter chips, sorting parameters) SHOULD be bound directly to URL search parameters (`useSearchParams`, `useRouter`). This ensures shareable deep links, back/forward navigation support, and SSR compatibility.
5. **Debouncing & Suspense Boundaries for `useSearchParams`**:
   - Updates to URL search parameters MUST be debounced (e.g. 300ms delay) to prevent sending a `router.push()` network request per keystroke.
   - Any Client Component calling `useSearchParams()` MUST be wrapped in a `<Suspense>` boundary on the parent Server Component page to prevent Next.js from de-optimizing the entire segment to client-only rendering during production builds.

#### Example: Debounced Search Bound to URL Search Params

```tsx
// src/app/(app)/products/_components/product-search-filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";

export function ProductSearchFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialQuery = searchParams.get("query") ?? "";
  const [text, setText] = useState(initialQuery);

  // Synchronize local input state when URL changes externally (e.g. browser back/forward buttons)
  useEffect(() => {
    setText(initialQuery);
  }, [initialQuery]);

  // Debounce search update to avoid per-keystroke server re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      if (text === initialQuery) return;
      const params = new URLSearchParams(searchParams);
      if (text) {
        params.set("query", text);
        params.set("page", "1");
      } else {
        params.delete("query");
      }

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [text, initialQuery, pathname, router, searchParams]);

  return (
    <div className="flex items-center space-x-2 my-4">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search products..."
        className="px-3 py-2 border rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isPending && <span className="text-xs text-gray-500">Updating...</span>}
    </div>
  );
}
```

#### Example: Parent Page Suspense Boundary Requirement

```tsx
// src/app/(app)/products/page.tsx (Server Component)
import { Suspense } from "react";
import { ProductSearchFilters } from "./_components/product-search-filters";
import { ProductList } from "./_components/product-list";

interface ProductsPageProps {
  searchParams: Promise<{ query?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { query } = await searchParams;

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Product Catalog</h1>
      {/* Enclose useSearchParams component in Suspense boundary */}
      <Suspense fallback={<div className="h-10 w-64 bg-gray-100 animate-pulse rounded" />}>
        <ProductSearchFilters />
      </Suspense>
      {/* Pass search query to server component data list */}
      <ProductList query={query} />
    </main>
  );
}
```

---

### 5. Metadata & SEO

Next.js provides a native Metadata API for defining document `<head>` elements (`title`, `description`, Open Graph, Twitter cards, canonical URLs, and favicon icons).

#### Metadata Strategy

1. **Static Metadata**: Export a static `metadata` object in static pages or layout files.
2. **Dynamic Metadata**: Export an `async generateMetadata` function in dynamic routes (`/products/[id]/page.tsx`) to fetch resource-specific metadata.
3. **Metadata Inheritance**: Child segment metadata merges with and overrides parent segment metadata automatically.
4. **Static Assets**: Store static assets (favicons, manifest files, robots.txt, default OG images) inside the top-level `public/` directory. Use dynamic route generators (`sitemap.ts`, `robots.ts`, `opengraph-image.tsx`) for automated search engine discovery.

#### Example: Dynamic Metadata in Dynamic Route Segment

```tsx
// src/app/(marketing)/products/[slug]/page.tsx
import { Metadata } from "next";
import { getProductBySlug } from "@/server/db/products";
import { notFound } from "next/navigation";
import { cache } from "react";

interface Props {
  params: Promise<{ slug: string }>;
}

// Wrap ORM/DB data fetcher in React cache() to deduplicate queries across metadata and page rendering
const getCachedProduct = cache(async (slug: string) => {
  return getProductBySlug(slug);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCachedProduct(slug);

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The requested product could not be located.",
    };
  }

  return {
    title: `${product.name} | Acme Store`,
    description: product.summary,
    openGraph: {
      title: product.name,
      description: product.summary,
      images: [
        {
          url: product.imageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.summary,
      images: [product.imageUrl],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getCachedProduct(slug);
  if (!product) notFound();

  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="mt-4 text-gray-700">{product.description}</p>
    </main>
  );
}
```

---

### 6. Security & Authentication Baseline

Production React & Next.js applications must enforce strict browser security, cookie-based session management, and secret isolation.

#### Security Invariants

1. **HttpOnly Cookie Sessions**: Authentication sessions MUST be stored in `HttpOnly`, `Secure`, `SameSite=Lax/Strict` cookies using `__Host-` prefixes. Storing authentication tokens in `localStorage` or `sessionStorage` is strictly prohibited due to Cross-Site Scripting (XSS) extraction risks.
2. **Environment Variable Separation**:
   - Variables WITHOUT the `NEXT_PUBLIC_` prefix are strictly server-only and excluded from client JavaScript bundles.
   - Variables prefixed with `NEXT_PUBLIC_` are inline-replaced into client bundles during build time. NEVER prefix API secrets, private database connection strings, or signing keys with `NEXT_PUBLIC_`.
3. **Environment Schema Validation**: Validate all environment variables during application startup using a runtime Zod schema (`src/lib/env.ts`).
4. **OWASP XSS Protection**: Avoid `dangerouslySetInnerHTML`. When rendering rich text or HTML content from external sources, sanitize the HTML string using DOMPurify before injection.
5. **CSRF & Server Action Defense**: Server Actions enforce origin verification automatically in Next.js. Ensure state-changing actions verify user permissions and double-check origin headers when handling cross-origin requests. When deploying behind reverse proxies, CDNs, or custom domains, specify `experimental.serverActions.allowedOrigins` in `next.config.ts` to prevent HTTP 403 origin mismatch errors.

#### Example: Environment Variable Isolation (`src/lib/env/server.ts` & `src/lib/env/client.ts`)

```typescript
// src/lib/env/server.ts
import "server-only"; // Guarantees server secrets cannot be imported into Client Components
import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
});

// Guard build-time evaluation during CI static page compilation via optional validation bypass
export const serverEnv =
  process.env.SKIP_ENV_VALIDATION === "true" || process.env.SKIP_ENV_VALIDATION === "1"
    ? (process.env as unknown as z.infer<typeof serverEnvSchema>)
    : serverEnvSchema.parse({
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL,
        AUTH_SECRET: process.env.AUTH_SECRET,
      });
```

```typescript
// src/lib/env/client.ts
import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});
```

---

### 7. Performance & Optimization

High-reliability web applications enforce target Core Web Vitals SLAs and optimize resource delivery across images, fonts, scripts, and code splitting.

#### Core Web Vitals Targets (p75 Mobile Thresholds)

- **Largest Contentful Paint (LCP)**: <= 2.5s
- **Interaction to Next Paint (INP)**: <= 200ms
- **Cumulative Layout Shift (CLS)**: <= 0.1

#### Optimization Rules

1. **Image Optimization (`next/image`)**:
   - Always specify explicit `width` and `height` props or use `fill` with a parent container that defines `aspect-ratio` to eliminate Cumulative Layout Shift (CLS).
   - Reserve `priority` / `fetchpriority="high"` for the primary LCP image visible in the viewport above the fold.
2. **Font Optimization (`next/font`)**: Use `next/font/google` or `next/font/local` to automatically self-host font files at build time, eliminating external Google Fonts network calls and layout shifts via `display: "swap"`.
3. **Dynamic Code-Splitting (`next/dynamic`)**: Lazily load heavy, non-critical Client Components (e.g. rich text editors, chart visualization libraries, heavy modal dialogs) using `next/dynamic` or `React.lazy()` wrapped in Suspense boundaries.
4. **Script Optimization (`next/script`)**: Load third-party analytics or tracking scripts asynchronously using `<Script strategy="afterInteractive" />` or `strategy="lazyOnload"`.

#### Example: Optimized Image and Dynamic Component Loading

```tsx
// src/app/(app)/dashboard/_components/analytics-wrapper.tsx
"use client";

import Image from "next/image";
import dynamic from "next/dynamic";

// Lazily load heavy chart component; disable SSR if window APIs are required
const HeavyAnalyticsChart = dynamic(
  () => import("./heavy-analytics-chart").then((mod) => mod.HeavyAnalyticsChart),
  {
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-md" />,
    ssr: false,
  }
);

export function AnalyticsWrapper() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        {/* LCP / Hero Image with explicit dimensions */}
        <Image
          src="/images/dashboard-banner.webp"
          alt="Dashboard Banner"
          width={800}
          height={200}
          priority
          className="rounded-lg object-cover"
        />
      </div>
      {/* Code-split chart component */}
      <HeavyAnalyticsChart />
    </div>
  );
}
```

---

### 8. Testing & Quality Assurance

High-reliability applications require structured automated testing across the testing pyramid and strict CI production verification gates.

#### Testing Pyramid Target Ratios & QA Pipelines

The following distribution represents recommended **target ratios** across the testing pyramid rather than rigid quotas:

- **Unit Tests (~60% target ratio)**: Test utility functions, validation schemas, custom React hooks (`renderHook`), and isolated server functions using Vitest or Jest.
- **Component Tests (~30% target ratio)**: Test component rendering, user interactions, accessibility states, and conditional rendering using React Testing Library (`@testing-library/react`). Use Mock Service Worker (MSW) for API network call interception. Query DOM elements using accessible roles (`getByRole`, `findByRole`) rather than implementation details (`getByTestId`).
- **End-to-End Smoke Tests (~10% target ratio)**: Validate complete user journeys (authentication login, main dashboard interaction, checkout flow, settings update) using Playwright running against an actual `next build` static/SSR server instance (`next start`).
- **Visual Regression Testing**: Run automated visual snapshot comparisons (using Percy, Chromatic, or Playwright component snapshots) on shared design-token and core UI component pull requests to prevent unintended visual breaks.
- **Automated Accessibility Testing**: Integrate `axe-core` (`@axe-core/react` in dev mode, `jest-axe` / `playwright-axe` in CI) to verify WCAG 2.2 AA compliance on interactive components and page states.

#### Minimum CI Pipeline Workflow

Before merging any PR or deploying to production, CI MUST pass:

```bash
# 1. Typecheck TypeScript across all files without emitting JS
npx tsc --noEmit

# 2. Run ESLint for code quality and framework rules
npm run lint

# 3. Execute unit and component test suites
npm run test

# 4. Execute production application build
npm run build
```

---

## Evidence & References

- [React Server Components Documentation](https://react.dev/reference/rsc/server-components) — Official React documentation defining Server Component execution model, bundle savings, and component rendering semantics.
- [React Directives: 'use client'](https://react.dev/reference/react/use-client) — Official React reference for defining client-server boundaries, component tree hydration, and prop serialization rules.
- [React Directives: 'use server'](https://react.dev/reference/react/use-server) — Official React documentation for Server Functions / Server Actions, remote execution, and security considerations.
- [React `useTransition` Reference](https://react.dev/reference/react/useTransition) — Official React documentation for non-blocking UI transitions and Server Action calls.
- [React `cache()` API Documentation](https://react.dev/reference/react/cache) — Official React reference for deduplicating data fetching functions across component rendering trees.
- [Next.js App Router Documentation](https://nextjs.org/docs/app) — Official Next.js framework guide covering file-system routing, layout composition, route groups, and private folders.
- [Next.js Middleware Specification](https://nextjs.org/docs/app/building-your-application/routing/middleware) — Official Next.js specification for Edge runtime routing, headers, and request rewrite rules.
- [Next.js Instrumentation Specification](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation) — Official Next.js reference for server startup telemetry hooks and OpenTelemetry SDK integration.
- [Next.js Fetching Data Guide](https://nextjs.org/docs/app/getting-started/fetching-data) — Official Next.js guidance on direct server fetching, request memoization, and client-side data fetching boundaries.
- [Next.js Server Actions and Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) — Official Next.js documentation for data mutations, input validation, allowed origins, and cache revalidation APIs (`revalidatePath`, `revalidateTag`).
- [Next.js Metadata and OG Images](https://nextjs.org/docs/app/building-your-application/optimizing/metadata) — Official Next.js documentation for static and dynamic SEO metadata, Open Graph cards, dynamic sitemaps, and search engine crawlers.
- [Next.js Optimizing Images, Fonts, Scripts & Dynamic Imports](https://nextjs.org/docs/app/building-your-application/optimizing/images) — Official Next.js guides for `<Image>`, `<Font>`, dynamic imports, and script optimization.
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) — Official Next.js deployment and quality checklist covering type safety, caching, performance, accessibility, and bundle optimization.
- [Zod & Valibot Validation Specifications](https://zod.dev/) — Authoritative schemas for zero-trust boundary type validation.
- [React `server-only` Package Reference](https://www.npmjs.com/package/server-only) — Build-time compiler guard ensuring server modules are never imported into client bundles.
- [TanStack Query & SWR Caching Specifications](https://tanstack.com/query/latest) — Client-side server cache and async state management standards.
- [Web Vitals SLAs](https://web.dev/vitals/) — Official Google / W3C Core Web Vitals specifications establishing target thresholds for LCP ($\le 2.5\text{s}$), INP ($\le 200\text{ms}$), and CLS ($\le 0.1$).
- [IETF RFC 6265bis: Cookie Prefixes (`__Host-`)](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis#section-4.1.3) — IETF specification establishing strict origin and path boundaries for `__Host-` cookie prefixes.
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/) — W3C specification defining `traceparent` header propagation across distributed systems.
- [W3C Fetch Metadata Request Headers Specification](https://www.w3.org/TR/fetch-metadata/) — W3C specification for `Sec-Fetch-Site` origin isolation and anti-CSRF defenses.
- [OWASP Top 10 Web Application Security Risks](https://owasp.org/www-project-top-ten/) — OWASP security standards governing XSS prevention, CSRF defenses, session cookie security (`HttpOnly`/`Secure`/`SameSite`), and sensitive data isolation.
- [OWASP API Security Top 10: BOLA & Mass Assignment](https://owasp.org/www-project-api-security/) — OWASP API vulnerability guidelines covering Broken Object Level Authorization (BOLA) and property-level access control.
- [OWASP XSS Prevention Cheat Sheet & DOMPurify](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — Security standards for sanitizing dynamic HTML injection.
- [W3C WCAG 2.2 & WAI-ARIA 1.2 Specifications](https://www.w3.org/TR/WCAG22/) — Authoritative W3C standards for accessible web applications and dynamic ARIA roles.
- [WHATWG URL Living Standard](https://url.spec.whatwg.org/#interface-urlsearchparams) — Official specification governing `URLSearchParams` serialization and URL-based state binding.
- [Sentry Next.js SDK & React Error Boundaries](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — Official SDK documentation for error boundary capture, telemetry emission, and digest tracking.
- [Vitest, Jest, React Testing Library, MSW & Playwright Specs](https://testing-library.com/docs/react-testing-library/intro/) — Automated testing frameworks for unit, component, and E2E testing.
