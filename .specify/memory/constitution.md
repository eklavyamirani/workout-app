<!--
Sync Impact Report:
- Version change: new constitution → 1.0.0  
- New principles: All principles are new additions
- Added sections: Technology Standards, Development Workflow  
- Templates requiring updates: ✅ All templates reviewed and aligned
- Follow-up TODOs: None - all placeholders defined
-->

# WorkoutApp Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)
All code MUST adhere to established quality standards: TypeScript frontend code requires strict type safety with no `any` types except when interfacing with untyped third-party libraries; .NET backend code MUST follow C# conventions with nullable reference types enabled; All code MUST pass linting and formatting checks before commit; Complex logic MUST include inline documentation; Public APIs MUST have comprehensive XML documentation.

**Rationale**: Quality code reduces bugs, improves maintainability, and enables team collaboration at scale.

### II. Test-First Development (NON-NEGOTIABLE)
TDD methodology is mandatory for all features: Unit tests written first → Tests fail → Implementation → Tests pass → Refactor; Frontend components MUST have unit tests using Jest/React Testing Library; Backend services MUST have unit tests with >80% code coverage; Integration tests MUST validate API contracts between frontend and backend; E2E tests required for critical user workflows.

**Rationale**: Test-first ensures code correctness, prevents regressions, and serves as living documentation.

### III. User Experience Consistency
UI/UX MUST maintain consistency across the application: React components MUST follow established design system patterns; Responsive design required for mobile-first approach; Loading states, error messages, and success feedback MUST be consistent; Accessibility standards (WCAG 2.1 AA) MUST be met; User interactions MUST provide immediate visual feedback.

**Rationale**: Consistent UX builds user trust and reduces cognitive load, leading to better adoption.

### IV. Performance Requirements
Application MUST meet performance benchmarks: Frontend bundle size MUST be <2MB gzipped; API response times MUST be <200ms p95 for CRUD operations; Database queries MUST be optimized with proper indexing; Frontend MUST achieve >90 Lighthouse performance score; Memory usage MUST stay <500MB peak for backend services.

**Rationale**: Performance directly impacts user satisfaction and application scalability.

## Technology Standards

**Frontend Stack**: React 18+ with TypeScript 5+, using functional components and hooks; Material-UI or Chakra UI for design system; React Query for state management and API calls; Vite for build tooling; ESLint + Prettier for code quality.

**Backend Stack**: .NET 8+ Web API with ASP.NET Core; Entity Framework Core for data access; AutoMapper for object mapping; Serilog for structured logging; FluentValidation for input validation; MediatR for CQRS patterns.

**Database**: PostgreSQL for primary data storage; Redis for caching and session management; Proper database migrations using EF Core migrations.

**Testing**: Jest + React Testing Library for frontend; xUnit + AutoFixture + FluentAssertions for backend; Playwright for E2E testing; TestContainers for integration tests.

## Development Workflow

**Code Review**: All code MUST be peer-reviewed before merge; PRs MUST include tests and documentation updates; Constitution compliance MUST be verified during review; Breaking changes require architecture discussion.

**Quality Gates**: Automated CI/CD pipeline MUST pass all quality checks; No merge without passing tests, linting, and security scans; Performance regression tests MUST pass; Code coverage MUST not decrease.

**Documentation**: README MUST be up-to-date with setup instructions; API documentation MUST be generated from code annotations; Architecture Decision Records (ADR) required for significant technical decisions.

## Governance

This constitution supersedes all other development practices and guidelines. All pull requests and code reviews MUST verify compliance with these principles. Any complexity that violates these principles MUST be explicitly justified with business rationale and approved by the team.

Amendments to this constitution require: (1) Documentation of proposed changes with impact analysis, (2) Team consensus approval, (3) Migration plan for existing code, (4) Update of all dependent templates and documentation.

Constitution violations in existing code MUST be addressed during refactoring or when modifying related functionality.

**Version**: 1.0.0 | **Ratified**: 2026-01-01 | **Last Amended**: 2026-01-01
