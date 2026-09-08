import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import AuthForm from '../../components/AuthForm';
import { AuthService } from '../../services/AuthService';

vi.mock('../../services/Dependencies', () => ({
  adminService: {}
}));

vi.mock('../../utils/cacheManager', () => ({
  forceClearCacheOnLogin: vi.fn().mockResolvedValue(false)
}));

vi.mock('../../components/SupportDialog', () => ({
  SupportDialog: () => null
}));

vi.mock('../../components/ui/magic-card', () => ({
  MagicCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../components/ui/dot-pattern', () => ({
  DotPattern: () => null
}));

const LocationProbe = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <output data-testid="location">{location.pathname}</output>
      <button type="button" onClick={() => navigate(-1)}>
        Voltar
      </button>
    </>
  );
};

const renderAuthForm = (initialPath: string, authService: AuthService, onSuccess: () => void | Promise<void>) => render(
  <MemoryRouter initialEntries={[initialPath]}>
    <AuthForm authService={authService} onSuccess={onSuccess} />
    <LocationProbe />
  </MemoryRouter>
);

const fillLoginForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('E-mail Institucional'), 'student@example.test');
  await user.type(screen.getByLabelText('Senha'), 'correct-password');
  await user.click(screen.getByRole('button', { name: 'Entrar no Sistema' }));
};

describe('standard login navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it.each(['/admin/users', '/login'])('redirects a successful normal login from %s to the dashboard', async (initialPath) => {
    const user = userEvent.setup();
    const authService = { login: vi.fn().mockResolvedValue({ success: true }) } as unknown as AuthService;
    const onSuccess = vi.fn().mockResolvedValue(undefined);

    renderAuthForm(initialPath, authService, onSuccess);
    await fillLoginForm(user);

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('navigates only after the successful login callback resolves', async () => {
    const user = userEvent.setup();
    const authService = { login: vi.fn().mockResolvedValue({ success: true }) } as unknown as AuthService;
    let resolveSuccess!: () => void;
    const onSuccess = vi.fn(() => new Promise<void>((resolve) => {
      resolveSuccess = resolve;
    }));

    renderAuthForm('/admin/users', authService, onSuccess);
    await fillLoginForm(user);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/users');

    resolveSuccess();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));
  });

  it('uses replace navigation so the protected login origin is not restored by Back', async () => {
    const user = userEvent.setup();
    const authService = { login: vi.fn().mockResolvedValue({ success: true }) } as unknown as AuthService;

    renderAuthForm('/admin/users', authService, vi.fn().mockResolvedValue(undefined));
    await fillLoginForm(user);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));

    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('does not navigate when authentication fails', async () => {
    const user = userEvent.setup();
    const authService = {
      login: vi.fn().mockResolvedValue({ success: false, message: 'Credenciais inválidas' })
    } as unknown as AuthService;
    const onSuccess = vi.fn();

    renderAuthForm('/admin/users', authService, onSuccess);
    await fillLoginForm(user);

    await waitFor(() => expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument());
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/users');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
