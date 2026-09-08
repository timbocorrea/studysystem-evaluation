# Testing Strategy

## Unit & Integration Testing
- **Framework**: **Vitest**.
- **Library**: **React Testing Library**.
- **Scope**:
  - Domain entities and schemas.
  - Repositories (likely with mocking).
  - Components and Hooks.

## End-to-End (E2E) Testing
- **Framework**: **Playwright**.
- **Scope**: Critical user flows (Auth, Course Navigation, Quizzes).

## Testing Patterns
- **AAA (Arrange, Act, Assert)**: Standard pattern for tests.
- **Mocking**: Extensive use of mocks for external services (Supabase, Dropbox).
- **Setup**: `vitest.setup.ts` for global test configuration.
