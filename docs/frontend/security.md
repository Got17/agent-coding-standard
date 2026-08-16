# Frontend Security & Data Protection Standard

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
> ```markdown
> <!-- START AGENT-STANDARD: FRONTEND-SECURITY -->
> ## Frontend Security Rules
> - Never store auth tokens, secrets, or sensitive PII in `localStorage` or `sessionStorage`; use `httpOnly`, `Secure`, `SameSite` cookies via server/BFF.
> - Sanitize all untrusted dynamic HTML before rendering using DOMPurify (`DOMPurify.sanitize()`); avoid `dangerouslySetInnerHTML` unless explicitly sanitized.
> - Enforce Content Security Policy (CSP) headers restricting script sources and disabling unsafe inline scripts (`'unsafe-inline'`, `'unsafe-eval'`).
> - Use Subresource Integrity (`sri` hashes) on external third-party CDN scripts and assets.
> - Validate and restrict external redirect targets against a strict same-origin or explicit domain whitelist to prevent open redirects.
> <!-- END AGENT-STANDARD: FRONTEND-SECURITY -->
> ```

---

## Detailed Human Guide & Rationale

Browsers are untrusted execution environments. Client-side applications must guard against Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), credential theft, and script tampering.

### 1. Token & Session Storage
- **`httpOnly` Cookies Baseline**: Store authentication sessions in `httpOnly`, `Secure`, `SameSite=Lax/Strict` cookies. JavaScript running in the browser cannot read `httpOnly` cookies, mitigating token exfiltration via XSS.
- **No `localStorage` for Secrets**: Never write access tokens, refresh tokens, API keys, or PII into `localStorage` or `sessionStorage`.

### 2. XSS Prevention & HTML Sanitization
- **DOMPurify Sanitization**: When rendering dynamic HTML content from CMSs or user input, sanitize input using `DOMPurify.sanitize()`.
- **Framework Auto-Escaping**: Rely on React/Vue default JSX text node escaping. Avoid bypass primitives like `dangerouslySetInnerHTML` or `v-html` unless wrapped in verified sanitization helpers.

### 3. Content Security Policy (CSP) & Asset Integrity
- **CSP Headers**: Enforce HTTP response headers restricting executable content sources (`default-src 'self'`). Block inline scripts (`script-src 'self' 'nonce-...'`).
- **Subresource Integrity (SRI)**: When loading external CDN assets, include `integrity="sha384-..."` attributes to ensure scripts have not been tampered with.

### 4. Open Redirect Defenses
- **Origin Validation**: When processing dynamic `redirect` query parameters, ensure the target URL matches `window.location.origin` or an explicit trusted domain allowlist. Never perform unvalidated redirects to arbitrary user-supplied URLs.

---

## Primary Evidence & Standards

- **OWASP Cross-Site Scripting (XSS) Prevention Cheat Sheet**: [https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — Primary specification for output encoding and DOMPurify HTML sanitization.
- **OWASP HTML5 Security Cheat Sheet**: [https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) — Standards for modern browser storage security and httpOnly session cookies.
- **W3C Content Security Policy (CSP) Level 3 Specification**: [https://www.w3.org/TR/CSP3/](https://www.w3.org/TR/CSP3/) — Canonical specification for script execution policies and CSP directives.
- **W3C Subresource Integrity (SRI) Specification**: [https://www.w3.org/TR/SRI/](https://www.w3.org/TR/SRI/) — Specification for cryptographic hashing of third-party network resources.
- **Cure53 DOMPurify Specification**: [https://github.com/cure53/DOMPurify](https://github.com/cure53/DOMPurify) — Industry standard library specification for DOM-only XSS sanitization.
