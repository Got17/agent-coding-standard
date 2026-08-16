# Software Supply-Chain Security & SBOMs Standard

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
```markdown
<!-- START AGENT-STANDARD: SECURITY-SUPPLY-CHAIN -->
## Supply-Chain Security Rules
- Pin dependency versions and lockfiles; reject floating third-party tags or un-checksummed packages.
- Run automated SAST (CodeQL/Semgrep) and dependency scanning (Snyk/Dependabot/Socket) in CI gates.
- Generate Software Bill of Materials (SBOM) artifacts in CycloneDX (ECMA-424) or SPDX format during build releases.
<!-- END AGENT-STANDARD: SECURITY-SUPPLY-CHAIN -->
```

---

## Detailed Human Guide & Rationale
*(Detailed guide to be authored collaboratively)*

### 1. Static Analysis (SAST) & Dependency Vulnerability Scanning
*(Integrating CodeQL, Semgrep, Snyk, and Dependabot into automated CI/CD pipeline gates)*

### 2. Lockfile Integrity, Package Pinning & Registry Safety
*(Enforcing strict package checksums, private registry proxies, and lockfile validation)*

### 3. Software Bill of Materials (SBOM) Generation & Compliance
*(Generating CycloneDX ECMA-424 and SPDX ISO/IEC 5962 SBOM specifications for release compliance)*

---

## Primary Evidence & References
- **NIST SSDF SP 800-218 (Secure Software Development Framework)**: https://csrc.nist.gov/publications/detail/sp/800-218/final
- **CycloneDX Specification (ECMA-424)**: https://cyclonedx.org/
- **SPDX License & SBOM Standard (ISO/IEC 5962)**: https://spdx.dev/
