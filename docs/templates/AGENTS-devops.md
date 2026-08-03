# Production DevOps Agent Rules (`AGENTS-devops.md`)

> Copy this file directly into your target DevOps or infrastructure project root as `AGENTS.md` or append it to your existing project rules.
> Universal production baseline for DevOps, CI/CD pipelines, containerization, and cloud infrastructure management.

<!-- AI-COPY-BLOCK
NON-NEGOTIABLE DEVOPS RULES (enforce every PR):
1. Infrastructure as Code: 100% declarative IaC (Terraform/OpenTofu/Pulumi); mandatory remote state locking (S3/DynamoDB or GCS); plan output required in PRs; automated drift detection scheduled daily.
2. Container Security: Multi-stage builds; distroless or minimal base images (Alpine/Chainguard); non-root user execution (UID 10001+); explicit digest pinning or immutable tags; vulnerability scanning (Trivy/Grype) blocking build on CRITICAL/HIGH.
3. CI/CD Pipelines: Fast, deterministic pipelines with explicit timeouts; dependency/layer caching; mandatory pre-merge quality gates (linters, SAST, unit/integration tests); pin 3rd-party actions to SHA-1 hashes; OIDC authentication; environment protection rules for production promotion.
4. Deployment & Orchestration: Zero-downtime deployments (Rolling/Canary/Blue-Green); GitOps declarative sync (ArgoCD/Flux) or native Dokploy PaaS; K8s resource requests/limits, readiness/liveness probes, and Pod Disruption Budgets (PDB).
5. Security & Secrets: Zero hardcoded secrets; dynamic secret injection via Vault, External Secrets Operator, or SOPS; least-privilege IAM roles; default-deny network policies; continuous runtime threat detection (Falco/eBPF); automated secret scanning (GitLeaks/TruffleHog) pre-commit and in CI.
6. Observability & Alerting: OpenTelemetry telemetry baseline (metrics, logs, traces); structured JSON logs with correlation IDs; actionable alerts tied to SLO/SLI budgets (P99 latency, error rates) with runbook links; zero unactionable alerts.
7. Resilience & Disaster Recovery: Multi-AZ high availability; automated backups with periodic restore testing (RTO/RPO validation); chaos engineering validation; graceful shutdown & connection draining (30s preStop hook).
8. Scripting & Automation: POSIX shell or Python 3; strict error handling (`set -euo pipefail` in Bash, `set -eu` in POSIX sh); static analysis with ShellCheck / actionlint / yamllint; idempotent execution logic; clean exit codes and formatted status logs.
-->

<!-- START AGENT-STANDARD: DEVOPS-PRODUCTION -->

## 1. Infrastructure as Code (IaC) & Immutable Infrastructure
- [ ] **Declarative State & Versioning**: All infrastructure MUST be managed using declarative IaC (e.g., Terraform, OpenTofu, Pulumi). Manual console modifications ("ClickOps") are strictly prohibited for production environments.
- [ ] **Remote State Management & Locking**: IaC state files MUST be stored in remote encrypted backends (e.g., AWS S3 with KMS encryption, GCS, Azure Blob) with mandatory state locking enabled (e.g., DynamoDB lock tables) to prevent concurrent state corruption.
- [ ] **Plan Previews & Automated Drift Detection**: All IaC code changes MUST require automated `plan`/`diff` outputs attached to PR reviews before merging. Daily scheduled drift detection pipelines MUST run to identify and alert on out-of-band infrastructure changes.
- [ ] **Modular Reuse & Pinning**: Infrastructure code MUST be structured into reusable, version-tagged modules with strict input validation. Cloud provider plugins and module dependencies MUST use pessimistic version constraints (`~>`) or exact version equality (`=`) to prevent unintended breaking updates.
- [ ] **Immutable Infrastructure Lifecycle**: Infrastructure updates MUST favor destruction and re-creation over in-place modification whenever possible (e.g., immutable VM images, ephemeral container nodes). Provisioned assets MUST NOT rely on manual SSH configuration or persistent mutable states.

## 2. Container Security & Image Optimization
- [ ] **Multi-Stage Build Architecture**: Dockerfiles MUST use multi-stage builds to isolate compile-time tooling from the final runtime image. Final container images MUST contain only the compiled binary and necessary runtime assets.
- [ ] **Minimal & Distroless Runtime Bases**: Production container images MUST use minimal, hardened base images (e.g., Distroless, Chainguard, or Alpine). General-purpose Linux distributions (Ubuntu/Debian full images) with package managers, compilers, or extra utilities inside runtime containers are prohibited.
- [ ] **Non-Root Execution Context**: Containers MUST NOT run as `root` (UID 0). Explicit, unprivileged system users/groups with high UIDs (e.g., `USER 10001:10001`) MUST be created and declared in the Dockerfile and enforced via container runtime specs.
- [ ] **Immutable Tagging & Digest Pinning**: Base images and production deployments MUST be pinned using immutable SHA-256 digests (`@sha256:...`) for absolute immutability, or explicit semantic version tags backed by registry-level tag immutability policies. Using floating tags (`:latest`, `:main`, `:dev`) in production image declarations is strictly forbidden.
- [ ] **Automated Vulnerability Scanning**: Container images MUST be scanned during CI builds using static analysis tools (e.g., Trivy, Grype, Docker Scout). Builds MUST be failed automatically if `CRITICAL` or `HIGH` severity vulnerabilities with available fixes are detected.
- [ ] **Layer Optimization & Secret Isolation**: Build steps MUST be ordered to maximize layer caching (e.g., dependency installation before source code copy). Build secrets or credentials MUST be injected via buildkit secret mounts (`--mount=type=secret`), never stored in build args, environment variables, or Docker layers.

## 3. CI/CD Automation & Pipeline Guardrails
- [ ] **Deterministic & Isolated Pipelines**: CI/CD jobs MUST run in clean, isolated, reproducible environments (e.g., containerized runners, ephemeral VMs) with explicit resource limits and job-level execution timeouts.
- [ ] **Mandatory Pre-Merge Quality Gates**: All PRs MUST automatically pass static code analysis (linters), format checks, type checking, security vulnerability scanners, and unit/integration test suites before code can be merged into main branches.
- [ ] **Dependency & Layer Caching**: Pipelines MUST implement secure dependency caching (e.g., npm/Go/pip package caches, Docker layer caching) key-hashed against lockfiles to maximize build velocity while ensuring cached state purity.
- [ ] **Environment Isolation & Protection Rules**: Pipelines MUST enforce strict branch environment separations (e.g., `feature` -> `staging` -> `production`). Deployments to production MUST require explicit manual approval gates, environment protection rules, and signed commit verification.
- [ ] **Pipeline Execution Security**: CI/CD pipeline definition files (e.g., GitHub Actions workflows) MUST use third-party actions pinned to full SHA-1 commit hashes (not tags). Runner tokens and ambient credentials MUST follow least-privilege principles (e.g., short-lived OIDC tokens over persistent API keys).

## 4. Deployment, GitOps & Orchestration (Kubernetes/Dokploy)
- [ ] **Zero-Downtime Deployment Strategies**: Production service updates MUST execute zero-downtime deployment strategies — such as Rolling Updates with maxUnavailable/maxSurge parameters, Canary deployments, or Blue-Green cutovers — ensuring uninterrupted user availability.
- [ ] **Declarative GitOps & PaaS Synchronization**: Cluster state MUST be driven declaratively via GitOps controllers (e.g., ArgoCD, Flux) or native PaaS platforms (e.g., Dokploy Native Provider). Direct manual cluster modifications via `kubectl` in production are forbidden outside of emergencies.
- [ ] **Resource Requests, Limits & QoS**: Kubernetes pods and container tasks MUST explicitly specify both CPU and memory `requests` and `limits` to enable predictable scheduling and prevent noisy-neighbor node exhaustion. Both CPU and memory limits MUST equal requests for all containers where deterministic Guaranteed QoS is required.
- [ ] **Health & Lifecycle Probes**: Container workloads MUST define explicit `livenessProbe` (detect deadlock/crash), `readinessProbe` (gate traffic routing), and optional `startupProbe` (slow initial boots) with calibrated initial delays, timeouts, and thresholds.
- [ ] **High Availability & Pod Disruption Budgets**: High-criticality services MUST maintain a minimum of 2 pod replicas distributed across distinct Availability Zones using pod anti-affinity rules (`podAntiAffinity`). Pod Disruption Budgets (`PDB`) MUST be configured to enforce quorum during node drains and maintenance.

## 5. Security, Secrets Management & Zero-Trust Access
- [ ] **Zero Hardcoded Secrets Policy**: Source code repositories, IaC manifests, and Dockerfiles MUST NOT contain hardcoded API keys, passwords, private keys, or certificates. Enforce automated pre-commit hooks (GitLeaks, TruffleHog) and CI scanning to block secret commits.
- [ ] **Dynamic Secret Injection & Encryption**: Production secrets MUST be managed in dedicated secret stores (e.g., HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager) and dynamically injected into container runtime environments at startup or mounted via External Secrets Operator / SOPS. Secrets stored at rest in Kubernetes `Secret` resources MUST be encrypted with KMS envelope keys.
- [ ] **Least-Privilege Identity & Access Management (IAM)**: IAM service accounts, API tokens, and cloud roles MUST strictly follow the Principle of Least Privilege. Machine workloads MUST authenticate using workload identity federation (e.g., AWS IRSA, GCP Workload Identity) rather than static access keys.
- [ ] **Zero-Trust Network Microsegmentation**: Service-to-service communication MUST enforce Zero-Trust access controls. Cluster network traffic MUST execute a default-deny ingress and egress NetworkPolicy baseline, explicitly allowing only necessary microservice ports and routes.
- [ ] **Runtime Security & Audit Logging**: Host systems and container runtimes MUST enable continuous runtime threat detection (e.g., Falco, eBPF telemetry) and immutable security audit logs for all administrative actions, authentication attempts, and API invocations.

## 6. Observability, Logging & Alerting Baseline
- [ ] **OpenTelemetry Baseline**: Applications and infrastructure components MUST emit metrics, structured logs, and distributed traces using OpenTelemetry standard protocols (OTLP) to prevent vendor lock-in.
- [ ] **Structured JSON Logs & Correlation**: Logs MUST be rendered as structured JSON containing standard severity levels (`DEBUG`, `INFO`, `WARN`, `ERROR`), ISO-8601 timestamps, service names, and correlated `trace_id` / `span_id` fields for seamless trace cross-referencing.
- [ ] **SLO/SLI-Driven Alerting**: Production alerts MUST be tied directly to Service Level Indicators (SLIs) and Service Level Objectives (SLOs) — such as availability error budgets, P99 request latency, and HTTP 5xx rates. Flaky, unactionable, or informational alerts MUST be eliminated to prevent alert fatigue.
- [ ] **Actionable Runbook Links**: Every production alert notification (PagerDuty, Slack, Opsgenie) MUST contain an explicit link to a documented runbook detailing step-by-step remediation procedures, owner escalation paths, and dashboard links.
- [ ] **Metric Aggregation & Retention Baseline**: Infrastructure and application metrics MUST capture essential operational telemetry (CPU, memory, disk I/O, network drop rates, queue depths, saturation) with defined retention policies and automated alerting on resource exhaustion thresholds.

## 7. Resilience, Disaster Recovery & High Availability
- [ ] **Multi-AZ High Availability**: All production workloads, database clusters, and networking components MUST be deployed across at least two independent Availability Zones (AZs) with automated failover capabilities.
- [ ] **Automated Backups & Validation**: Databases, persistent volumes, and critical state MUST be backed up automatically according to target RPO (Recovery Point Objective). Backups MUST be encrypted, replicated off-site or cross-region, and regularly validated via automated restoration drills.
- [ ] **RTO/RPO SLA Compliance**: Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) MUST be defined for every critical service. Disaster recovery plans MUST undergo documented, periodic exercise drills to verify SLA adherence.
- [ ] **Graceful Degradation & Connection Draining**: Applications MUST handle dependency outages gracefully using circuit breakers, fallbacks, and rate limiters. Container terminating pods MUST support graceful shutdown windows (e.g., `preStop` sleep hook for endpoint propagation prior to SIGTERM and 30s application connection draining).
- [ ] **Chaos & Resilience Testing**: Infrastructure resiliency MUST be validated through proactive chaos testing (e.g., simulated node terminations, network latency injection, AZ outages) to verify system auto-healing and failover reliability.

## 8. Scripting, Automation & Code Quality Rules
- [ ] **Portable Script Execution**: Automation scripts MUST use standard portable interpreters (`#!/usr/bin/env bash` or `#!/usr/bin/env python3`). Non-standard shell extensions or unportable binaries are prohibited.
- [ ] **Strict Shell Error Handling**: All Bash scripts MUST begin with strict error flags (`set -euo pipefail`) and POSIX `sh` scripts MUST use `set -eu` to fail immediately on unhandled command errors, undefined variables, or pipeline failures.
- [ ] **Static Analysis & Linting**: Automation scripts and CI workflow files MUST pass automated static analysis in CI: ShellCheck for shell scripts, actionlint for GitHub Actions workflows, yamllint for YAML files, and tflint/opentofu fmt for IaC.
- [ ] **Idempotent Automation Execution**: Automation scripts, deployment hooks, and maintenance tasks MUST be designed to be strictly idempotent — running the script multiple times sequentially MUST produce the exact same system state without errors or side-effects.
- [ ] **Clean Output & Exit Code Standards**: Automation scripts MUST return explicit exit code `0` on success and non-zero on failure. Operational logs from automation MUST clearly output formatted step status (`[INFO]`, `[SUCCESS]`, `[ERROR]`) without exposing secrets or flooding output with verbose noise.

<!-- END AGENT-STANDARD: DEVOPS-PRODUCTION -->
