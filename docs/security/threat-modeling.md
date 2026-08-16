# Threat Modeling & Security Architecture Standard

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
```markdown
<!-- START AGENT-STANDARD: SECURITY-THREAT-MODELING -->
## Threat Modeling Rules
- Perform STRIDE threat modeling before major architectural changes or new service implementations.
- Explicitly map trust boundaries between untrusted clients, API gateways, internal services, and data stores.
- Assign DREAD or CVSS risk scores to identified threats and require mitigation sign-off prior to production deployment.
<!-- END AGENT-STANDARD: SECURITY-THREAT-MODELING -->
```

---

## Detailed Human Guide & Rationale
*(Detailed guide to be authored collaboratively)*

### 1. STRIDE Threat Methodology & Classification
*(Analyzing Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege)*

### 2. Trust Boundary & Data Flow Diagramming
*(Mapping untrusted networks, API gateways, database persistence layers, and external service integrations)*

### 3. Risk Scoring & Architectural Mitigation Reviews
*(Scoring vulnerabilities using CVSS/DREAD and documenting mitigations in ADRs)*

---

## Primary Evidence & References
- **OWASP Threat Modeling Process**: https://owasp.org/www-community/Threat_Modeling
- **Microsoft STRIDE Threat Model**: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-stride
