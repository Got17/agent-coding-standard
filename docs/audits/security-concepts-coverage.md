# Security Concepts Coverage Audit

Date: 2026-08-15

## Scope

This audit checks whether the security documentation section covers essential universal concepts for enterprise application security, secrets management, supply-chain protection, threat modeling, and incident response. It audits the full security section, including:

- `docs/security/secrets-management.md`
- `docs/security/owasp-top-10.md`
- `templates/AGENTS-devops.md`
- Related cross-cutting backend (`docs/backend/auth-session.md`) and frontend (`docs/frontend/security.md`) standards

## Verdict

The security section has one outstanding, fully realized canonical standard:
1. `docs/security/secrets-management.md` — A 154-line comprehensive standard covering secret definitions, cloud vault storage, envelope encryption, dynamic vs. static secrets, automated GitLeaks/TruffleHog scanning, log redaction, and incident revocation.

However, **`docs/security/owasp-top-10.md` is currently a 17-line stub**, there is **no `docs/security/index.md` navigation entry point**, and essential enterprise security domains like **Software Supply-Chain Security & SBOMs**, **Architectural Threat Modeling (STRIDE)**, and **Vulnerability Remediation SLAs & Incident Response** do not yet have dedicated topic pages or clear cross-references.

Following our evidence research and grilling session, the plan is to expand `owasp-top-10.md` into a comprehensive Application & API Security standard (aligned with OWASP ASVS 5.0 and API Top 10 2023), add dedicated pages for **Supply-Chain Security** (`docs/security/supply-chain.md`), **Threat Modeling** (`docs/security/threat-modeling.md`), and **Vulnerability Incident Response** (`docs/security/vulnerability-incident-response.md`), and create `docs/security/index.md` as the canonical navigation hub.

## Coverage Matrix

| Essential Concept | Why It Is Essential | Current Coverage | Status | Recommended Doc Action | Primary Evidence / Standards |
|---|---|---|---|---|---|
| **1. Secrets Management & Key Lifecycle** | Hardcoded secrets or unencrypted keys allow attackers to bypass authentication, decrypt data, and compromise production infrastructure. | `docs/security/secrets-management.md` (154 lines); `templates/AGENTS-devops.md` | Covered | Keep `secrets-management.md` as canonical standard. | [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html); NIST SP 800-57 Part 1 Rev. 5. |
| **2. Application Security & Web Vulnerability Defense** | Web vulnerabilities (SQLi, XSS, CSRF, SSRF, broken access control) expose data and application logic to unauthorized execution. | `docs/security/owasp-top-10.md` stub; `docs/frontend/security.md` | Partially covered | Expand `docs/security/owasp-top-10.md` into a complete Application Security Standard grounded in OWASP Top 10 (2021) and OWASP ASVS (Application Security Verification Standard) 5.0 level-2 controls. | [OWASP ASVS 5.0 Specification](https://owasp.org/www-project-application-security-verification-standard/); [OWASP Top 10 2021](https://owasp.org/Top10/). |
| **3. API Security & Object Authorization** | Modern APIs suffer from Broken Object Level Authorization (BOLA), mass assignment, and rate limit exhaustion that bypass traditional perimeter security. | `docs/backend/api-design.md`; `docs/backend/auth-session.md` | Partially covered | Add a dedicated API Security section inside `docs/security/owasp-top-10.md` covering OWASP API Security Top 10 (2023) risks (BOLA API1, BFLA API5, resource limits API4, SSRF API7). | [OWASP API Security Top 10 (2023)](https://owasp.org/www-project-api-security/); NIST SP 800-204B. |
| **4. Software Supply-Chain Security & SBOMs** | Compromised third-party packages, malicious dependencies, or un-scanned build pipelines risk widespread supply-chain compromise. | `templates/AGENTS-devops.md`; `docs/general/code-review-checklist.md` | Partially covered in templates | Create standalone [`docs/security/supply-chain.md`](file:///D:/Coding/projects/agent-coding-standard/docs/security/supply-chain.md) covering automated SAST (CodeQL/Semgrep), dependency scanning (Snyk/Dependabot/Socket), lockfile integrity, dependency pinning, and Software Bill of Materials (SBOM) generation using CycloneDX (ECMA-424) or SPDX (ISO/IEC 5962). | [NIST SSDF SP 800-218](https://csrc.nist.gov/publications/detail/sp/800-218/final); Executive Order 14028; CycloneDX (ECMA-424) / SPDX (ISO/IEC 5962). |
| **5. Threat Modeling & Security Architecture** | Security flaws introduced at the design stage are expensive to remediate in production without early structural analysis. | `docs/general/architecture-patterns.md` | Missing as dedicated page | Create standalone [`docs/security/threat-modeling.md`](file:///D:/Coding/projects/agent-coding-standard/docs/security/threat-modeling.md) mandating lightweight STRIDE threat modeling (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege), trust boundary mapping, and risk scoring for major architectural changes. | OWASP Threat Modeling Process; Microsoft STRIDE Threat Model. |
| **6. Vulnerability Remediation SLAs & Incident Response** | Undocumented patching timelines or missing incident playbooks lead to prolonged exposure windows and chaotic breach handling. | `docs/security/secrets-management.md` §11 (Secret Revocation) | Partially covered | Create standalone [`docs/security/vulnerability-incident-response.md`](file:///D:/Coding/projects/agent-coding-standard/docs/security/vulnerability-incident-response.md) defining strict vulnerability patching SLAs (CRITICAL ≤ 24h, HIGH ≤ 7d, MEDIUM ≤ 30d), secret exposure revocation procedures, CVE tracking, and incident playbooks. | NIST SP 800-61 Rev. 2 (Computer Security Incident Handling Guide); CISA Vulnerability Remediation SLAs. |
| **7. Zero-Trust Architecture & Workload Identity** | Shared admin keys or unrestricted internal network access allow attackers to move laterally upon initial breach. | `templates/AGENTS-devops.md` §5; `docs/security/secrets-management.md` | Partially covered in DevOps & Secrets | Cross-link Zero-Trust principles (workload identity IRSA/GCP WI, default-deny NetworkPolicies, Falco runtime detection) from `docs/security/index.md`. | [NIST SP 800-207 Zero Trust Architecture](https://csrc.nist.gov/publications/detail/sp/800-207/final); CISA Zero Trust Maturity Model. |
| **8. Authentication, Session Management & Authorization** | Weak password hashing, missing MFA, or insecure session tokens lead to account takeover and credential stuffing attacks. | `docs/backend/auth-session.md` (Expanded standard) | Covered | Cross-link `docs/backend/auth-session.md` as canonical authentication & session standard from Security index. | NIST SP 800-63B Digital Identity Guidelines; OWASP ASVS 5.0 V2/V3. |
| **9. Cryptographic Standards & Key Protection** | Weak ciphers, static encryption keys, or un-encrypted data at rest expose sensitive user data during storage leaks. | `docs/security/secrets-management.md` §1-3 | Covered | Cross-link TLS 1.3, AES-256-GCM data-at-rest encryption, and KMS envelope encryption guidelines from Security index. | NIST SP 800-57 Part 1 Rev. 5 (Recommendation for Key Management); FIPS 140-3. |
| **10. Security Navigation & Section Index** | Developers and AI agents need a single entry point mapping all application, infrastructure, secret, and compliance security standards. | None | Missing | Create [`docs/security/index.md`](file:///D:/Coding/projects/agent-coding-standard/docs/security/index.md) as the canonical navigation and overview page for the Security section. | Repo standard documentation structure requirement. |

---

## Security Section Gaps & Action Plan

### High Priority (Critical Stubs to Expand & Navigation Entry)

1. **Create [`docs/security/index.md`](file:///D:/Coding/projects/agent-coding-standard/docs/security/index.md)**
   Provide a single navigation entry point for all Security standards, cross-linking backend auth, secrets management, container security, and frontend security.

2. **Expand [`docs/security/owasp-top-10.md`](file:///D:/Coding/projects/agent-coding-standard/docs/security/owasp-top-10.md)**
   Transform the 17-line stub into a comprehensive Application & API Security Standard grounded in OWASP Top 10 (2021), OWASP API Security Top 10 (2023), and OWASP ASVS 5.0 level-2 controls.

### Medium Priority (New Pages to Add)

3. **Create [`docs/security/supply-chain.md`](file:///D:/Coding/projects/agent-coding-standard/docs/security/supply-chain.md)**
   Document software supply-chain security: automated SAST (CodeQL/Semgrep), dependency scanning (Snyk/Dependabot/Socket), lockfile integrity, dependency pinning, and Software Bill of Materials (SBOM) generation using CycloneDX (ECMA-424) or SPDX (ISO/IEC 5962).

4. **Create [`docs/security/threat-modeling.md`](file:///D:/Coding/projects/agent-coding-standard/docs/security/threat-modeling.md)**
   Document architectural threat modeling: STRIDE framework, trust boundary mapping, data flow analysis, and security design reviews before major feature implementation.

5. **Create [`docs/security/vulnerability-incident-response.md`](file:///D:/Coding/projects/agent-coding-standard/docs/security/vulnerability-incident-response.md)**
   Document vulnerability patching SLAs (CRITICAL ≤ 24h, HIGH ≤ 7d, MEDIUM ≤ 30d), secret exposure revocation procedures, CVE tracking, and security incident response playbooks.

---

## Primary Evidence Log

- **OWASP Application Security Verification Standard (ASVS 5.0)**: [https://owasp.org/www-project-application-security-verification-standard/](https://owasp.org/www-project-application-security-verification-standard/) — Released May 2025. Primary technical verification framework containing ~350 security requirements across 17 chapters.
- **OWASP API Security Top 10 (2023)**: [https://owasp.org/www-project-api-security/](https://owasp.org/www-project-api-security/) — Primary specification for API-specific security risks including BOLA (API1), BFLA (API5), and SSRF (API7).
- **NIST SSDF SP 800-218 (Secure Software Development Framework)**: [https://csrc.nist.gov/publications/detail/sp/800-218/final](https://csrc.nist.gov/publications/detail/sp/800-218/final) — Aligned with Executive Order 14028. Primary framework for secure software development, supply-chain verification, and build transparency.
- **CycloneDX (ECMA-424) & SPDX (ISO/IEC 5962) Specifications**: [https://cyclonedx.org/](https://cyclonedx.org/) — Industry-standard machine-readable formats for Software Bill of Materials (SBOM) generation and vulnerability tracking.
- **NIST SP 800-207 (Zero Trust Architecture)**: [https://csrc.nist.gov/publications/detail/sp/800-207/final](https://csrc.nist.gov/publications/detail/sp/800-207/final) — Primary specification for zero-trust microsegmentation, workload identity, and least-privilege network access controls.
- **NIST SP 800-61 Rev. 2 (Computer Security Incident Handling Guide)**: [https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final](https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final) — Primary operational guide for incident handling, vulnerability response, and post-incident analysis.
- **OWASP Secrets Management Cheat Sheet**: [https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) — Primary specification for vault storage, dynamic secret injection, and secret scanning.
