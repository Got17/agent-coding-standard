# Frontend Concepts Coverage Audit

Date: 2026-08-15

## Scope

This audit checks whether the frontend documentation section covers essential universal concepts for production frontend development. It audits the full frontend section, including:

- `docs/frontend/nextjs-frontend-structure.md`
- `docs/frontend/css-ui.md`
- `docs/frontend/react-nextjs.md`
- `docs/frontend/security-a11y.md`
- `docs/frontend/state-management.md`
- `docs/frontend/web-performance.md`
- `templates/AGENTS-frontend.md`
- Related cross-cutting security, DevOps, and testing standards

## Verdict

The frontend section currently has a solid foundation in two places:
1. `templates/AGENTS-frontend.md` — A comprehensive production rule block covering component architecture, state decoupling, Core Web Vitals, XSS/CSP security, WCAG 2.2 AA accessibility, testing pyramid (Vitest/axe-core/MSW), and CSS design tokens.
2. `docs/frontend/nextjs-frontend-structure.md` — A detailed guide (277 lines) covering Next.js App Router layout, server/client component boundaries, data access, route segments, and CI build verification.

However, **5 out of 6 standard pages in `docs/frontend/` are currently 16-line stubs**:
- `docs/frontend/css-ui.md` (Stub)
- `docs/frontend/react-nextjs.md` (Stub)
- `docs/frontend/security-a11y.md` (Stub)
- `docs/frontend/state-management.md` (Stub)
- `docs/frontend/web-performance.md` (Stub)

Additionally, there is **no `docs/frontend/index.md` navigation entry point**, and essential frontend domains like **Forms & Input Validation**, **Internationalization (i18n)**, **Frontend Testing & Automated QA**, and **Error Resilience & Telemetry** do not yet have dedicated topic pages or clear cross-references.

Following our evidence research and grilling session, the plan is to split the combined `security-a11y.md` into dedicated standalone files (`security.md` and `accessibility.md`), create dedicated pages for `forms-validation.md`, `testing-qa.md`, and `i18n-localization.md`, and expand all remaining stubs into source-backed production standards.

## Coverage Matrix

| Essential Concept | Why It Is Essential | Current Coverage | Status | Recommended Doc Action | Primary Evidence / Standards |
|---|---|---|---|---|---|
| **1. Component Architecture & Layering** | Frontend codebases turn into unmaintainable god components unless UI presentation is strictly separated from containers/hooks and single responsibility limits (~150 LOC) are enforced. | `templates/AGENTS-frontend.md` §1; `docs/frontend/nextjs-frontend-structure.md` | Covered in template & Next.js guide | Expand `docs/frontend/react-nextjs.md` to cover generic component design rules, container/presentational split, prop contract hygiene, and hooks discipline. | [React Component Composition Docs](https://react.dev/learn/passing-props-to-a-component); Martin Fowler (Presentation-Domain Separation). |
| **2. Rendering Strategies & Page Lifecycle** | Modern web apps mix Server Components (RSC), SSR, SSG, ISR, and Client (SPA) rendering; improper boundary decisions lead to hydration errors, slow TTFB, or leaked server secrets. | `docs/frontend/nextjs-frontend-structure.md`; `docs/frontend/react-nextjs.md` stub | Partially covered | Expand `docs/frontend/react-nextjs.md` with explicit guidelines on choosing RSC vs. Client Components, hydration safety, streaming Suspense, and build-time generation. | [React Server Components Specification](https://react.dev/reference/rsc/server-components); Next.js App Router Documentation. |
| **3. State Management & Data Fetching** | Mixing server response state into local component state causes stale UI bugs, race conditions, and `window.location.reload()` hacks. | `templates/AGENTS-frontend.md` §2; `docs/frontend/state-management.md` stub | Partially covered | Expand `docs/frontend/state-management.md` into a full guide covering Server State (TanStack Query/SWR) vs. Client State (Zustand/Context), URL as authoritative state, cache invalidation, and zero-duplication rules. | [TanStack Query Important Defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults); W3C URL Specification for deep-linking state. |
| **4. Web Performance & Core Web Vitals** | Slow page loads and layout shifts directly degrade user conversion, bounce rate, and search engine indexing. | `templates/AGENTS-frontend.md` §3; `docs/frontend/web-performance.md` stub | Partially covered | Expand `docs/frontend/web-performance.md` into a detailed human guide covering p75 Core Web Vitals (LCP ≤ 2.5s / 2.0s target, INP ≤ 200ms, CLS ≤ 0.1), dynamic code-splitting, image formatting (WebP/AVIF), asset preloading, and tree-shaking. | [Google Web Vitals Specification](https://web.dev/vitals/); W3C Web Performance Working Group. |
| **5. Styling, UI Architecture & Design Systems** | Hardcoded magic hex values, inline styles, and un-scoped global CSS create visual regressions and unmaintainable themes across large apps. | `templates/AGENTS-frontend.md` §7; `docs/frontend/css-ui.md` stub | Partially covered | Expand `docs/frontend/css-ui.md` into a guide detailing CSS design tokens (`--token-name`), scoped class architecture (CSS Modules/Tailwind), dark mode tokenization, and responsive design patterns. | [W3C CSS Custom Properties Specification](https://www.w3.org/TR/css-variables-1/); Design Systems Handbook (Atomic Design & Tokens). |
| **6. Frontend Security & Data Protection** | Client applications are executed in untrusted browser environments susceptible to XSS, CSRF, open redirects, sensitive data exposure in `localStorage`, and CDN script tampering. | `templates/AGENTS-frontend.md` §4; `docs/frontend/security-a11y.md` stub; `docs/security/*` cross-links | Partially covered | Split `docs/frontend/security-a11y.md` into standalone [`docs/frontend/security.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/security.md) covering DOMPurify sanitization, httpOnly cookie auth over localStorage, CSP headers, Subresource Integrity (SRI), and open-redirect whitelists. | [OWASP Cross-Site Scripting (XSS) Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html); [DOMPurify Specification](https://github.com/cure53/DOMPurify); W3C CSP Level 3. |
| **7. Accessibility (a11y) & UX Invariants** | Inaccessible applications fail legal compliance standards and lock out users relying on keyboard navigation, screen readers, or high-contrast UI modes. | `templates/AGENTS-frontend.md` §5; `docs/frontend/security-a11y.md` stub | Partially covered | Split `docs/frontend/security-a11y.md` into standalone [`docs/frontend/accessibility.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/accessibility.md) covering WCAG 2.2 AA (4.5:1 contrast), WAI-ARIA authoring practices, keyboard focus management (`outline`), and `aria-live` announcements. | [W3C Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/); [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/). |
| **8. Forms, Validation & User Input** | Unvalidated form inputs lead to bad backend state, poor UX feedback, and screen reader disconnects during error handling. | `templates/AGENTS-frontend.md` §2; `docs/frontend/nextjs-frontend-structure.md` | Partially covered | Create standalone [`docs/frontend/forms-validation.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/forms-validation.md) covering schema-driven validation (Zod/Valibot), field-level accessible error linkage (`aria-describedby`, `aria-invalid`), and client/server validation sync. | WAI-ARIA Form Notification Patterns; Zod / Schema Validation specifications. |
| **9. Frontend Testing & Automated QA** | Testing only implementation details or relying purely on manual clicking causes flaky test suites and undetected regression breaks. | `templates/AGENTS-frontend.md` §6; `docs/general/code-review-checklist.md` | Partially covered in template | Create standalone [`docs/frontend/testing-qa.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/testing-qa.md) covering testing pyramid (Vitest unit, React Testing Library interaction, MSW network mocking, Playwright E2E, axe-core automated a11y, and Chromatic/Playwright visual regression). | [Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles/); MSW (Mock Service Worker) v2 Specification; axe-core Accessibility Engine. |
| **10. Error Handling, Resilience & Monitoring** | Uncaught JS exceptions crash the entire DOM tree unless trapped by boundaries and reported to real-time telemetry services. | `templates/AGENTS-frontend.md` §2; `docs/frontend/nextjs-frontend-structure.md` | Partially covered | Add error boundary & telemetry guidance into `docs/frontend/react-nextjs.md` covering fallback UI states, Sentry/Datadog integration, and graceful degradation. | [React Error Boundaries Guide](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary); OpenTelemetry Web SDK. |
| **11. SEO, OpenGraph & Metadata** | Missing or dynamic metadata leads to poor search rankings and broken social media sharing cards. | `docs/frontend/nextjs-frontend-structure.md` | Partially covered | Add SEO & Metadata guidance covering Next.js Metadata API, OpenGraph images, JSON-LD structured data, sitemaps, and robots.txt into `docs/frontend/react-nextjs.md` or a dedicated SEO section. | [Google Search Central SEO Developer Guide](https://developers.google.com/search/docs); Open Graph Protocol specification. |
| **12. Internationalization (i18n) & Localization** | Global applications require locale routing, ICU message formatting, right-to-left (RTL) layout switching, and region-aware date/number formatting. | `templates/AGENTS-frontend.md` mentions RTL/i18n; no frontend doc | Missing as dedicated page | Create [`docs/frontend/i18n-localization.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/i18n-localization.md) covering locale routing, ICU message syntax, `Intl` browser APIs, RTL layout switching, and translation workflow. | [Unicode CLDR Standard](https://cldr.unicode.org/); W3C Internationalization (i18n) Activity. |
| **13. Frontend Navigation & Index** | Developers and AI agents need a single entry point outlining the frontend standards architecture and how sub-topics fit together. | None | Missing | Create [`docs/frontend/index.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/index.md) as the canonical navigation and overview page for the frontend section. | Repo standard documentation structure requirement. |

---

## Frontend Section Gaps & Action Plan

### High Priority (Critical Stubs & Navigation Entry)

1. **Create [`docs/frontend/index.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/index.md)**
   Provide a single navigation entry point for all frontend standards, mapping core rules to dedicated topic pages and cross-linking security/DevOps docs.

2. **Expand [`docs/frontend/web-performance.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/web-performance.md)**
   Transform the 18-line stub into a comprehensive production standard covering p75 Core Web Vitals (LCP ≤ 2.5s / 2.0s, INP ≤ 200ms, CLS ≤ 0.1), dynamic code splitting, image optimization (WebP/AVIF), asset preloading, and tree-shaking.

3. **Expand [`docs/frontend/state-management.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/state-management.md)**
   Transform the 16-line stub into a full guide covering Server State (TanStack Query/SWR) vs. Client State (Zustand/Context), URL as authoritative state, cache invalidation, and zero-duplication rules.

4. **Split [`docs/frontend/security-a11y.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/security-a11y.md) into Two Standalone Pages**
   - Create [`docs/frontend/security.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/security.md): DOMPurify XSS sanitization, httpOnly cookie session auth over localStorage, strict CSP headers, Subresource Integrity (SRI), open-redirect whitelists.
   - Create [`docs/frontend/accessibility.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/accessibility.md): WCAG 2.2 AA (4.5:1 contrast), WAI-ARIA authoring practices, focus management (`outline`), and `aria-live` announcements.

5. **Expand [`docs/frontend/css-ui.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/css-ui.md)**
   Expand into a complete Styling & Design Tokens guide detailing CSS custom properties (`--token-name`), scoped class architecture, dark mode tokenization, and responsive design patterns.

6. **Expand [`docs/frontend/react-nextjs.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/react-nextjs.md)**
   Expand into a canonical React & Next.js production standard covering component composition, RSC vs Client Component boundaries, hydration safety, and hooks discipline.

### Medium Priority (New Pages to Add)

7. **Create [`docs/frontend/testing-qa.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/testing-qa.md)**
   Document the frontend testing strategy: Vitest/Jest unit tests, React Testing Library, MSW network mocking, Playwright E2E smoke tests, automated `axe-core` accessibility checks, and visual regression testing.

8. **Create [`docs/frontend/forms-validation.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/forms-validation.md)**
   Document schema-driven validation (Zod/Valibot), accessible field error linkage (`aria-describedby`, `aria-invalid`), and server/client validation integration.

9. **Create [`docs/frontend/i18n-localization.md`](file:///D:/Coding/projects/agent-coding-standard/docs/frontend/i18n-localization.md)**
   Document internationalization standards: locale routing, ICU message syntax, browser `Intl` APIs, right-to-left (RTL) layout switching, and translation file hygiene.

---

## Primary Evidence Log

- **Google Core Web Vitals Specification (2026 update)**: [https://web.dev/vitals/](https://web.dev/vitals/) — Defines p75 mobile performance thresholds: LCP ≤ 2.5s (2.0s target), INP ≤ 200ms, CLS ≤ 0.1.
- **OWASP Cross-Site Scripting (XSS) Prevention Cheat Sheet**: [https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — Primary security specification for output encoding, DOMPurify HTML sanitization, and `HttpOnly` session cookies.
- **W3C Web Content Accessibility Guidelines (WCAG) 2.2**: [https://www.w3.org/TR/WCAG22/](https://www.w3.org/TR/WCAG22/) — Primary accessibility standard requiring minimum 4.5:1 text contrast ratio, keyboard operability, and visible focus indicators.
- **WAI-ARIA Authoring Practices Guide (APG)**: [https://www.w3.org/WAI/ARIA/apg/](https://www.w3.org/WAI/ARIA/apg/) — Primary pattern guide for accessible widgets, keyboard navigation, and live region announcements (`aria-live`).
- **React Server Components Specification**: [https://react.dev/reference/rsc/server-components](https://react.dev/reference/rsc/server-components) — Canonical architecture specification for RSC/Client boundaries.
- **TanStack Query Documentation**: [https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults) — Primary standard for async server state caching and explicit cache invalidation.
- **Testing Library Guiding Principles**: [https://testing-library.com/docs/guiding-principles/](https://testing-library.com/docs/guiding-principles/) — Standard methodology for user-outcome component testing via role-based queries.
- **Unicode CLDR Standard**: [https://cldr.unicode.org/](https://cldr.unicode.org/) — Standard repository for locale formatting, date/number patterns, and pluralization rules.
