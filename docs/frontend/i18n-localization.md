# Internationalization (i18n) & Localization Standard

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
> ```markdown
> <!-- START AGENT-STANDARD: FRONTEND-I18N -->
> ## Internationalization (i18n) & Localization Rules
> - Externalize all user-facing strings into structured translation dictionaries; never hardcode display strings in component JSX.
> - Format dates, times, currencies, percentages, and numbers using native browser `Intl` APIs (`Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`).
> - Use ICU MessageFormat standard for pluralization, gender formatting, and dynamic variable interpolation.
> - Support Right-to-Left (RTL) locales by using logical CSS properties (`margin-inline-start`, `padding-block-end`) and dynamic `dir="rtl"` root attributes.
> - Implement locale-aware routing (`/[locale]/...` or `Accept-Language` headers) with explicit canonical tags for SEO indexing across regions.
> <!-- END AGENT-STANDARD: FRONTEND-I18N -->
> ```

---

## Detailed Human Guide & Rationale

Internationalization (i18n) ensures applications can adapt to different languages, regional formatting rules, and bidirectional text layouts without architectural refactoring.

### 1. Translation Externalization & Key Architecture
- **Dictionary Files**: Store translations in structured JSON/PO files grouped by feature or domain namespace (e.g., `locales/en/common.json`, `locales/es/common.json`).
- **ICU Syntax**: Use ICU MessageFormat syntax for dynamic variable interpolation, plural rules, and gender selection rather than manual string concatenation:
  ```json
  {
    "cart_items": "{count, plural, =0 {No items} one {# item} other {# items}}"
  }
  ```

### 2. Browser Native `Intl` Formatting Baseline
- **Zero Heavy Dependencies**: Prefer native JavaScript `Intl` APIs over heavy external date/number formatting libraries whenever possible:
  - `Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })`
  - `Intl.DateTimeFormat(locale, { dateStyle: 'full' })`
  - `Intl.RelativeTimeFormat(locale, { numeric: 'auto' })`

### 3. Bidirectional Layouts (RTL) & Logical CSS
- **Logical CSS Properties**: Avoid physical directional properties (`margin-left`, `right: 0`). Use logical CSS properties (`margin-inline-start`, `inset-inline-end`) so layouts mirror automatically when `dir="rtl"` is active.
- **Document Direction**: Ensure the root `<html>` tag updates `lang` and `dir` attributes dynamically based on the active locale (e.g., `<html lang="ar" dir="rtl">`).

### 4. Locale Routing & SEO
- **Locale Route Segments**: Structure URLs with explicit locale prefixes (`/en-US/dashboard`, `/fr/dashboard`) or handle localized subdomains.
- **`hreflang` Links**: Include `<link rel="alternate" hreflang="x" href="...">` headers and HTML tags to inform search engines of localized page variants.

---

## Primary Evidence & Standards

- **Unicode Common Locale Data Repository (CLDR)**: [https://cldr.unicode.org/](https://cldr.unicode.org/) — Canonical international standard for locale formatting rules, date/number patterns, and pluralizations.
- **W3C Internationalization (i18n) Activity Guidelines**: [https://www.w3.org/International/](https://www.w3.org/International/) — Official W3C web standards for multilingual web applications and RTL text handling.
- **MDN Web Docs — JavaScript `Intl` Standard Objects**: [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) — Specification for ECMAScript Internationalization API.
- **FormatJS ICU MessageFormat Specification**: [https://formatjs.io/docs/core-concepts/icu-syntax/](https://formatjs.io/docs/core-concepts/icu-syntax/) — Standard message syntax specification for complex plural and select formatting.
