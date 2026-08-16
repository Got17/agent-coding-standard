# Scripting, Automation & Code Quality Standard

> 💡 **Copyable AI Prompt Block (`AGENTS.md`)**
```markdown
<!-- START AGENT-STANDARD: DEVOPS-SCRIPTING -->
## Scripting Hygiene Rules
- Use portable shebangs (`#!/usr/bin/env bash`).
- Enforce strict error handling at the start of every script (`set -euo pipefail`).
- Validate shell scripts using ShellCheck and YAML/Workflow files using actionlint/yamllint in CI.
<!-- END AGENT-STANDARD: DEVOPS-SCRIPTING -->
```

---

## Detailed Human Guide & Rationale
*(Detailed guide to be authored collaboratively)*

### 1. Shell Script Hygiene & Portable Shebangs
*(Interpreter portability, parameter expansion, quoting, and bash safety flags)*

### 2. Static Analysis & Linting Gates
*(Configuring ShellCheck, actionlint for GitHub Actions, and yamllint in CI)*

### 3. Idempotent Execution & Error Handling
*(Designing automation scripts to be safely re-run without unintended side effects)*

---

## Primary Evidence & References
- **ShellCheck Static Analysis Guidelines**: https://www.shellcheck.net/
- **POSIX Shell Command Language Specification**: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html
