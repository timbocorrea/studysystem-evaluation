import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/AuthService';
import { loginSchema, type LoginFormData } from '../domain/schemas/authSchema';
import { MagicCard } from './ui/magic-card';
import { DotPattern } from './ui/dot-pattern';
import { toast } from 'sonner';

interface AdminAuthFormProps {
  authService: AuthService;
  onSuccess: () => void | Promise<void>;
}

const AdminAuthForm: React.FC<AdminAuthFormProps> = ({ authService, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur'
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError('');

    try {
      const res = await authService.login(data.email, data.password);

      if (res.success) {
        // A lógica de verificação de role e redirecionamento será tratada no componente App após o refreshSession
        // Mas podemos fazer um check rápido aqui se quisermos, porém o App é mais centralizado.
        await onSuccess();
      } else {
        setError(res.message || 'Ocorreu um erro.');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark h-screen flex items-center justify-center bg-[#050810] px-4 overflow-y-auto relative">
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

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/20">
            <i className="fas fa-user-shield text-white text-2xl drop-shadow-md"></i>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Acesso Restrito
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium uppercase tracking-widest">Painel Administrativo</p>
        </div>

        <MagicCard
          className="backdrop-blur-2xl p-8 rounded-[24px] shadow-2xl relative overflow-hidden group border border-white/5"
          gradientSize={400}
          gradientColor="#6366f1"
          gradientOpacity={0.15}
        >
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-1">Identificação Admin</h2>
            <p className="text-slate-400 text-xs">Apenas para instrutores e administradores.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                E-mail Administrativo
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`w-full bg-slate-950/50 ${errors.email ? 'border border-red-500' : 'border border-transparent'} 
                  rounded-xl px-4 py-3.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium`}
                placeholder="admin@studysystem.com"
              />
              {errors.email && (
                <p className="text-red-400 text-[10px] mt-1.5 flex items-center gap-1.5 font-medium ml-1">
                  <i className="fas fa-exclamation-circle"></i>
                  {errors.email.message as string}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                Senha Master
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`w-full bg-slate-950/50 ${errors.password ? 'border border-red-500' : 'border border-transparent'} 
                    rounded-xl px-4 py-3.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium pr-10`}
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
              {errors.password && (
                <p className="text-red-400 text-[10px] mt-1.5 flex items-center gap-1.5 font-medium ml-1">
                  <i className="fas fa-exclamation-circle"></i>
                  {errors.password.message as string}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <i className="fas fa-exclamation-circle text-base"></i>
                {error}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white font-black uppercase tracking-wider py-4 rounded-xl shadow-xl shadow-indigo-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-[10px]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <i className="fas fa-circle-notch animate-spin"></i>
                  <span>Autenticando...</span>
                </div>
              ) : (
                'Entrar no Painel'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-indigo-400 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <i className="fas fa-arrow-left"></i>
              Voltar ao Início
            </button>
          </div>
        </MagicCard>
      </div>
    </div>
  );
};

export default AdminAuthForm;
