import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminRoute, MasterRoute } from './RouteGuards';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

const mockUseAuth = vi.mocked(useAuth);

const userForRole = (role: 'STUDENT' | 'INSTRUCTOR' | 'MASTER') => ({
  id: role.toLowerCase(),
  name: role,
  email: 'user@example.test',
  role,
  hasAdminPanelAccess: role === 'INSTRUCTOR' || role === 'MASTER'
});

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderGuard = (path: string, element: React.ReactElement) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/" element={<div>Dashboard</div>} />
      <Route path="*" element={element} />
    </Routes>
    <LocationProbe />
  </MemoryRouter>
);

describe('route authorization guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects an unauthorized student from MasterRoute to the dashboard', async () => {
    mockUseAuth.mockReturnValue({ user: userForRole('STUDENT') } as ReturnType<typeof useAuth>);

    renderGuard('/admin/users', (
      <MasterRoute>
        <div>Master content</div>
      </MasterRoute>
    ));

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Master content')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('allows MasterRoute only when the role is MASTER', () => {
    mockUseAuth.mockReturnValue({ user: userForRole('MASTER') } as ReturnType<typeof useAuth>);

    renderGuard('/admin/users', (
      <MasterRoute>
        <div>Master content</div>
      </MasterRoute>
    ));

    expect(screen.getByText('Master content')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/users');
  });

  it('redirects an unauthorized student from AdminRoute to the dashboard', async () => {
    mockUseAuth.mockReturnValue({ user: userForRole('STUDENT') } as ReturnType<typeof useAuth>);

    renderGuard('/admin/content', (
      <AdminRoute>
        <div>Admin content</div>
      </AdminRoute>
    ));

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('preserves AdminRoute access for an authorized instructor', () => {
    mockUseAuth.mockReturnValue({ user: userForRole('INSTRUCTOR') } as ReturnType<typeof useAuth>);

    renderGuard('/admin/content', (
      <AdminRoute>
        <div>Admin content</div>
      </AdminRoute>
    ));

    expect(screen.getByText('Admin content')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/content');
  });

  it('does not loop when an unauthorized route redirects to the dashboard', async () => {
    mockUseAuth.mockReturnValue({ user: userForRole('STUDENT') } as ReturnType<typeof useAuth>);

    renderGuard('/admin/users', (
      <MasterRoute>
        <div>Master content</div>
      </MasterRoute>
    ));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('leaves an authorized course deep link unchanged', () => {
    render(
      <MemoryRouter initialEntries={['/course/course-1/lesson/lesson-1']}>
        <Routes>
          <Route
            path="/course/:courseId/lesson/:lessonId"
            element={<div>Course deep link</div>}
          />
          <Route path="/" element={<div>Dashboard</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    );

    expect(screen.getByText('Course deep link')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/course/course-1/lesson/lesson-1');
  });
});
