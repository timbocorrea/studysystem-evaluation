# Plan: Phase 1 - Architecture and Routing

## Objective
Decompose the massive `App.tsx` (~929 lines) into modular components, routes, and layouts to improve Single Responsibility Principle (SRP) and maintainability.

## Proposed Changes

### 1. New Directory Structure
- `src/components/layouts/`: For shared UI shells.
- `src/routes/`: For routing definitions and guards.
- `src/components/features/admin/editor/`: For the admin-specific editor wrapper.

### 2. File Extractions
- **`src/routes/RouteGuards.tsx`**:
  - `AdminRoute`
  - `MasterRoute`
- **`src/components/features/admin/editor/LessonContentEditorWrapper.tsx`**:
  - `LessonContentEditorWrapper` logic.
- **`src/components/layouts/MainLayout.tsx`**:
  - The main application shell (Sidebar, Header, Dynamic Background, Toaster, etc.).
  - Handles fullscreen, online status, and mobile menu state.
- **`src/routes/AppRoutes.tsx`**:
  - The `<Routes>` and `<Route>` definitions.

### 3. State Management Refactor
- Move `adminCourses` fetching and state to a new `useAdminStore` or `AdminContext` (or just keep in a high-level component for now, but out of `App.tsx`).
- Ensure `useAuth` and `useCourse` are accessible where needed.

## Verification Criteria
- [ ] Application mounts correctly without `App.tsx` being a monolith.
- [ ] All routes (Student, Admin, Master) are protected and functional.
- [ ] Online/Offline monitoring still works with toast notifications.
- [ ] Fullscreen toggle remains functional.
- [ ] Mobile menu works as expected.
- [ ] Breadcrumbs are correctly generated in the new layout.

## Steps

### Step 1: Extract Route Guards
Create `src/routes/RouteGuards.tsx` and move `AdminRoute` and `MasterRoute`.

### Step 2: Extract Admin Editor Wrapper
Create `src/components/features/admin/editor/LessonContentEditorWrapper.tsx`.

### Step 3: Create MainLayout
Create `src/components/layouts/MainLayout.tsx` containing the structural UI and global states (offline, fullscreen).

### Step 4: Create AppRoutes
Create `src/routes/AppRoutes.tsx` with all route definitions.

### Step 5: Simplify App.tsx
Update `App.tsx` to serve as the entry point that orchestrates the `MainLayout` and `AppRoutes`.
