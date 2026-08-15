# Production Frontend Agent Rules (`AGENTS-frontend.md`)

> Copy this file directly into your target frontend project root as `AGENTS.md` or append it to your existing project rules.
> Universal production baseline for frontend web applications, using React ecosystem examples throughout (adapt equivalents for Vue/Svelte/Solid). Framework or meta-framework-specific rules should be appended directly inside the project-level AGENTS.md file.

<!-- AI-COPY-BLOCK
NON-NEGOTIABLE FRONTEND RULES (enforce every PR):
1. Components: pure presentational vs container/hook separation; typed props only; MUST NOT exceed ~150 lines or 3 unrelated state slices; named exports.
2. State: server state via async cache (TanStack Query/SWR) only; no duplication into useState; explicit mutation invalidation; no window.location.reload(); error boundaries with mandatory telemetry (Sentry/Datadog); URL search params as authoritative state for shareable UI; schema validation (Zod/Valibot) for forms.
3. Performance: LCP <= 2.5s / INP <= 200ms / CLS <= 0.1 @ p75 mobile; likely LCP image MAY use fetchpriority="high" sparingly; preload only late-discovered critical assets; dynamic import() for heavy components; WebP/AVIF images with explicit dimensions; path-level tree-shaking; font-display:swap.
4. Security: DOMPurify for any raw HTML injection; no tokens/PII in localStorage/sessionStorage; prefer BFF/httpOnly SameSite cookies; if browser-held tokens are unavoidable, keep them memory/service-worker scoped and never persist refresh tokens; same-origin redirect whitelist; CSP + X-Frame-Options:DENY + HSTS via HTTP headers; SRI on third-party CDN scripts/styles.
5. a11y: WCAG 2.2 AA (4.5:1 contrast); full keyboard nav via WAI-ARIA patterns; no outline:none without replacement; semantic HTML first; aria-live for async feedback.
6. Testing: target mostly unit tests with meaningful component interaction tests and lightweight E2E; role-based user-outcome assertions over test-id-only checks; axe-core for new/changed interactive components and critical page states; manual keyboard/screen-reader checks for key flows; MSW for network; fake timers; E2E must cover auth + CRUD + error boundary; visual regression SHOULD cover design-token and shared component changes (Chromatic/Playwright snapshots).
7. Code quality: CSS custom property tokens for product styling; literal values allowed only for technical one-offs; scoped CSS co-location; early-return guard clauses; no nested ternary JSX; DRY at 3+ duplications; intent comments (why, not what).
-->

<!-- START AGENT-STANDARD: FRONTEND-PRODUCTION -->

## 1. Component Architecture & Layering
- [ ] **Strict Presentation/Container Separation**: Presentational (UI) components MUST be pure, deterministic functions driven strictly by props. Business logic, side-effects, and data fetching MUST be isolated in container components or custom hooks.
- [ ] **Props Immutability & Contract Discipline**: Props MUST be treated as immutable. Component prop contracts MUST use explicit, strict TypeScript types (`interface`/`type`), avoiding generic `any` or loose `Record<string, any>`.
- [ ] **Single Responsibility & Line-Cap Limits**: Components MUST NOT exceed ~150 lines of code or manage more than 3 unrelated pieces of state. Complex components MUST be refactored into focused sub-components or custom hooks.
- [ ] **Named Exports Baseline**: Use explicit named exports for UI components to ensure refactoring safety and tree-shaking consistency (reserving default exports solely for framework-required dynamic route entries).

## 2. State Management & Data Fetching
- [ ] **Server State vs. Client UI State Decoupling**: Remote server data MUST be managed exclusively by dedicated async data-fetching caches (e.g. TanStack Query / SWR). Ephemeral UI state (modals, drawer toggles, active tabs) MUST use lightweight client state tools (e.g. Zustand, React Context).
- [ ] **Zero State Duplication**: Copying API response data into local component state (`useState`) or global UI stores is strictly forbidden. Derived state MUST be calculated on-the-fly or via memoized selectors (`useMemo`).
- [ ] **Mutation Lifecycle & Invalidation**: Data mutations MUST declare explicit cache invalidation keys or optimistic updates with automatic error rollback handlers. Hard page reloads (`window.location.reload()`) to refresh state are strictly banned — instead, use the data-fetching library's explicit cache invalidation APIs (e.g. `queryClient.invalidateQueries()`).
- [ ] **Query Hygiene & Error Boundaries**: Network queries MUST specify explicit `staleTime` defaults and exponential backoff retry policies (e.g. max 2 retries, zero retries on 4xx client errors). Unhandled query errors MUST trigger localized error fallback boundaries rather than crashing the full UI tree.
- [ ] **Error Boundary Telemetry**: Errors caught by error boundaries MUST be reported to a centralized observability service (e.g. Sentry, Datadog, or equivalent) before rendering the fallback UI. Silent swallowing of boundary errors or `console.error`-only logging is strictly forbidden in production.
- [ ] **URL as Authoritative State for Shareable UI**: Shareable UI state — search filters, pagination cursors, active tabs, sort order — SHOULD be encoded in URL search parameters (`?page=2&filter=active`) rather than component `useState` or global stores. This ensures deep-linking, browser back/forward navigation, and SSR hydration correctness.
- [ ] **Schema-Driven Form Validation**: User form inputs MUST be validated against explicit, type-safe schemas (e.g. Zod, Valibot, Yup) at the UI boundary before dispatching mutations, rendering co-located field-level errors linked via `aria-describedby` and `aria-invalid`.

## 3. Web Performance & Core Web Vitals
- [ ] **Core Web Vitals Thresholds**: Production pages MUST maintain strict Core Web Vitals budgets on 75th percentile mobile runs: Largest Contentful Paint (LCP) <= 2.5s, Interaction to Next Paint (INP) <= 200ms, Cumulative Layout Shift (CLS) <= 0.1.
- [ ] **LCP Asset Prioritization**: The likely LCP image asset MAY use `fetchpriority="high"` on the image element when measurement or page structure shows it benefits LCP. Use high priority sparingly, usually for only one or two likely LCP images. Use `<link rel="preload">` (with explicit `imagesrcset`/`imagesizes` for responsive images) only when the critical asset is discovered late via CSS or dynamic JavaScript rather than initial HTML.
- [ ] **Dynamic Code Splitting**: All major route entries and heavy sub-components (e.g. rich text editors, data visualization charts, export modals) MUST be code-split using dynamic lazy loading (`React.lazy` / `import()`).
- [ ] **Zero Cumulative Layout Shift (CLS)**: Plain, unoptimized `<img>` tags without explicit dimensions are strictly forbidden. Images MUST use modern formats (WebP/AVIF) with explicit `width` and `height` attributes or container aspect-ratio reservations.
- [ ] **Tree-Shaking & Import Hygiene**: Barrel imports of monolithic utility or icon libraries (`import * as Icons`, importing from top-level `lodash`) are strictly banned. Use path-level tree-shakeable imports (`import debounce from 'lodash/debounce'`).
- [ ] **Font & Asset Optimization**: Web fonts MUST use `font-display: swap` or `optional` with preloaded critical subsets to prevent Flash of Unstyled Text (FOUT) / Flash of Invisible Text (FOIT).

## 4. Security & Authentication Baseline
- [ ] **XSS Prevention & HTML Sanitization**: Direct injection of unescaped HTML (`dangerouslySetInnerHTML`, `v-html`, `innerHTML`) is strictly banned unless explicitly sanitized using an audited library (e.g. DOMPurify).
- [ ] **Secure Session & Token Storage**: Storing sensitive access tokens, refresh tokens, session IDs, or user PII in `localStorage` or `sessionStorage` is strictly forbidden due to XSS exposure. Prefer Backend-for-Frontend (BFF) or same-site architectures using `httpOnly`, `SameSite=Lax/Strict`, `Secure` cookies. If browser-held access tokens are unavoidable, keep them memory-scoped or service-worker-mediated, keep lifetimes short, and never persist refresh tokens in browser storage.
- [ ] **Open Redirect Safeguards**: Client-side navigation routines (e.g. post-login redirects) MUST validate target URLs against a same-origin whitelist to prevent Open Redirect exploits.
- [ ] **Content Security Policy (CSP) & Defense-in-Depth**: Edge/server HTTP response headers MUST deliver strict CSP constraints, restrict frame nesting (`X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`), and enforce HTTPS via `Strict-Transport-Security` (HSTS).
- [ ] **Subresource Integrity (SRI)**: Any third-party scripts or stylesheets loaded from external CDNs MUST include `integrity` and `crossorigin` attributes to guard against supply-chain compromise via CDN tampering.

## 5. Accessibility (a11y) & UX Invariants
- [ ] **WCAG 2.2 AA Compliance**: All interactive UI components (buttons, forms, dialogs, dropdowns) MUST meet WCAG 2.2 AA as the non-negotiable baseline — minimum 4.5:1 text contrast ratio, 3:1 large text and UI component ratio.
- [ ] **Full Keyboard Navigation**: Every interactive element MUST be reachable and operable via keyboard alone. Custom interactive widgets (e.g. dropdowns, date pickers, modals) MUST implement the correct ARIA design pattern (WAI-ARIA Authoring Practices).
- [ ] **Visible Focus Indicators**: CSS `outline: none` / `outline: 0` on interactive elements without an accessible custom focus replacement is strictly banned.
- [ ] **Semantic HTML & ARIA Hygiene**: Native semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<dialog>`) MUST be preferred over generic `<div>` or `<span>` with ARIA roles. `aria-*` attributes must not contradict underlying HTML semantics.
- [ ] **Loading & Error State Feedback**: Async loading states, form validation errors, and toasts/notifications MUST use live region announcements (`aria-live="polite"` or `role="alert"`) so screen reader users receive the same feedback as sighted users.

## 6. Testing Strategy & QA
- [ ] **Testing Pyramid**: Prefer a high proportion of fast unit tests for pure business logic and custom hooks, meaningful component interaction tests via Testing Library, and lightweight E2E smoke tests for critical user flows. Treat ratios such as 60% unit / 30% component / 10% E2E as targets, not mechanical quotas.
- [ ] **No `act()`-less Async Tests**: All async component state updates and user interactions in tests MUST be awaited using `userEvent` or Testing Library async queries (`waitFor`, `findBy*`). Suppressing React `act()` warnings with console overrides or manual mocks is strictly banned.
- [ ] **Accessibility in Component Tests**: New or changed interactive components MUST include user-outcome assertions with role-based queries (`getByRole` / `findByRole`) where applicable. Avoid low-value existence-only assertions and `getByTestId` as the primary selector when accessible roles or labels are available.
- [ ] **Automated & Manual Accessibility Assertions**: New or changed interactive components and critical page states MUST run automated accessibility checks with `axe-core` or an equivalent tool (e.g. `jest-axe` / `vitest-axe`: `expect(await axe(container)).toHaveNoViolations()`). Because automation cannot catch all WCAG issues, critical flows MUST also receive manual keyboard testing and screen-reader spot checks where risk warrants it.
- [ ] **E2E Smoke Coverage**: At minimum, the following critical user flows MUST have E2E test coverage: auth (login/logout), primary create/read/update/delete flow, and error boundary rendering.
- [ ] **Deterministic & Isolated Tests**: Tests MUST NOT depend on real network calls. Network requests MUST be intercepted using MSW (Mock Service Worker) or equivalent. No `setTimeout` for fake async timing — use fake timers.
- [ ] **Visual Regression Testing**: Projects maintaining a shared component library or design system SHOULD run visual regression snapshots (e.g. Chromatic, Percy, or Playwright `toHaveScreenshot()`) on every PR touching design tokens or shared components. Pixel-diff thresholds MUST be committed to version control and reviewed as part of the PR.

## 7. Code Quality, CSS Maintainability & Design Tokens
- [ ] **Design Token Baseline**: Product styling values (colors, spacing, typography scales, border radii, shadows) MUST be defined as CSS custom properties (`--token-name`) in a shared design token file. Hardcoded magic hex values or repeated arbitrary spacing values in component styles are strictly forbidden. Literal values are allowed for technical one-offs such as `1px` borders, media-query breakpoints, SVG/canvas coordinates, or browser-normalization fixes when their intent is clear.
- [ ] **Predictable CSS Architecture**: Style rules MUST be co-located with their component (CSS Modules, `styled-components`, or utility-first scoped classes). Global CSS MUST be restricted to resets, token definitions, and base typography — no component-specific rules in global stylesheets.
- [ ] **Guard Clauses & Flat Render Logic**: Conditional rendering MUST use early-return guard patterns at the top of component functions. Deeply nested ternary chains (`a ? b ? c : d : e`) inside JSX/templates are strictly banned.
- [ ] **Pragmatic DRY & YAGNI**: Duplicate UI logic that appears three or more times MUST be extracted into a shared hook or utility. Speculative "reusable" abstractions with no current consumer MUST NOT be created.
- [ ] **Intent-Based Comments**: Comments MUST explain non-obvious business rationale (*why*), never restating *what* readable code already expresses. Self-documenting component and hook names are required (`useCartItemDiscountCalculator` over `useCalc`).

<!-- END AGENT-STANDARD: FRONTEND-PRODUCTION -->
