# Agent Coding Standard

> Production-grade software development standards for humans and AI agents.

## Overview
This repository defines high-production deployment standards for frontend, backend, DevOps, and security.

It serves a dual purpose:
1. **For Humans**: Fully searchable documentation website powered by VitePress.
2. **For AI Agents**: Portable, self-contained `AGENTS.md` templates in `templates/` that can be dropped directly into any project's root directory.

## Repository Structure
```text
agent-coding-standard/
├── CONTEXT.md               # Glossary, ubiquitous language, and ADRs
├── AGENTS.md                # System prompt rules for agents working on this repo
├── llms.txt                 # LLM documentation index
├── templates/               # Copy-pasteable AGENTS.md files for target projects
│   ├── AGENTS-backend.md
│   ├── AGENTS-frontend.md
│   ├── AGENTS-fullstack.md
│   └── AGENTS-devops.md
└── docs/                    # Source files for human-readable documentation site
    ├── general/
    ├── frontend/
    ├── backend/
    ├── devops/
    └── security/
```

## Local Development
To run the documentation site locally:

```bash
npm install
npm run docs:dev
```
