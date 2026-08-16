# Frontend Production Standards Overview

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
> ```markdown
> <!-- START AGENT-STANDARD: FRONTEND-OVERVIEW -->
> ## Frontend Production Standards Baseline
> - Follow modular component architecture separating pure presentation from container/hook logic.
> - Enforce Core Web Vitals targets at p75 mobile: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1.
> - Secure client applications: httpOnly cookies for session storage, DOMPurify for HTML sanitization, strict CSP headers.
> - Guarantee accessibility: WCAG 2.2 AA compliance, visible focus indicators, semantic HTML first.
> - Decouple server state (TanStack Query/SWR) from client UI state (Zustand/URL params).
> - Test using Testing Library queries (`getByRole`), MSW network mocks, and Playwright E2E suites.
> <!-- END AGENT-STANDARD: FRONTEND-OVERVIEW -->
> ```

---

## Detailed Human Guide & Rationale

This directory defines the production standards for building high-reliability, fast, secure, accessible, and maintainable web applications.

### Core Frontend Pillars

1. **[React & Next.js Standard](./react-nextjs.md)**
   Component composition, Server Components (RSC) vs Client Component boundaries, hydration hygiene, and hooks discipline.

2. **[Next.js App Router Structure](./nextjs-frontend-structure.md)**
   Standard project layout, route groups `(group)`, private folders `_folder`, server-only data access layer, and CI build safety.

3. **[State Management](./state-management.md)**
   Server state vs. Client state separation, URL as authoritative state, zero state duplication, and mutation invalidation strategies.

4. **[Styling & UI Architecture](./css-ui.md)**
   CSS custom properties (design tokens), scoped component styling, dark mode tokenization, and responsive design systems.

5. **[Web Performance & Core Web Vitals](./web-performance.md)**
   Mobile p75 SLA targets (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1), dynamic code splitting, image formatting, and asset preloading.

6. **[Frontend Security & Data Protection](./security.md)**
   DOMPurify XSS sanitization, httpOnly cookie auth over `localStorage`, Content Security Policy (CSP), Subresource Integrity (SRI), and redirect origin whitelists.

7. **[Accessibility (a11y) & UX Invariants](./accessibility.md)**
   WCAG 2.2 AA (4.5:1 contrast), WAI-ARIA authoring practices, focus management (`outline`), and `aria-live` announcements.

8. **[Forms, Validation & User Input](./forms-validation.md)**
   Schema-driven validation (Zod/Valibot), accessible field error linkage (`aria-describedby`, `aria-invalid`), and client/server validation sync.

9. **[Frontend Testing & Automated QA](./testing-qa.md)**
   Testing pyramid (Vitest unit testing, React Testing Library interaction, MSW network mocking, Playwright E2E, `axe-core` accessibility checks, and visual regression).

10. **[Internationalization (i18n) & Localization](./i18n-localization.md)**
    Locale routing, ICU message formatting, browser `Intl` APIs, Right-to-Left (RTL) layout switching, and translation file hygiene.

---

## Primary Evidence & Standards

- **W3C Web Architecture Guidelines**: [https://www.w3.org/TR/webarch/](https://www.w3.org/TR/webarch/) — World Wide Web Architecture fundamentals for client/server web apps.
- **Google Web Vitals Specification**: [https://web.dev/vitals/](https://web.dev/vitals/) — Primary specification for Core Web Vitals user experience metrics.
- **OWASP Web Security Testing Guide (WSTG)**: [https://owasp.org/www-project-web-security-testing-guide/](https://owasp.org/www-project-web-security-testing-guide/) — Standard methodology for web frontend security testing.
- **W3C Web Content Accessibility Guidelines (WCAG) 2.2**: [https://www.w3.org/TR/WCAG22/](https://www.w3.org/TR/WCAG22/) — Canonical standard for digital accessibility.
