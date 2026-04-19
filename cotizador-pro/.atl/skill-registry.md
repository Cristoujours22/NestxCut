# Skill Registry - cotizador-pro

Generated: 2026-04-08
Project: cotizador-pro

## User-Level Skills (Global)

### opencode Skills Directory
- **branch-pr**: PR creation workflow for Agent Teams Lite
- **find-skills**: Discover and install agent skills
- **go-testing**: Go testing patterns (not applicable to this project)
- **issue-creation**: GitHub issue creation workflow
- **judgment-day**: Parallel adversarial review protocol
- **sdd-apply**: Implement tasks from change specifications
- **sdd-archive**: Archive completed changes
- **sdd-design**: Create technical design documents
- **sdd-explore**: Explore ideas before committing to changes
- **sdd-init**: Initialize SDD context in projects
- **sdd-onboard**: Guided SDD workflow walkthrough
- **sdd-propose**: Create change proposals
- **sdd-spec**: Write specifications with requirements
- **sdd-tasks**: Break down changes into tasks
- **sdd-verify**: Verify implementation matches specs
- **skill-creator**: Create new AI agent skills
- **skill-registry**: Create/update skill registry

### gemini Skills Directory
- Same skills as opencode (shared across installations)

## Project-Level Skills

### Project Custom Skills
- **nestxcut-inventory**: Guía de dominio para inventario de tableros y herrajes en NestxCut, con reglas de stock, movimientos e integraciones futuras con despiece/cotización.
- **nestxcut-despiece-tabs**: Guía para tabs de despiece con IDs estables, material por tab, catálogo local de cantos y sincronización segura con el workspace.

### Detected Project Conventions
- **React 18 + Vite 6.3.3 + TailwindCSS 4** - Modern frontend stack
- **Electron 28.0.0** - Desktop application packaging
- **React Router DOM 7.5.3** - Client-side routing
- **Node.js test runner** - Built-in testing framework
- **ESLint** - JavaScript/JSX linting
- **Custom licensing service** - SQLite-based licensing with manual activation flow
- **Firebase planned** - For Auth + Firestore (manual payment/subscription model)

### Recommended Skills for This Stack

#### Core Development
- **vercel-react-best-practices**: React and Next.js performance optimization (applies to Vite/React apps)

#### Testing
- **go-testing**: Not applicable (Go-based skill)
- Custom Node.js testing patterns (already using node:test)

#### SDD Workflow
- All sdd-* skills are applicable for planning and implementing changes

### Architecture Patterns
- **Screaming Architecture**: Components organized by feature (components/, context/, licensing/, models/, utils/)
- **Electron + Vite monorepo**: Main process (Electron) + Renderer (Vite/React)
- **Manual subscription flow**: 30-day trial → manual payment → manual activation (no payment gateway budget)

### Build & Deployment
- **Vite**: Frontend bundling and dev server
- **Electron Builder**: Desktop application packaging
- **Concurrently**: Running multiple processes (dev server + Electron)

### Quality Assurance
- **ESLint**: JavaScript/JSX linting with React-specific rules
- **Tailwind CSS**: Utility-first CSS framework

## Next Steps

1. **Add TypeScript**: Consider migrating to TypeScript for better type safety
2. **Add Vitest**: For React component testing and coverage
3. **Add Playwright/Cypress**: For E2E testing
4. **Set up Firebase**: Implement Firebase Auth + Firestore for subscription management
5. **Add CI/CD**: GitHub Actions or similar for automated testing and deployment

## Notes
- Current testing uses Node.js built-in test runner (lightweight, no dependencies)
- No coverage tool configured yet
- No integration or E2E testing infrastructure
- Project follows modern React + Vite + TailwindCSS patterns
