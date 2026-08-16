# DevOps Production Standards

> Comprehensive concept map of container security, Kubernetes orchestration, CI/CD pipelines, Infrastructure as Code, zero-trust security, disaster recovery, and operational monitoring standards for human developers and AI coding agents.

## DevOps Concept Map

### 1. Infrastructure as Code & Containers
- **[Docker & Container Security](/devops/docker-container)**: Multi-stage minimal builds, non-root execution (`USER 10001`), immutable SHA-256 digest pinning, vulnerability scanning gates (Trivy/Grype).
- **[Infrastructure as Code (IaC)](/devops/iac-terraform)**: Declarative Terraform/OpenTofu modules, encrypted remote state backends (S3+DynamoDB/GCS), pull-request `plan` previews, daily drift detection.

### 2. Deployment & Orchestration
- **[Kubernetes & Helm Standards](/devops/kubernetes-helm)**: Zero-downtime deployment strategies (Rolling/Canary), GitOps declarative sync (ArgoCD/Flux) & PaaS (Dokploy), K8s resource requests/limits, liveness/readiness probes, Pod Disruption Budgets (PDB).
- **[CI/CD Pipeline Architecture](/devops/ci-cd-pipelines)**: Isolated runner environments, mandatory pre-merge quality gates, dependency caching, SHA-1 pinned actions, OIDC short-lived token auth.

### 3. Security, Secrets & Zero-Trust
- **[Secrets Management & Zero-Trust Access](/devops/secrets-zerotrust)**: Pre-commit secret scanning (GitLeaks/TruffleHog), dynamic secret injection (Vault/ESO/SOPS), workload identity federation (AWS IRSA/GCP Workload Identity), default-deny NetworkPolicies, Falco runtime threat detection.
- **[Secrets Management & Keys](/security/secrets-management)** *(Security)*: Vault integration patterns, key rotation workflows, environment variable safety.

### 4. Observability & Reliability
- **[Monitoring & Alerting](/devops/monitoring-alerting)**: OpenTelemetry (OTLP) baseline for metrics/logs/traces, structured JSON logging with correlation tokens (`trace_id`, `span_id`), SLO/SLI error-budget alerting with runbook links.
- **[Resilience & Disaster Recovery](/devops/disaster-recovery)**: Multi-AZ high availability, automated encrypted backups with RPO/RTO validation, cross-region replication, graceful `preStop` connection draining, chaos testing.

### 5. Scripting & Code Quality
- **[Scripting Hygiene & Automation](/devops/scripting-automation)**: Portable interpreters (`#!/usr/bin/env bash`), strict error flags (`set -euo pipefail`), static analysis (ShellCheck, actionlint, yamllint), idempotent execution.
