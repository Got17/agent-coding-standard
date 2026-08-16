import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Production Coding Standard",
  description: "High-production deployment standards for humans and AI agents",
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
  ],
  themeConfig: {
    logo: '/favicon.svg',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'General', link: '/general/architecture-patterns' },
      { text: 'Frontend', link: '/frontend/' },
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
            { text: 'Overview & Index', link: '/frontend/' },
            { text: 'React & Next.js Standard', link: '/frontend/react-nextjs' },
            { text: 'Next.js Frontend Structure', link: '/frontend/nextjs-frontend-structure' },
            { text: 'State Management', link: '/frontend/state-management' },
            { text: 'Styling & UI Architecture', link: '/frontend/css-ui' },
            { text: 'Web Performance & Vitals', link: '/frontend/web-performance' },
            { text: 'Frontend Security', link: '/frontend/security' },
            { text: 'Accessibility (a11y)', link: '/frontend/accessibility' },
            { text: 'Forms & Validation', link: '/frontend/forms-validation' },
            { text: 'Testing & QA', link: '/frontend/testing-qa' },
            { text: 'Internationalization (i18n)', link: '/frontend/i18n-localization' }
          ]
        }
      ],
      '/backend/': [
        {
          text: 'Backend Production Standards',
          items: [
            { text: 'Overview & Index', link: '/backend/' },
            { text: 'API Design (REST/gRPC/GraphQL)', link: '/backend/api-design' },
            { text: 'Node.js & TypeScript Standard', link: '/backend/nodejs-typescript' },
            { text: 'Python & FastAPI Standard', link: '/backend/python-fastapi' },
            { text: 'Go REST Hexagonal Standard', link: '/backend/go-rest-hexagonal' },
            { text: 'Database & Migrations', link: '/backend/database-orm' },
            { text: 'Auth & Session Management', link: '/backend/auth-session' },
            { text: 'Resilience & Caching', link: '/backend/resilience-caching' },
            { text: 'Structured Logging & Telemetry', link: '/backend/logging-observability' },
            { text: 'Testing & Quality Gates', link: '/backend/testing-quality-gates' },
            { text: 'Background Jobs & Events', link: '/backend/async-jobs-events' },
            { text: 'Performance & Capacity', link: '/backend/performance-capacity' }
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

          ]
        }
      ]
    },

    socialLinks: []
  }
})
