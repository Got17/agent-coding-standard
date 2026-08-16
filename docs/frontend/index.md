# Frontend Production Standards

> Comprehensive concept map of frontend component architecture, state management, web performance, accessibility, security, and testing standards for human developers and AI coding agents.

## Frontend Concept Map

### 1. Core Architecture & Frameworks
- **[React & Next.js Standard](/frontend/react-nextjs)**: Component composition, Server Components (RSC) vs Client Component boundaries, hydration hygiene, hooks discipline.
- **[Next.js App Router Structure](/frontend/nextjs-frontend-structure)**: Standard project layout, route groups `(group)`, private folders `_folder`, server-only data access layer, CI build safety.
- **[General Architecture Patterns](/general/architecture-patterns)** *(General)*: Layered component boundaries, dependency separation, modular UI layering.

### 2. State & Styling Architecture
- **[State Management](/frontend/state-management)**: Server state vs client state separation, URL search parameters as authoritative UI state, zero state duplication, mutation invalidation.
- **[Styling & UI Architecture](/frontend/css-ui)**: CSS custom properties (design tokens), scoped component styling, dark mode tokenization, responsive design systems.

### 3. Performance & Optimization
- **[Web Performance & Core Web Vitals](/frontend/web-performance)**: Mobile p75 SLA targets (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1), dynamic code splitting, image formatting, asset preloading.

### 4. Security, Auth & Input Validation
- **[Frontend Security & Data Protection](/frontend/security)**: DOMPurify XSS sanitization, httpOnly cookie auth over `localStorage`, Content Security Policy (CSP), Subresource Integrity (SRI), redirect origin whitelists.
- **[Forms, Validation & User Input](/frontend/forms-validation)**: Schema-driven validation (Zod/Valibot), accessible field error linkage (`aria-describedby`, `aria-invalid`), client/server validation sync.
- **[OWASP Top 10 Protections](/security/owasp-top-10)** *(Security)*: Cross-site scripting (XSS) prevention, CSRF mitigation, secure header configurations.

### 5. Quality, Accessibility & Operations
- **[Accessibility (a11y) & UX Invariants](/frontend/accessibility)**: WCAG 2.2 AA (4.5:1 contrast), WAI-ARIA authoring practices, focus management (`outline`), `aria-live` announcements.
- **[Frontend Testing & Automated QA](/frontend/testing-qa)**: Vitest unit testing, React Testing Library interaction, MSW network mocking, Playwright E2E, `axe-core` a11y checks, visual regression.
- **[Internationalization (i18n) & Localization](/frontend/i18n-localization)**: Locale routing, ICU message formatting, browser `Intl` APIs, Right-to-Left (RTL) layout switching, translation file hygiene.
