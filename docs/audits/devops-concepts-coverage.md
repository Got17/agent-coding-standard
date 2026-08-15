# DevOps Concepts Coverage Audit

Date: 2026-08-15

## Scope

This audit checks whether the DevOps documentation section covers essential universal concepts for production infrastructure, containerization, deployment, and operational reliability. It audits the full DevOps section, including:

- `docs/devops/ci-cd-pipelines.md`
- `docs/devops/docker-container.md`
- `docs/devops/iac-terraform.md`
- `docs/devops/kubernetes-helm.md`
- `docs/devops/monitoring-alerting.md`
- `templates/AGENTS-devops.md`
- Related cross-cutting security, backend, and testing standards

## Verdict

The DevOps section has a comprehensive rule block in [`templates/AGENTS-devops.md`](file:///D:/Coding/projects/agent-coding-standard/templates/AGENTS-devops.md) (78 lines) covering declarative IaC, container hardening, CI/CD security, GitOps/PaaS deployments, secrets management, OpenTelemetry baseline, disaster recovery, and scripting hygiene.

However, **all 5 standard pages in `docs/devops/` are currently 16-line stubs**:
- `docs/devops/ci-cd-pipelines.md` (Stub)
- `docs/devops/docker-container.md` (Stub)
- `docs/devops/iac-terraform.md` (Stub)
- `docs/devops/kubernetes-helm.md` (Stub)
- `docs/devops/monitoring-alerting.md` (Stub)

Additionally, there is **no `docs/devops/index.md` navigation entry point**, and essential operational domains like **Secrets Injection & Zero-Trust Access**, **Resilience & Disaster Recovery**, and **Scripting Hygiene** do not yet have dedicated topic pages or clear navigation cross-references.

Following our evidence research and grilling session, the plan is to expand all 5 existing stubs, add dedicated pages for **Secrets & Zero-Trust** (`docs/devops/secrets-zerotrust.md`), **Resilience & Disaster Recovery** (`docs/devops/disaster-recovery.md`), and **Scripting & Automation** (`docs/devops/scripting-automation.md`), and create `docs/devops/index.md` as the canonical section navigation.

## Coverage Matrix

| Essential Concept | Why It Is Essential | Current Coverage | Status | Recommended Doc Action | Primary Evidence / Standards |
|---|---|---|---|---|---|
| **1. Infrastructure as Code (IaC) & Immutable State** | Manual console edits ("ClickOps") cause configuration drift, unrepeatable infrastructure, and state corruption without auditability. | `templates/AGENTS-devops.md` §1; `docs/devops/iac-terraform.md` stub | Partially covered | Expand `docs/devops/iac-terraform.md` to cover Terraform/OpenTofu, remote encrypted state backends (S3+DynamoDB / GCS), automated PR `plan` previews, daily drift detection pipelines, and pessimistic version pinning (`~>`). | [HashiCorp Terraform Remote State Best Practices](https://developer.hashicorp.com/terraform/language/settings/backends/remote); CNCF Cloud Native Infrastructure Definition. |
| **2. Container Security & Image Optimization** | Running containers as root or using bloated, un-scanned base images leads to container escape exploits and supply-chain vulnerabilities. | `templates/AGENTS-devops.md` §2; `docs/devops/docker-container.md` stub | Partially covered | Expand `docs/devops/docker-container.md` into a complete guide covering multi-stage builds, distroless/minimal base images (Alpine/Chainguard), non-root execution (UID 10001+), immutable SHA-256 digest pinning (`@sha256:...`), and automated vulnerability scanning (Trivy/Grype) failing builds on `CRITICAL`/`HIGH`. | [NIST SP 800-190 Application Container Security Guide](https://csrc.nist.gov/publications/detail/sp/800-190/final); [CIS Docker & Kubernetes Benchmarks](https://www.cisecurity.org/benchmark/docker). |
| **3. CI/CD Automation & Pipeline Security** | Un-shielded CI/CD pipelines with floating third-party dependencies or static API keys risk supply-chain compromise and credential leakage. | `templates/AGENTS-devops.md` §3; `docs/devops/ci-cd-pipelines.md` stub | Partially covered | Expand `docs/devops/ci-cd-pipelines.md` covering isolated runner environments, mandatory pre-merge quality gates, dependency layer caching, SHA-1 pinning for third-party actions, OIDC short-lived token auth, and manual production approval gates. | [GitHub Actions Security Hardening Guide](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions); OWASP Top 10 CI/CD Security Risks. |
| **4. Deployment, GitOps & Orchestration** | Deploying without zero-downtime strategies or resource limits causes user downtime, pod eviction storms, and cluster instability. | `templates/AGENTS-devops.md` §4; `docs/devops/kubernetes-helm.md` stub | Partially covered | Expand `docs/devops/kubernetes-helm.md` covering zero-downtime deployment strategies (Rolling, Canary, Blue-Green), GitOps declarative sync (ArgoCD/Flux) & PaaS (Dokploy), K8s resource requests/limits, liveness/readiness/startup probes, and Pod Disruption Budgets (PDB). | [Kubernetes Production Best Practices](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/); CNCF GitOps Principles. |
| **5. Security, Secrets Management & Zero-Trust** | Hardcoding secrets or granting broad IAM privileges allows lateral network movement and unauthorized data access during breaches. | `templates/AGENTS-devops.md` §5; `docs/security/secrets-management.md` cross-links | Partially covered | Create standalone `docs/devops/secrets-zerotrust.md` covering pre-commit secret scanning (GitLeaks/TruffleHog), dynamic secret injection (Vault, External Secrets Operator, SOPS), workload identity federation (AWS IRSA, GCP Workload Identity), default-deny NetworkPolicies, and runtime threat detection (Falco). | [NIST SP 800-207 Zero Trust Architecture](https://csrc.nist.gov/publications/detail/sp/800-207/final); OWASP Secrets Management Cheat Sheet. |
| **6. Observability, Logging & Alerting Baseline** | Uncorrelated logs and vendor-locked metrics prevent rapid root-cause analysis during incidents and trigger alert fatigue. | `templates/AGENTS-devops.md` §6; `docs/devops/monitoring-alerting.md` stub | Partially covered | Expand `docs/devops/monitoring-alerting.md` into a complete guide specifying an OpenTelemetry (OTLP) baseline for metrics/logs/traces, structured JSON logging with correlation IDs (`trace_id`, `span_id`), and SLO/SLI error-budget alerting with mandatory runbook links. | [OpenTelemetry Protocol (OTLP) Specification](https://opentelemetry.io/docs/specs/otlp/); [Google SRE Service Level Objectives Guide](https://sre.google/sre-book/service-level-objectives/). |
| **7. Resilience, Disaster Recovery & High Availability** | Outages in single Availability Zones or un-validated backups cause irreversible data loss and prolonged downtime exceeding SLAs. | `templates/AGENTS-devops.md` §7 | Partially covered in template | Create standalone `docs/devops/disaster-recovery.md` covering multi-AZ deployment, automated encrypted backups with RPO/RTO validation, cross-region replication, graceful shutdown (`preStop` connection draining), and periodic chaos testing. | [Twelve-Factor App Disposability](https://12factor.net/disposability); Google SRE Disaster Recovery & High Availability Principles. |
| **8. Scripting, Automation & Code Quality** | Unchecked shell scripts with unhandled errors (`set -e` missing) cause silent partial execution failures in CI/CD automation. | `templates/AGENTS-devops.md` §8 | Partially covered in template | Create standalone `docs/devops/scripting-automation.md` covering portable interpreters (`#!/usr/bin/env bash`), strict error flags (`set -euo pipefail`), static analysis (ShellCheck, actionlint, yamllint), and idempotent script execution. | ShellCheck Static Analysis Guidelines; POSIX Shell Specification. |
| **9. DevOps Navigation & Index** | Engineers and AI agents need a single entry point mapping all infrastructure, deployment, security, and operational standards. | None | Missing | Create `docs/devops/index.md` as the canonical navigation and overview page for the DevOps section. | Repo standard documentation structure requirement. |

---

## DevOps Section Gaps & Action Plan

### High Priority (Critical Stubs to Expand)

1. **Create `docs/devops/index.md`**
   Provide a single navigation entry point for all DevOps standards, mapping core rules to dedicated topic pages.

2. **Expand `docs/devops/docker-container.md`**
   Transform the 16-line stub into a complete container hardening standard: multi-stage builds, distroless/minimal base images, non-root execution (UID 10001+), digest pinning, and automated Trivy/Grype vulnerability scanning gates.

3. **Expand `docs/devops/ci-cd-pipelines.md`**
   Transform the 16-line stub into a full pipeline security guide: isolated runners, quality gates, dependency layer caching, SHA-1 action pinning, and OIDC token auth.

4. **Expand `docs/devops/iac-terraform.md`**
   Transform the 16-line stub into a complete IaC standard: Terraform/OpenTofu declarative modules, encrypted remote state backends with locking (S3+DynamoDB / GCS), PR plan previews, and daily drift detection.

5. **Expand `docs/devops/kubernetes-helm.md`**
   Transform the 16-line stub into a complete deployment & orchestration guide: zero-downtime strategies, GitOps (ArgoCD/Flux) & PaaS (Dokploy), K8s requests/limits, probes, and Pod Disruption Budgets (PDB).

6. **Expand `docs/devops/monitoring-alerting.md`**
   Transform the 16-line stub into a complete observability standard: OpenTelemetry (OTLP) baseline, structured JSON logging with correlation IDs, and SLO/SLI error-budget alerting with runbook links.

### Medium Priority (New Pages to Add)

7. **Create `docs/devops/secrets-zerotrust.md`**
   Document secrets scanning (GitLeaks/TruffleHog), dynamic secret injection (Vault, External Secrets Operator, SOPS), workload identity federation (AWS IRSA, GCP Workload Identity), default-deny NetworkPolicies, and Falco runtime security.

8. **Create `docs/devops/disaster-recovery.md`**
   Document multi-AZ high availability, automated encrypted backups with RPO/RTO validation, cross-region replication, graceful shutdown (`preStop` connection draining), and chaos testing.

9. **Create `docs/devops/scripting-automation.md`**
   Document scripting hygiene: portable interpreters, strict error flags (`set -euo pipefail`), ShellCheck / actionlint static analysis, and idempotent script design.

---

## Primary Evidence Log

- **NIST SP 800-190 (Application Container Security Guide)**: [https://csrc.nist.gov/publications/detail/sp/800-190/final](https://csrc.nist.gov/publications/detail/sp/800-190/final) — Primary specification for container lifecycle security, non-root execution, minimal runtime base images, and continuous vulnerability scanning.
- **CIS Docker & Kubernetes Benchmarks**: [https://www.cisecurity.org/benchmark/docker](https://www.cisecurity.org/benchmark/docker) — Prescriptive technical hardening controls for container runtimes, non-privileged execution, and cluster security configurations.
- **OpenTelemetry Protocol (OTLP) Specification**: [https://opentelemetry.io/docs/specs/otlp/](https://opentelemetry.io/docs/specs/otlp/) — Vendor-neutral standard protocol for emitting and collecting distributed traces, metrics, and structured logs.
- **Google SRE Service Level Objectives & Disaster Recovery**: [https://sre.google/sre-book/service-level-objectives/](https://sre.google/sre-book/service-level-objectives/) — Primary standard for SLO/SLI error budgets, actionable alerting, and disaster recovery validation.
- **NIST SP 800-207 (Zero Trust Architecture)**: [https://csrc.nist.gov/publications/detail/sp/800-207/final](https://csrc.nist.gov/publications/detail/sp/800-207/final) — Primary specification for zero-trust microsegmentation, workload identity, and default-deny network access controls.
- **GitHub Actions Security Hardening Guide**: [https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions) — Official guide for SHA-1 action pinning, OIDC workload identity, and runner token isolation.
- **Twelve-Factor App Methodology**: [https://12factor.net/](https://12factor.net/) — Industry baseline for environment configuration, log stdout streams, disposability, and dev/prod parity.
