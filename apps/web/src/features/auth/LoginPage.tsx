import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { ApiError } from '@/services/apiClient';

const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
});

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        const key = String(issue.path[0] ?? 'form');
        errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    try {
      await login(parsed.data);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Não foi possível autenticar. Tente novamente.');
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-border">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, rgba(202,53,0,0.25), transparent 50%), linear-gradient(160deg, #0c0a09 0%, #1d1816 45%, #2b2422 100%)',
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <img src="/assets/logo-dark.png" alt="Lumini" className="h-9 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <span className="text-[10px] font-mono font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30">V2</span>
          </div>
          <div className="space-y-4 max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Modelo Técnico Central</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Acesse a marmoraria para desenhar, orçar e cortar com uma única fonte de verdade em milímetros.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">Multi-tenant · RBAC · JWT</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Entrar</h2>
            <p className="text-sm text-muted-foreground">Use o e-mail da sua conta na marmoraria.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-muted-foreground">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {fieldErrors.email && <p className="text-[11px] text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground">Senha</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {fieldErrors.password && <p className="text-[11px] text-destructive">{fieldErrors.password}</p>}
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            Nova marmoraria?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Cadastrar organização
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
