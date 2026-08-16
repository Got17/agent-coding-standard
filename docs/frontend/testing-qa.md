# Frontend Testing & Automated QA Standard

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
> ```markdown
> <!-- START AGENT-STANDARD: FRONTEND-TESTING -->
> ## Frontend Testing & QA Rules
> - Structure test coverage across the testing pyramid: unit logic (Vitest/Jest), component interactions (React Testing Library), network mocking (MSW), and E2E user flows (Playwright).
> - Query UI elements by accessible role (`getByRole('button', { name: /submit/i })`) or label (`getByLabelText`) rather than implementation details (`getByTestId`, CSS selectors).
> - Mock HTTP network layers cleanly using Mock Service Worker (MSW) at the network boundary instead of mocking internal fetch/axios module functions.
> - Run automated accessibility checks in component tests using `axe-core` (`vitest-axe` or `@axe-core/playwright`).
> - Run E2E smoke tests in isolated CI environments against real or realistically seeded backend data before production deployment.
> <!-- END AGENT-STANDARD: FRONTEND-TESTING -->
> ```

---

## Detailed Human Guide & Rationale

Frontend tests must give developers high confidence that the application works for users without introducing brittle test setups that break during refactoring.

### 1. The Frontend Testing Pyramid
- **Unit Tests (Vitest / Jest)**: Test pure functions, hooks, state reducers, utility formatters, and domain logic in isolation. Fast execution (< 100ms per file).
- **Component Tests (React Testing Library)**: Test user interaction and component rendering. Verify that components render expected UI states and handle events correctly.
- **Network Layer Mocking (MSW)**: Use Mock Service Worker to intercept network requests at the `fetch`/`XMLHttpRequest` level. MSW ensures components execute identical network parsing code in tests as in production.
- **E2E Smoke & Integration Tests (Playwright)**: Test critical user journeys (authentication, checkout, form submission, navigation) end-to-end in real browser environments.

### 2. User-Outcome Querying Discipline
- **Query Priorities**: Select DOM elements using queries that mimic how users and screen readers find elements:
  1. `getByRole` (e.g., `getByRole('button', { name: 'Save' })`)
  2. `getByLabelText`
  3. `getByPlaceholderText`
  4. `getByText`
  5. `getByTestId` (*last resort for dynamic non-semantic content*)
- **Ban Implementation Coupling**: Avoid testing internal state, component instance variables, or CSS class names.

### 3. Automated Accessibility & Visual Regression
- **`axe-core` Automated Audits**: Integrate `axe-core` into component and E2E test runs to catch common accessibility violations (missing labels, low contrast, invalid ARIA attributes) automatically in CI.
- **Visual Regression Testing**: Run visual snapshot comparisons (Chromatic, Percy, or Playwright `toHaveScreenshot()`) for shared design design system components to catch unintended layout shifts or style breakage.

---

## Primary Evidence & Standards

- **Testing Library Guiding Principles**: [https://testing-library.com/docs/guiding-principles/](https://testing-library.com/docs/guiding-principles/) — Canonical testing methodology emphasizing user-centric component testing.
- **Mock Service Worker (MSW) v2 Specification**: [https://mswjs.io/](https://mswjs.io/) — Industry standard specification for API mocking via Service Workers and class-based interceptors.
- **Playwright Testing Framework Specification**: [https://playwright.dev/](https://playwright.dev/) — Modern end-to-end browser automation standard.
- **axe-core Accessibility Testing Engine**: [https://github.com/dequelabs/axe-core](https://github.com/dequelabs/axe-core) — Primary rule engine for automated accessibility verification.
