# Accessibility (a11y) & UX Invariants Standard

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
> ```markdown
> <!-- START AGENT-STANDARD: FRONTEND-A11Y -->
> ## Accessibility (a11y) Rules
> - Target WCAG 2.2 Level AA compliance as the non-negotiable accessibility baseline.
> - Ensure visual text contrast ratios meet minimum 4.5:1 for standard text and 3:1 for large text/UI components.
> - Maintain visible keyboard focus indicators (`outline`/`ring`); never remove focus outlines (`outline: none`) without providing an explicit accessible alternative.
> - Use native semantic HTML elements (`<button>`, `<a>`, `<input>`, `<nav>`) before reaching for custom `<div>` + ARIA widgets.
> - Announce dynamic asynchronous UI updates (toasts, validation errors, live search results) using `aria-live="polite"` or `aria-live="assertive"`.
> <!-- END AGENT-STANDARD: FRONTEND-A11Y -->
> ```

---

## Detailed Human Guide & Rationale

Accessibility ensures that software can be used effectively by everyone, including people relying on screen readers, keyboard-only navigation, screen magnifiers, or high-contrast display modes.

### 1. WCAG 2.2 AA Baseline & Color Contrast
- **Text Contrast**: Normal body text must meet a minimum contrast ratio of **4.5:1** against its background. Large text (≥ 24px regular or ≥ 18.5px bold) and graphical UI components must meet **3:1**.
- **Non-Color Information**: Never rely on color alone to communicate state, errors, or system status (e.g., pair color badges with icons or text labels).

### 2. Focus Management & Keyboard Navigation
- **Visible Focus States**: Focus indicators are essential for keyboard navigation. `outline: 0` or `outline: none` without a visible `:focus-visible` replacement is strictly forbidden.
- **Logical Tab Order**: Interactive elements must follow logical DOM order. Use `tabindex="0"` for custom interactive elements and `tabindex="-1"` for programmatically focused containers. Never use positive `tabindex` values.

### 3. Semantic HTML Over ARIA
- **First Rule of ARIA**: Use native HTML elements (`<button>`, `<a>`, `<dialog>`, `<header>`) whenever available. Only use ARIA roles (`role="button"`, `role="dialog"`) when native semantics cannot achieve the required behavior.
- **Accessible Names**: All interactive controls must have accessible names via visible text content, `aria-label`, or `aria-labelledby`.

### 4. Dynamic Feedback & Live Regions
- **Asynchronous Feedback**: Screen reader users must be informed of background operations, toast notifications, and form validation errors using `aria-live="polite"` (for non-intrusive status updates) or `aria-live="assertive"` (for critical errors).

---

## Primary Evidence & Standards

- **W3C Web Content Accessibility Guidelines (WCAG) 2.2**: [https://www.w3.org/TR/WCAG22/](https://www.w3.org/TR/WCAG22/) — Primary international specification for web accessibility requirements.
- **WAI-ARIA Authoring Practices Guide (APG)**: [https://www.w3.org/WAI/ARIA/apg/](https://www.w3.org/WAI/ARIA/apg/) — Official design patterns and keyboard interaction conventions for accessible web widgets.
- **W3C Accessible Rich Internet Applications (WAI-ARIA) 1.2**: [https://www.w3.org/TR/wai-aria-1.2/](https://www.w3.org/TR/wai-aria-1.2/) — Technical specification for ARIA roles, states, and properties.
- **axe-core Accessibility Rules Engine**: [https://github.com/dequelabs/axe-core](https://github.com/dequelabs/axe-core) — Automated accessibility auditing rules mapping to WCAG 2.2 AA.
