# Conventions

## Coding Standards
- **Strict TypeScript**: Extensive use of types and interfaces.
- **Functional Components**: React components are functional with hooks.
- **Repository Pattern**: All data access must go through repository interfaces.
- **Naming**:
  - Interfaces start with `I` (e.g., `IAuthRepository`).
  - Hooks start with `use` (e.g., `useLessonStore`).
  - Services use PascalCase (e.g., `AuthService`).
  - Files use `PascalCase` for components and `kebab-case` or `camelCase` for others.

## State Management
- **Local State**: Use `useState` for component-specific state.
- **Global UI State**: Use **Zustand**.
- **Server State**: Use **React Query** for caching and synchronization.

## Validation
- Use **Zod** for all schema validation (domain and forms).
- Integrate with **React Hook Form** via `@hookform/resolvers`.

## Styling
- Use **Tailwind CSS** utility classes.
- Use `clsx` and `tailwind-merge` for dynamic class concatenation.
