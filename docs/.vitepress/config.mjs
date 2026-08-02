import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Production Coding Standard",
  description: "High-production deployment standards for humans and AI agents",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'General', link: '/general/architecture-patterns' },
      { text: 'Frontend', link: '/frontend/react-nextjs' },
      { text: 'Backend', link: '/backend/' },
      { text: 'DevOps', link: '/devops/docker-container' },
      { text: 'Security', link: '/security/owasp-top-10' },
      { text: 'AGENTS Templates', link: '/templates-index' }
    ],

    sidebar: {
      '/general/': [
        {
          text: 'General Standards',
          items: [
            { text: 'Architecture Patterns', link: '/general/architecture-patterns' },
            { text: 'Clean Code Principles', link: '/general/clean-code' },
            { text: 'Git Workflow & Versioning', link: '/general/git-workflow' },
            { text: 'Code Review Checklist', link: '/general/code-review-checklist' }
          ]
        }
      ],
      '/frontend/': [
        {
          text: 'Frontend Production Standards',
          items: [
            { text: 'React & Next.js Standard', link: '/frontend/react-nextjs' },
            { text: 'State Management', link: '/frontend/state-management' },
            { text: 'Styling & UI Architecture', link: '/frontend/css-ui' },
            { text: 'Web Performance & Vitals', link: '/frontend/web-performance' },
            { text: 'Security & Accessibility (a11y)', link: '/frontend/security-a11y' }
          ]
        }
      ],
      '/backend/': [
        {
          text: 'Backend Production Standards',
          items: [
            { text: 'API Design (REST/gRPC/GraphQL)', link: '/backend/api-design' },
            { text: 'Node.js & TypeScript Standard', link: '/backend/nodejs-typescript' },
            { text: 'Python & FastAPI Standard', link: '/backend/python-fastapi' },
            { text: 'Go Backend Standard', link: '/backend/go' },
            { text: 'Database & Migrations', link: '/backend/database-orm' },
            { text: 'Auth & Session Management', link: '/backend/auth-session' },
            { text: 'Resilience & Caching', link: '/backend/resilience-caching' },
            { text: 'Structured Logging & Telemetry', link: '/backend/logging-observability' }
          ]
        }
      ],
      '/devops/': [
        {
          text: 'DevOps & Infrastructure',
          items: [
            { text: 'Docker & Container Security', link: '/devops/docker-container' },
            { text: 'Kubernetes & Helm Standards', link: '/devops/kubernetes-helm' },
            { text: 'CI/CD Pipeline Architecture', link: '/devops/ci-cd-pipelines' },
            { text: 'Infrastructure as Code (Terraform)', link: '/devops/iac-terraform' },
            { text: 'Monitoring & Alerting', link: '/devops/monitoring-alerting' }
          ]
        }
      ],
      '/security/': [
        {
          text: 'Security Standards',
          items: [
            { text: 'OWASP Top 10 Protections', link: '/security/owasp-top-10' },
            { text: 'Secrets Management & Keys', link: '/security/secrets-management' }
          ]
        }
      ],
      '/templates': [
        {
          text: 'AGENTS.md Templates',
          items: [
            { text: 'Overview', link: '/templates-index' },
            { text: 'AGENTS Backend', link: '/templates/AGENTS-backend' },
            { text: 'AGENTS Frontend', link: '/templates/AGENTS-frontend' },
            { text: 'AGENTS Fullstack', link: '/templates/AGENTS-fullstack' },
            { text: 'AGENTS DevOps', link: '/templates/AGENTS-devops' },
            { text: 'AGENTS Node.js', link: '/templates/AGENTS-nodejs' },
            { text: 'AGENTS FastAPI', link: '/templates/AGENTS-fastapi' },
            { text: 'AGENTS Next.js', link: '/templates/AGENTS-nextjs' },
            { text: 'AGENTS Go', link: '/templates/AGENTS-go' }
          ]
        }
      ]
    },

    socialLinks: []
  }
})
