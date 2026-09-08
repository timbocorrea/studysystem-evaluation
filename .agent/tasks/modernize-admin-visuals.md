# Admin Panel Modernization Plan

This task corresponds to **Phase 3** of the "Sci-Fi Industrial" visual overhaul.

## Objective
Apply the "Dark Premium / Sci-Fi Industrial" aesthetic to the administrative pages and components, ensuring consistency with the User Dashboard.

## Target Pages/Components

### 1. Admin Dashboard (`AdminDashboard.tsx`)
- Container: Refactor main container to use `bg-[#0a0e14]` if needed (though AppLayout handles most).
- Stats Cards: Replace white/slate cards with Glassmorphism (`bg-white/5 border-white/10`).
- Charts: Update Recharts colors (Neon palette: Indigo, Emerald, Amber, Cyan).

### 2. User Management (`UserManagement.tsx`)
- User Table:
    - Glassmorphism table headers (`bg-white/5 text-slate-300`).
    - Row hover effects (`hover:bg-white/5`).
    - Status badges (Active/Inactive) using neon outline styles.
- Modals (`UserDetailsModal`, `ApproveUserModal`, `RejectUserModal`):
    - Update to match `CourseEnrollmentModal` (Dark backdrop-blur, gradient headers).

### 3. Content Management (`AdminContentManagement.tsx`)
- Course List: Modernize cards or list items.
- Module/Lesson Editors:
    - Input fields: Dark backgrounds (`bg-black/20 border-white/10 text-white`).
    - Focus states: `ring-indigo-500/50`.
- Forms: Ensure all forms use the new Input/Select styles (to be standardized).

### 4. File Management (`FileManagement.tsx`)
- File Grid: Glassmorphism cards for files.
- Upload dropzone: Dashed neon border (`border-emerald-500/20`).

### 5. System Health (`SystemHealth.tsx`)
- Status Indicators: Neon usage (Green/Red glows).
- Logs view: Monospace font with dark terminal-like appearance.

### 6. Standard UI Components
- **Input/Select**: Create or Refactor a shared `Input` component that uses the dark theme by default.
- **Button**: Ensure all Admin buttons use the new ghost/glass variants.

## Design Token Reference

```css
/* Glassmorphism Containers */
@apply bg-white/5 backdrop-blur-md border border-white/10 shadow-xl;

/* Inputs */
@apply bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all;

/* Typography */
/* Headings: White, Font-Black */
/* Body: Slate-300/400 */
```

## Next Steps
1. Start with `AdminDashboard.tsx` and `UserManagement.tsx`.
2. Refactor Tables to be a reusable GlassTable component if possible.
