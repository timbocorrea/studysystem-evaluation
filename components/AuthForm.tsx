import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/AuthService';
import { loginSchema, signupSchema, type LoginFormData, type SignupFormData } from '../domain/schemas/authSchema';
import { SupportDialog } from './SupportDialog';
import { adminService as sharedAdminService } from '../services/Dependencies';
import { MagicCard } from './ui/magic-card';

import { DotPattern } from './ui/dot-pattern';
import { forceClearCacheOnLogin } from '../utils/cacheManager';


interface AuthFormProps {
  authService: AuthService;
  onSuccess: () => void | Promise<void>;
}

const AuthForm: React.FC<AuthFormProps> = ({ authService, onSuccess }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Auto cache-busting mechanism on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const isReloading = await forceClearCacheOnLogin();
      if (isReloading && active) {
        setIsClearingCache(true);
      }
    })();
    return () => { active = false; };
  }, []);

  // Form com validação dinâmica baseada no tipo (login ou signup)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset
  } = useForm<SignupFormData>({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema) as any,
    mode: 'onBlur' // Valida quando perde o foco
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Troca entre login e signup
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    reset(); // Limpa o formulário
  };

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    setError('');

    try {
      const res = isLogin
        ? await authService.login(data.email, data.password)
        : await authService.register(
          data.name!,
          data.email,
          data.password,
          data.isMinor
        );

      if (res.success) {
        // Clear flag so that on next logout, cache is cleaned again
        sessionStorage.removeItem('login_cache_cleared');
        await onSuccess();
        if (isLogin) {
          navigate('/', { replace: true });
        }
      } else {
        setError(res.message || 'Ocorreu um erro.');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (isClearingCache) {
    return (
      <div className="dark h-screen flex flex-col items-center justify-center bg-[#050810] px-4 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-emerald-500/80 font-bold text-sm tracking-wider uppercase animate-pulse">Atualizando o sistema...</p>
      </div>
    );
  }

  return (
    <div className="dark h-screen flex items-center justify-center bg-[#050810] px-4 overflow-y-auto relative">
      {/* Dynamic Background */}
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden">
        <DotPattern
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
          className="absolute inset-0 text-white/20 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-transparent to-transparent"></div>
      </div>

      <div
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/20 hover:rotate-[10deg] hover:scale-110 transition-transform duration-300"
          >
            <i className="fas fa-graduation-cap text-white text-2xl drop-shadow-md"></i>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            StudySystem
          </h1>
          <p className="text-slate-400 mt-2 text-base font-medium">Sua jornada de conhecimento</p>
        </div>

        <MagicCard
          className="backdrop-blur-2xl p-6 sm:p-8 rounded-[24px] shadow-2xl relative overflow-hidden group"
          gradientSize={400}
          gradientColor="#10b981"
          gradientOpacity={0.15}
        >
          {/* Subtle glassy border highlight */}
          {/* Removed glassy border highlight */}

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">
              {isLogin ? 'Bem-vindo de volta' : 'Criar nova conta'}
            </h2>
            <p className="text-slate-400 text-xs">
              {isLogin ? 'Digite suas credenciais para acessar.' : 'Preencha os dados abaixo para começar.'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                    Nome Completo
                  </label>
                  <div className="relative group/input">
                    <input
                      id="name"
                      type="text"
                      {...register('name')}
                      className={`w-full bg-slate-950/50 ${errors.name ? 'border border-red-500' : 'border border-transparent'} 
                        rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium`}
                      placeholder="Seu nome"
                    />
                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-transparent group-hover/input:ring-white/5 pointer-events-none transition-all" />
                  </div>
                  {errors.name && (
                    <p className="text-red-400 text-[10px] mt-1.5 flex items-center gap-1.5 font-medium ml-1">
                      <i className="fas fa-exclamation-circle"></i>
                      {errors.name.message as string}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                E-mail Institucional
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                {...register('email')}
                className={`w-full bg-slate-950/50 ${errors.email ? 'border border-red-500' : 'border border-transparent'} 
                  rounded-xl px-4 py-3.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium`}
                placeholder="exemplo@email.com"
              />
              {errors.email && (
                <p className="text-red-400 text-[10px] mt-1.5 flex items-center gap-1.5 font-medium ml-1">
                  <i className="fas fa-exclamation-circle"></i>
                  {errors.email.message as string}
                </p>
              )}
            </div>

            <PasswordField
              register={register}
              error={errors.password}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              isLogin={isLogin}
              control={control}
            />

            <div>
              {!isLogin && (
                <div>
                  <ConfirmPasswordField
                    register={register}
                    error={errors.confirmPassword}
                    showConfirmPassword={showConfirmPassword}
                    setShowConfirmPassword={setShowConfirmPassword}
                    control={control}
                  />
                </div>
              )}
            </div>

            {error && (
              <div
                className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2"
              >
                <i className="fas fa-exclamation-circle text-base"></i>
                {error}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl shadow-xl shadow-emerald-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-sm"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <i className="fas fa-circle-notch animate-spin"></i>
                  <span>Processando...</span>
                </div>
              ) : (
                isLogin ? 'Entrar no Sistema' : 'Criar Conta'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/50"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                <span className="px-4 bg-[#0F131F] text-slate-500">Ou continue com</span>
              </div>
            </div>

            <div className="mt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const authResp = await authService.signInWithGoogle();
                    if (authResp.success) {
                      sessionStorage.removeItem('login_cache_cleared');
                    }
                  } catch (e) {
                    setError('Erro ao iniciar login com Google');
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full bg-slate-800/10 dark:bg-slate-800/50 hover:bg-slate-800 text-slate-300 py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent"
              >
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center p-0.5 grayscale group-hover:grayscale-0 transition-all">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                </div>
                <span className="text-xs font-semibold">Continuar com Google</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/50 text-center">
            <p className="text-slate-400 text-xs">
              {isLogin ? 'Não tem uma conta?' : 'Já possui cadastro?'}
              <button
                onClick={toggleMode}
                className="ml-2 text-emerald-400 font-bold hover:text-emerald-300 transition-colors cursor-pointer"
              >
                {isLogin ? 'Criar agora' : 'Fazer login'}
              </button>
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={() => setIsSupportOpen(true)}
                className="text-[10px] text-slate-500 hover:text-emerald-400 transition-colors flex items-center justify-center gap-1.5 mx-auto group"
              >
                <i className="fas fa-life-ring group-hover:rotate-12 transition-transform"></i>
                Precisa de ajuda?
              </button>
              
              <a 
                href="/admin/login"
                className="text-[10px] text-slate-600 hover:text-slate-400 font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 mx-auto"
              >
                <i className="fas fa-lock text-[8px]"></i>
                Acesso Administrativo
              </a>
            </div>
          </div>
        </MagicCard>
      </div>

      <SupportDialog
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        adminService={sharedAdminService}
      />
    </div >
  );
};


// Optimized Sub-components to prevent root re-renders on every keystroke
const PasswordField = ({ register, error, showPassword, setShowPassword, isLogin, control }: any) => {
  const passwordValue = useWatch({ control, name: 'password' });
  const confirmPasswordValue = useWatch({ control, name: 'confirmPassword' });
  const passwordsMatch = passwordValue && confirmPasswordValue && passwordValue === confirmPasswordValue;

  return (
    <div>
      <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
        Senha
      </label>
      <div className="relative">
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          {...register('password')}
          className={`w-full bg-slate-950/50 ${error
            ? 'border border-red-500'
            : !isLogin && passwordsMatch
              ? 'border border-emerald-500/80 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]'
              : 'border border-transparent'
            } rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium pr-10`}
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
        </button>
      </div>
      {error && (
        <p className="text-red-400 text-[10px] mt-1.5 flex items-center gap-1.5 font-medium ml-1">
          <i className="fas fa-exclamation-circle"></i>
          {error.message}
        </p>
      )}
    </div>
  );
};

const ConfirmPasswordField = ({ register, error, showConfirmPassword, setShowConfirmPassword, control }: any) => {
  const passwordValue = useWatch({ control, name: 'password' });
  const confirmPasswordValue = useWatch({ control, name: 'confirmPassword' });
  const passwordsMatch = passwordValue && confirmPasswordValue && passwordValue === confirmPasswordValue;

  return (
    <>
      <label htmlFor="confirmPassword" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1 mt-3">
        Confirmar Senha
      </label>
      <div className="relative">
        <input
          id="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          {...register('confirmPassword')}
          className={`w-full bg-slate-950/50 ${error
            ? 'border border-red-500'
            : passwordsMatch
              ? 'border border-emerald-500/80 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]'
              : 'border border-transparent'
            } rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium pr-10`}
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
        </button>
      </div>
      {error && (
        <p className="text-red-400 text-[10px] mt-1.5 flex items-center gap-1.5 font-medium ml-1">
          <i className="fas fa-exclamation-circle"></i>
          {error.message}
        </p>
      )}
      {passwordsMatch && !error && (
        <p
          className="text-emerald-400 text-[10px] mt-1.5 flex items-center gap-1.5 font-medium ml-1"
        >
          <i className="fas fa-check-circle"></i>
          Senhas conferem!
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 relative z-10">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            id="isMinor"
            {...register('isMinor')}
            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-600 bg-slate-900/50 checked:border-emerald-500 checked:bg-emerald-500 transition-all hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <i className="fas fa-check absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></i>
        </div>
        <label htmlFor="isMinor" className="text-xs text-slate-400 select-none cursor-pointer hover:text-slate-300 transition-colors">
          Sou menor de 18 anos (Requer supervisão)
        </label>
      </div>
    </>
  );
};

export default AuthForm;
