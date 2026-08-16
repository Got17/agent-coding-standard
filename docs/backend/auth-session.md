# Auth & Session Management Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: BACKEND-AUTH -->
## Auth & Session Rules
- Prefer secure server-backed sessions or opaque tokens for browser-facing web apps. Browser session cookies MUST be `HttpOnly`, `Secure`, `SameSite=Lax` or `SameSite=Strict`, and SHOULD use the `__Host-` cookie prefix when the session is host-scoped.
- JWT access tokens are optional, not mandatory. If JWTs are used, verify signature, issuer (`iss`), audience (`aud`), expiration (`exp`), and algorithm allowlists on every protected request.
- Never store session IDs, access tokens, refresh tokens, JWTs, or other credentials in `localStorage` or `sessionStorage`. Use secure cookies for browser sessions; use `Authorization: Bearer` only for non-browser API clients or explicitly designed BFF/service-worker flows.
- Authorization MUST be centralized, deny-by-default, and checked on every protected request. Use RBAC, ABAC, or ReBAC as appropriate, but every protected user-owned or tenant-owned resource MUST enforce BOLA/IDOR checks against trusted server-side auth context.
- Cookie-authenticated browser mutations (`POST`, `PUT`, `PATCH`, `DELETE`) MUST include CSRF protection beyond `SameSite`: synchronizer token, signed double-submit cookie, required custom header with strict CORS, or equivalent framework protection.
- Admin, privileged, and high-risk accounts MUST use MFA. Sensitive operations SHOULD require risk-based step-up or reauthentication.
- Sessions MUST have documented inactivity and absolute lifetime limits, support explicit logout, rotate/renew session identifiers after login and privilege changes, and invalidate sessions on logout, credential reset, suspected compromise, or account disablement.
- Auth failures MUST return the standard flat 5-key error envelope without credential, token, user-existence, or policy details; login, token refresh, authorization denial, logout, and session invalidation events MUST be security-logged with request/user/session correlation IDs and no secrets.
<!-- END AGENT-STANDARD: BACKEND-AUTH -->
```

---

## Detailed Human Guide & Rationale

### 1. Terminology

- **Authentication**: Verifying that a requester controls valid credentials or authenticators for an identity.
- **Authorization**: Deciding whether an authenticated or anonymous requester may perform an action on a resource.
- **Session**: Server-recognized continuity after authentication, usually represented to the client by a session secret.
- **Session ID / Session Secret**: The bearer value that binds the client to the server-side session. Treat it like a password while it is valid.
- **JWT (JSON Web Token)**: A signed token format that can carry claims such as subject, issuer, audience, and expiration. JWT is a format, not a requirement.
- **OIDC (OpenID Connect)**: Identity layer on OAuth 2.0 commonly used for login and identity claims.
- **OAuth 2.0**: Delegated authorization framework for issuing access tokens to clients.
- **MFA (Multi-Factor Authentication)**: Authentication using factors from different categories, such as something the user knows plus something the user has.
- **RBAC (Role-Based Access Control)**: Authorization based on assigned roles such as `admin`, `editor`, or `viewer`.
- **ABAC (Attribute-Based Access Control)**: Authorization based on attributes such as tenant, department, resource status, risk score, or ownership.
- **ReBAC (Relationship-Based Access Control)**: Authorization based on relationships, such as user owns document, user belongs to project, or user manages account.
- **BOLA (Broken Object Level Authorization)**: A failure to verify that the requester may access the specific object requested (OWASP API1:2023).
- **IDOR (Insecure Direct Object Reference)**: A BOLA-style flaw where guessing or changing an object ID exposes another user's resource.
- **BFF (Backend for Frontend)**: Server-side layer dedicated to a frontend that can keep tokens off the browser and expose cookie-backed app endpoints.
- **CSRF (Cross-Site Request Forgery)**: Attack where another site causes a user's browser to send an authenticated state-changing request.
- **XSS (Cross-Site Scripting)**: Injection flaw that lets attacker-controlled JavaScript execute in the application origin.
- **CORS (Cross-Origin Resource Sharing)**: Browser mechanism that controls whether scripts from one origin may call another origin.
- **AAL (Authenticator Assurance Level)**: NIST SP 800-63-4 term for the strength of an authentication event.

---

### 2. Session Transport

Browser-facing applications should prefer secure, server-backed sessions or opaque tokens transported in cookies. A session cookie must be `HttpOnly` so application JavaScript cannot read it, `Secure` so it is sent only over HTTPS, and `SameSite=Lax` or `SameSite=Strict` to reduce cross-site request exposure. Host-scoped cookies should use the `__Host-` prefix with `Path=/`, no `Domain` attribute, and `Secure` (RFC 6265bis).

Do not put session identifiers in URLs, query strings, fragments, logs, analytics events, or client-side storage. URLs leak through browser history, referrers, logs, screenshots, and support tooling. Browser storage such as `localStorage` and `sessionStorage` is readable by any JavaScript running in the origin, so one XSS bug can expose every stored credential.

`Authorization: Bearer` is appropriate for machine-to-machine calls, mobile clients with platform secure storage, CLI tools, and backend-to-backend APIs. For browser apps, use bearer tokens only when there is an explicit design such as a BFF or isolated service-worker token flow that keeps tokens out of normal page JavaScript.

```typescript
// ✅ CORRECT: Production Cookie Configuration with __Host- prefix (RFC 6265bis)
res.cookie('__Host-session_id', sessionSecret, {
  httpOnly: true,     // Prevents XSS credential theft via document.cookie
  secure: true,       // Transmitted over HTTPS only
  sameSite: 'lax',    // Mitigates cross-site request forgery
  path: '/',          // Root path (required for __Host- prefix)
  maxAge: 86400 * 1000 // 24-hour absolute session limit
});
```

---

### 3. Token And Credential Validation

The standard does not require JWTs. A project may use JWT access tokens, opaque access tokens with introspection, or server-side session records. The invariant is that every protected request verifies the credential before authorization runs.

If JWTs are used, handlers or auth middleware must verify:
- signature using trusted public keys / JWKS and expected algorithms only (`RS256`, `ES256`; ban `none` or algorithm confusion)
- `iss` against the trusted issuer string
- `aud` against the receiving API resource indicator
- `exp`, `nbf`, and clock-skew policy ($\le 60\text{s}$)
- token type and intended use (`typ: "at+jwt"` per RFC 9068), so ID tokens are not accepted as API access tokens
- revocation, compromise, or session invalidation state when the risk model requires it

Access tokens should be short-lived (e.g. 15 minutes). Refresh tokens or long-lived session records must be rotated, revocable, and protected more strictly than access tokens.

```typescript
// ✅ CORRECT: Strict JWT validation middleware (RFC 7519 / RFC 9068)
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(new URL('https://auth.example.com/.well-known/jwks.json'));

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: 'https://auth.example.com/',
    audience: 'https://api.example.com/',
    algorithms: ['RS256', 'ES256'], // Explicit algorithm allowlist (bans 'none')
    clockTolerance: 60 // Max 60 seconds clock skew
  });

  // Verify token type to prevent ID token misuse
  if (payload.typ && payload.typ !== 'at+jwt') {
    throw new InvalidTokenError('Invalid token type; access token required');
  }

  return payload;
}
```

---

### 4. Authorization Model (BOLA / IDOR Defense)

Authentication only proves identity. It does not prove the caller may perform the requested action. Authorization must be centralized, deny-by-default, and executed on every protected request.

RBAC is acceptable for coarse-grained capabilities, such as "can access admin console." It is not enough for object-level checks. User-owned and tenant-owned resources must be scoped by trusted server-side auth context:

```typescript
// ✅ CORRECT: Scoped query enforcing BOLA/IDOR protection (OWASP API1:2023)
export async function getOrder(orderId: string, authContext: AuthContext): Promise<Order> {
  const order = await db.orders.findFirst({
    where: {
      id: orderId,
      tenantId: authContext.tenantId, // 🚨 Scoped by trusted server-side tenant
      userId: authContext.userId     // 🚨 Scoped by trusted server-side user
    }
  });

  if (!order) {
    // Return 404 to prevent IDOR scanning and resource enumeration
    throw new NotFoundError('Order', orderId);
  }

  return order;
}
```

Do not rely on client-provided IDs, hidden form fields, route parameters, or UI visibility as proof of authorization. A user who can guess `/orders/123` must still fail if order `123` belongs to another user or tenant.

---

### 5. CSRF Protection

Cookie-authenticated browsers automatically attach cookies to matching requests. That is useful for session continuity, but it creates CSRF risk for state-changing endpoints.

Every cookie-authenticated mutation must use at least one explicit anti-CSRF control in addition to `SameSite`:
- framework-provided synchronizer token pattern
- signed double-submit cookie bound to the authenticated session
- required custom CSRF header for API requests (e.g. `X-CSRF-Token`), paired with strict CORS origin allowlists
- W3C Fetch Metadata checks (`Sec-Fetch-Site: same-origin`) as defense in depth for modern browsers

```typescript
// ✅ CORRECT: Custom CSRF header & CORS validation middleware
export function validateCsrfHeader(req: Request, res: Response, next: NextFunction) {
  // Safe HTTP methods do not require CSRF token validation
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const customHeader = req.headers['x-csrf-token'];
  const expectedToken = req.session?.csrfToken;

  if (!customHeader || !expectedToken || customHeader !== expectedToken) {
    return res.status(403).json({
      code: 'PERMISSION_DENIED',
      message: 'Invalid or missing CSRF token',
      details: [],
      timestamp: new Date().toISOString(),
      request_id: req.id
    });
  }

  next();
}
```

---

### 6. MFA, Step-Up, And Reauthentication

MFA should be mandatory for administrators, privileged operators, staff tooling, production access, billing access, security settings, and other high-risk accounts. Public consumer products may choose optional or risk-triggered MFA for lower-risk users, but the system must support stronger authentication for sensitive operations.

Require step-up authentication or reauthentication before operations such as:
- password, email, MFA, or recovery-method changes
- privilege or role changes
- payment, payout, transfer, export, or destructive bulk actions
- suspicious device, geography, velocity, or session anomaly events

Session policies must define both inactivity timeout (e.g. 30 minutes) and absolute lifetime (e.g. 24 hours). Successful reauthentication can refresh the session according to the documented policy; timeout expiry, logout, account disablement, credential reset, or suspected compromise must invalidate the relevant sessions.

---

### 7. Logging And Error Handling

Authentication and authorization events are security events. Log login success/failure, token refresh, session creation, logout, authorization denial, privilege change, session invalidation, and reauthentication. Logs must include request ID, trace/correlation ID (`traceparent`), user ID when known, session ID hash or stable internal session reference, source IP, user agent, and outcome.

Do not log passwords, session IDs, access tokens, refresh tokens, authorization headers, raw cookies, MFA codes, recovery codes, or private claims.

External auth failures must be generic. Do not reveal whether a username exists, which credential failed, why a token was rejected, or which authorization policy denied access. Return the standard backend 5-key error envelope with safe codes aligned with `docs/backend/api-design.md`:

| HTTP Status | Standard `code` | Scenario |
| :--- | :--- | :--- |
| **`401 Unauthorized`** | `UNAUTHENTICATED` | Missing or invalid authentication credentials, expired token, or invalid session. |
| **`403 Forbidden`** | `PERMISSION_DENIED` | Authenticated requester lacks permission for the resource, tenant, or action. |
| **`429 Too Many Requests`** | `RATE_LIMIT_EXCEEDED` | Authentication rate limit or brute-force threshold exceeded (`Retry-After` header required). |

---

### 8. Review Checklist

- [ ] Browser sessions use `HttpOnly`, `Secure`, `SameSite=Lax/Strict` cookies; host-scoped sessions use `__Host-` where feasible.
- [ ] No credentials, session IDs, JWTs, access tokens, or refresh tokens are stored in `localStorage` or `sessionStorage`.
- [ ] JWTs are verified for signature, algorithm, issuer, audience, expiration, and intended use (`typ: "at+jwt"`).
- [ ] Refresh/session renewal is rotated, revocable, and invalidated on logout and compromise events.
- [ ] Authorization is deny-by-default and checked on every protected request.
- [ ] Protected object queries are scoped by trusted user/tenant context to prevent BOLA/IDOR (OWASP API1:2023).
- [ ] Cookie-authenticated mutations have CSRF protection beyond `SameSite`.
- [ ] MFA is mandatory for admin/high-risk accounts; sensitive actions trigger step-up or reauthentication.
- [ ] Session inactivity and absolute timeout policies are documented.
- [ ] Auth logs contain correlation metadata but never secrets.

---

## Evidence / References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): Establishes cookies as the preferred session ID exchange mechanism for web apps, requires HTTPS and secure cookie attributes, warns against URL/session leakage, and bans browser storage for credentials.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): Supports deny-by-default authorization, defense in depth, per-request permission validation, and ABAC/ReBAC consideration beyond RBAC.
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html): Requires CSRF controls on state-changing requests for cookie-authenticated applications and treats `SameSite` as only part of the defense.
- [OWASP API Security Top 10 2023 — API1:2023 Broken Object Level Authorization](https://owasp.org/www-project-api-security/): Official threat guide for BOLA/IDOR vulnerabilities and server-side scoping mitigation.
- [NIST SP 800-63-4 / SP 800-63B: Digital Identity Guidelines — Session Management](https://pages.nist.gov/800-63-4/sp800-63b/session/): Defines session secrets, session timeout concepts, reauthentication, and Authenticator Assurance Levels (AAL).
- [RFC 6265bis: HTTP State Management Mechanism](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis): IETF draft specification establishing cookie attributes (`HttpOnly`, `Secure`, `SameSite`) and `__Host-` cookie prefixes.
- [RFC 7519: JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519): Official IETF standard for JWT structure, claims (`iss`, `aud`, `exp`), and validation requirements.
- [RFC 9068: JWT Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068): Standardized JWT profile for access tokens, including `typ: "at+jwt"` token identification.
- [RFC 9700: OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/info/rfc9700/): Current OAuth 2.0 security BCP for token and authorization-flow threat mitigation.
- [W3C Fetch Metadata Request Headers](https://www.w3.org/TR/fetch-metadata/): Recommendation for `Sec-Fetch-Site`, `Sec-Fetch-Mode`, and `Sec-Fetch-Dest` headers for defense-in-depth CSRF prevention.
