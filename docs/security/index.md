# Security Production Standards

> Comprehensive concept map of enterprise application security, secrets management, supply-chain protection, threat modeling, vulnerability remediation SLAs, and incident response for human developers and AI coding agents.

## Security Concept Map

### 1. Application & API Security
- **[OWASP Top 10 & API Protections](/security/owasp-top-10)**: Web application security (OWASP Top 10), API vulnerability defense (BOLA, BFLA, SSRF), OWASP ASVS 5.0 level-2 verification.
- **[Auth & Session Management](/backend/auth-session)** *(Backend)*: Secure browser cookies vs tokens, CSRF protection, MFA, deny-by-default authorization.
- **[Frontend Security & Data Protection](/frontend/security)** *(Frontend)*: DOMPurify XSS sanitization, httpOnly cookie session auth over `localStorage`, CSP headers, Subresource Integrity (SRI).

### 2. Secrets & Zero-Trust Infrastructure
- **[Secrets Management & Keys](/security/secrets-management)**: Secret definitions, envelope encryption, dynamic Vault storage, automated GitLeaks/TruffleHog scanning, log redaction, emergency key revocation.
- **[Secrets & Zero-Trust Access](/devops/secrets-zerotrust)** *(DevOps)*: Pre-commit secret scanning, dynamic secret injection, workload identity federation (AWS IRSA/GCP WI), default-deny NetworkPolicies, Falco threat detection.

### 3. Supply-Chain & Architecture Protection
- **[Software Supply-Chain Security & SBOMs](/security/supply-chain)**: Automated SAST (CodeQL/Semgrep), dependency scanning (Snyk/Dependabot/Socket), lockfile integrity, dependency pinning, Software Bill of Materials (CycloneDX ECMA-424 / SPDX ISO/IEC 5962).
- **[Threat Modeling & Security Architecture](/security/threat-modeling)**: STRIDE framework (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege), trust boundary mapping, risk scoring.

### 4. Vulnerability Management & Incident Response
- **[Vulnerability Patching SLAs & Incident Response](/security/vulnerability-incident-response)**: Vulnerability remediation SLAs (CRITICAL ≤ 24h, HIGH ≤ 7d, MEDIUM ≤ 30d), secret exposure revocation procedures, CVE tracking, incident playbooks.
