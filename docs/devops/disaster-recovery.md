# Resilience, Disaster Recovery & High Availability Standard

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
```markdown
<!-- START AGENT-STANDARD: DEVOPS-DISASTER-RECOVERY -->
## Disaster Recovery Rules
- Deploy workloads across multi-Availability Zone (multi-AZ) clusters.
- Validate automated encrypted backups periodically against strict RPO and RTO targets.
- Implement graceful shutdown with `preStop` hooks and connection draining before termination.
<!-- END AGENT-STANDARD: DEVOPS-DISASTER-RECOVERY -->
```

---

## Detailed Human Guide & Rationale
*(Detailed guide to be authored collaboratively)*

### 1. Multi-AZ High Availability & Cross-Region Replication
*(Architecture patterns for fault-tolerant multi-AZ and multi-region deployments)*

### 2. Backup Automation & RPO/RTO Validation
*(Backup schedules, encryption, automated restore testing, RPO and RTO targets)*

### 3. Graceful Shutdown, Connection Draining & Chaos Testing
*(Kubernetes termination lifecycle, `preStop` lifecycle hooks, PodDisruptionBudgets, and chaos engineering)*

---

## Primary Evidence & References
- **The Twelve-Factor App: Disposability**: https://12factor.net/disposability
- **Google SRE Book: Disaster Recovery**: https://sre.google/sre-book/disaster-recovery/
