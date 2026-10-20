import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ApiError } from '@/services/apiClient';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthBrandPanel } from './AuthBrandPanel';

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
});

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[String(issue.path[0] ?? 'form')] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    try {
      await login(parsed.data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao realizar login.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-white dark:bg-zinc-950 md:flex-row">
      <AuthBrandPanel />

      {/* Formulário — 25% */}
      <div className="relative z-20 flex min-h-screen w-full flex-col justify-center border-border/60 bg-white p-8 shadow-[-20px_0_50px_rgba(0,0,0,0.12)] md:w-[25%] md:border-l lg:p-12 dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-[-20px_0_40px_rgba(0,0,0,0.45)]">
        <div className="absolute right-4 top-4 z-10 md:right-6 md:top-6">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-md animate-in space-y-10 slide-in-from-right-12 duration-500">
          <div className="space-y-2">
            <div className="mb-8 flex justify-center md:hidden">
              <img src="/assets/logo-light.png" alt="Lumini" className="h-8 w-auto dark:hidden" />
              <img src="/assets/logo-dark.png" alt="Lumini" className="hidden h-8 w-auto dark:block" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Acesse sua conta
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Bem-vindo de volta ao cockpit de gestão.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="ml-1 font-medium text-zinc-700 dark:text-zinc-300 text-sm">
                  E-mail corporativo <span className="text-destructive">*</span>
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary dark:text-zinc-500" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="ex: admin@marmoraria.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-primary dark:focus:ring-primary/30"
                  />
                </div>
                {fieldErrors.email && <p className="ml-1 text-[11px] text-destructive">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="ml-1 font-medium text-zinc-700 dark:text-zinc-300 text-sm">
                  Chave de acesso <span className="text-destructive">*</span>
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary dark:text-zinc-500" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-12 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-primary dark:focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 transition-colors hover:text-primary dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="ml-1 text-[11px] text-destructive">{fieldErrors.password}</p>}
                <div className="mt-2 flex justify-end">
                  <span className="h-auto p-0 text-xs font-medium text-primary/90 dark:text-orange-300/90">
                    Esqueceu seus dados de acesso?
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="h-14 w-full rounded-xl border border-primary/40 bg-foreground/5 text-base font-bold text-foreground transition-all hover:border-primary hover:bg-primary/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </span>
              ) : (
                'Entrar no Sistema'
              )}
            </button>

            <div className="border-t border-zinc-100 pt-8 dark:border-zinc-800 space-y-4">
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                Nova marmoraria?{' '}
                <Link to="/register" className="font-medium text-primary hover:underline">
                  Cadastrar organização
                </Link>
              </p>
              <p className="text-center text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                Acesso restrito para administradores Master e Associados autorizados.
                <br />
                &copy; {new Date().getFullYear()} Lumini. Todos os direitos reservados.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
