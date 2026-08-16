# Security, Secrets Management & Zero-Trust Standard

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
```markdown
<!-- START AGENT-STANDARD: DEVOPS-SECRETS-ZEROTRUST -->
## Secrets & Zero-Trust Rules
- Never commit hardcoded secrets; enforce pre-commit scanning (GitLeaks/TruffleHog).
- Inject secrets dynamically at runtime via secret stores (Vault, External Secrets Operator, SOPS) or OIDC workload identity (IRSA).
- Enforce default-deny NetworkPolicies for all pod workloads.
<!-- END AGENT-STANDARD: DEVOPS-SECRETS-ZEROTRUST -->
```

---

## Detailed Human Guide & Rationale
*(Detailed guide to be authored collaboratively)*

### 1. Pre-Commit & Pipeline Secret Scanning
*(Guidelines for automated pre-commit hooks and CI secret scanning)*

### 2. Runtime Secret Injection & Workload Identity
*(Guidelines for Vault, External Secrets Operator, AWS IRSA / GCP Workload Identity)*

### 3. Zero-Trust Network Microsegmentation & Runtime Security
*(Guidelines for default-deny K8s NetworkPolicies and Falco threat detection)*

---

## Primary Evidence & References
- **NIST SP 800-207 (Zero Trust Architecture)**: https://csrc.nist.gov/publications/detail/sp/800-207/final
- **OWASP Secrets Management Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
