# Architecture

## Pattern: Layered with Dependency Inversion
The project follows a clean layered architecture to decouple business logic from external frameworks (like Supabase).

### Layers
1. **Domain Layer (`/domain`)**:
   - Contains core entities, interfaces, and business rules.
   - Independent of any external service.
   - Uses Zod schemas for validation.

2. **Repository Layer (`/repositories`)**:
   - Defines interfaces for data access (`I...Repository`).
   - Implementations (e.g., `SupabaseCourseRepository`) handle the specifics of Supabase.
   - Allows for swapping data sources if needed.

3. **Service Layer (`/services`)**:
   - Orchestrates business logic and repositories.
   - `Dependencies.ts` likely acts as a manual Dependency Injection container or registry.

4. **Store Layer (`/stores`)**:
   - Zustand stores for global UI state and data orchestration.

5. **UI Layer (`/components`, `/hooks`, `/App.tsx`)**:
   - React components using Tailwind for styling.
   - Custom hooks for logic reuse.

## Data Flow
- Components use **Hooks** or **Stores**.
- Stores/Hooks call **Services**.
- Services call **Repositories**.
- Repositories interact with **Supabase**.
- Domain Entities flow throughout the system.
