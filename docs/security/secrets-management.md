# Secrets Management & Keys Standard

> **AI Copy Block (`AGENTS.md`)**
```markdown
<!-- AI-COPY-BLOCK -->
<!-- START AGENT-STANDARD: SECURITY-SECRETS -->
## Secrets Management Rules
- Treat anything that grants access, proves identity, signs trust, decrypts data, or enables privileged operations as a secret: API keys, passwords, database URLs, OAuth client secrets, webhook secrets, session secrets, private keys, signing keys, encryption keys, recovery codes, certificates, production `.env` values, and CI/CD credentials.
- Production secrets MUST be stored in a managed secret store or vault such as AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault, Doppler, 1Password Secrets Automation, Kubernetes External Secrets, SOPS with KMS, or an equivalent approved system.
- Local `.env` files are development-only, MUST NOT be committed, and MUST be covered by `.gitignore`, secret scanning, and push protection where available.
- Secrets MUST be injected at runtime through workload identity, secret mounts, sidecars, or environment injection from the secret store. Never bake secrets into source code, Docker images, build args, frontend bundles, static files, IaC state, or generated docs.
- Grant secret access by least-privilege service/workload identity. Production services MUST NOT use shared human credentials, long-lived personal tokens, or broad admin keys.
- Every production secret MUST have an owner, purpose, intended consumers, storage location, rotation/revocation method, emergency contact, and documented blast radius.
- Prefer dynamic or short-lived secrets where the platform supports them. Static secrets MUST have a documented rotation path; suspected exposure requires immediate revocation and rotation.
- Logs, traces, errors, CI output, crash reports, screenshots, and support bundles MUST redact secrets automatically. Redaction rules MUST be tested.
- Automated secret scanning MUST run before commit/push where possible and in CI. A detected committed secret is an incident: revoke it first, rotate dependents, remove exposure, and document impact.
- AI agents MUST NOT print, transform, summarize, commit, or copy secret values. If a task requires a secret value, stop and ask the user to provide it through the approved secret manager or runtime environment.
<!-- END AGENT-STANDARD: SECURITY-SECRETS -->
```

---

## Detailed Human Guide & Rationale

### 1. Terminology

- **Secret**: Any value that grants access, proves identity, signs trust, decrypts data, or enables privileged operations.
- **Secret Store / Vault**: Managed system for storing, retrieving, auditing, rotating, and revoking secrets.
- **KMS (Key Management Service)**: Managed service or module that protects cryptographic keys and performs key operations.
- **Envelope Encryption**: Pattern where data is encrypted with a data key, and that data key is encrypted by a higher-level KMS key.
- **Workload Identity**: Cloud, cluster, or platform identity assigned to a running service so it can access resources without static credentials.
- **Dynamic Secret**: Short-lived credential generated on demand for a specific workload, role, and time window.
- **Static Secret**: Long-lived credential that exists until rotated or revoked.
- **Rotation**: Replacing a secret with a new value and moving consumers safely to the new value.
- **Revocation**: Invalidating a secret so it can no longer be used.
- **Break-Glass Access**: Emergency human access path used when normal automated access is unavailable; it must be time-bound, approved, and audited.
- **Secret Scanning**: Automated detection of likely secrets in source code, commits, pull requests, CI logs, or artifacts.
- **Push Protection**: Pre-receive or hosted-source-control control that blocks commits containing detected secrets before they enter repository history.

### 2. What Counts As A Secret

Use the broad definition. A secret is not only a password or API key. Private signing keys, webhook verification secrets, database connection strings, OAuth client secrets, session signing secrets, encryption keys, recovery codes, cloud credentials, SSH keys, TLS private keys, CI/CD tokens, production `.env` values, and administrator bootstrap credentials are all secrets.

If disclosure would let an attacker access a system, impersonate a service, forge trust, decrypt protected data, or bypass a control, handle the value as a secret.

### 3. Storage Baseline

Production secrets must live in a managed secret store or vault. Acceptable implementations include cloud secret managers, HashiCorp Vault, encrypted GitOps systems such as SOPS backed by KMS, or equivalent platforms that provide encryption at rest, access control, audit logs, and rotation support.

Local `.env` files are allowed only for development convenience. They must be ignored by git, excluded from artifacts, and treated as disposable. Do not copy production secrets into local `.env` files for debugging.

Kubernetes `Secret` objects are not enough by themselves. Cluster operators must enable encryption at rest for secret data, restrict `get`, `list`, and `watch` access, and prefer external secret synchronization from an actual secret manager for production clusters.

### 4. Runtime Delivery

Secrets must be provided to workloads at runtime, not during source, build, or bundle generation. Runtime delivery can use:

- workload identity plus direct secret-store reads
- mounted files from an external secrets operator
- short-lived sidecar or init-container retrieval
- platform environment injection from a secret store
- service mesh or cloud-native identity federation

Never pass secrets through Docker build args, write them into image layers, commit them into IaC files, bake them into frontend bundles, or include them in generated documentation. Environment variables are acceptable only when the platform injects them securely at runtime and operational controls prevent them from leaking through process dumps, logs, debug endpoints, or support bundles.

### 5. Access Control

Secrets access must follow least privilege. Each service should read only the secrets it needs for its function and environment. Separate development, staging, and production secrets; a staging credential must not work against production systems.

Production services must authenticate with service accounts, workload identity federation, or platform-managed workload identity. Avoid shared human credentials and long-lived personal access tokens. Human access to production secrets should be rare, approved, time-bound, and logged. Break-glass access must create an audit trail and trigger review.

### 6. Lifecycle, Rotation, And Revocation

Every production secret needs lifecycle metadata:

- owner
- purpose
- intended consumers
- environment
- storage location
- creation date
- rotation or expiration policy
- emergency revocation method
- dependency/blast-radius notes
- incident contact

Prefer dynamic secrets when the platform supports them. Dynamic database credentials, cloud credentials, and leases reduce the blast radius of exposure because they expire automatically and can be revoked centrally.

Static secrets must still have a safe rotation path. Avoid arbitrary blanket intervals such as "rotate every 90 days" unless required by compliance or by the secret type. Instead, define rotation based on risk, capability, usage, and exposure impact. Suspected exposure always overrides the routine schedule: revoke first, rotate dependents, then investigate.

### 7. CI/CD And Source Control

Secret scanning must run in developer tooling where practical and in CI for every pull request. Repositories should enable push protection or equivalent pre-receive blocking for supported secret types. Pre-commit hooks such as Gitleaks or TruffleHog are useful, but they are not sufficient alone because hooks can be bypassed.

CI/CD jobs should use short-lived federated credentials such as OIDC-issued cloud credentials instead of stored cloud access keys. CI secrets must be scoped to the smallest environment and job possible. Pull requests from forks must not receive production secrets.

Any committed secret is compromised even if the commit is later deleted. Revoke and rotate the secret before history cleanup. History rewriting may reduce accidental rediscovery, but it does not make a leaked credential safe again.

### 8. Logging, Telemetry, And Artifacts

Secrets must not appear in logs, traces, metrics labels, error messages, crash dumps, test snapshots, screenshots, build output, support bundles, or AI prompts. Redaction must cover common key names and token formats, but also organization-specific patterns.

Redaction rules must be tested with representative fake secrets. Do not test with live production credentials. Logging should record that a secret was accessed, rotated, denied, or revoked, but never record the secret value itself.

### 9. AI Agent Handling Rules

AI agents working in this repository or in downstream projects must treat secrets as non-displayable data.

Agents must not:

- print secret values into chat
- copy secrets between files
- transform, decode, summarize, or "clean up" secret values
- commit `.env` files or credential files
- add secrets to examples, tests, fixtures, screenshots, generated docs, or logs

If a task requires a secret, the agent must ask the user to place it into the approved secret store or runtime environment. The agent may reference the variable name or secret path, but not the value.

### 10. Incident Response

When a secret is detected in source control, logs, artifacts, chat, issue comments, or telemetry:

1. Revoke or disable the exposed secret immediately.
2. Rotate dependent credentials and redeploy consumers.
3. Search for additional copies in git history, CI logs, artifacts, package registries, tickets, and documentation.
4. Determine blast radius from audit logs and service access records.
5. Remove or redact copies where possible without destroying required audit evidence.
6. Add or update detection patterns so the same class of secret is blocked in the future.
7. Document timeline, impact, rotation, and follow-up controls.

### 11. Review Checklist

- [ ] No secrets are present in source code, docs, tests, fixtures, Dockerfiles, frontend bundles, CI logs, IaC state, or generated artifacts.
- [ ] Production secrets are stored in a managed secret store or approved encrypted GitOps mechanism.
- [ ] Local `.env` files are development-only, ignored by git, and never contain production credentials.
- [ ] Secrets are delivered at runtime and not embedded during build.
- [ ] Workloads access secrets through least-privilege service/workload identities.
- [ ] Every production secret has owner, purpose, consumers, rotation path, revocation path, and incident contact metadata.
- [ ] Dynamic or short-lived secrets are used where supported.
- [ ] Secret scanning runs before push where possible and in CI.
- [ ] Logs, traces, errors, crash reports, and CI output redact secrets automatically.
- [ ] AI agents never display, transform, commit, or move secret values.

## Evidence

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html): primary application-security source for centralizing secrets, least-privilege access, automation, dynamic secrets, auditing, lifecycle metadata, CI/CD handling, detection, and incident response.
- [NIST SP 800-57 Part 1 Rev. 5](https://www.nist.gov/publications/recommendation-key-management-part-1-general-1): primary cryptographic key-management guidance covering keying material protection, lifecycle concerns, compromise, backup, and recovery.
- [The Twelve-Factor App: Config](https://www.12factor.net/config): source for strict separation of deploy-varying config from code and the open-source-at-any-time litmus test.
- [Kubernetes Good Practices for Secrets](https://kubernetes.io/docs/concepts/security/secrets-good-practices/): official Kubernetes guidance on secret data, encryption at rest, and least-privilege access to `Secret` objects.
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): source for excluding or masking access tokens, passwords, connection strings, encryption keys, and other primary secrets from logs.
- [GitHub Push Protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection): official source for blocking detected secrets before they enter repository history.
- [HashiCorp Vault Lease, Renew, and Revoke](https://developer.hashicorp.com/vault/docs/concepts/lease): source for dynamic-secret leases, TTLs, renewal, and revocation behavior.
- [AWS Secrets Manager Lambda Rotation Functions](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html): official source for staged rotation workflows and caution around logging during rotation.
