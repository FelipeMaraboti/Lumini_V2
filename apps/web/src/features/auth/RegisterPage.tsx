import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { ApiError } from '@/services/apiClient';

const registerSchema = z.object({
  organizationName: z.string().min(2, 'Nome da marmoraria obrigatório'),
  slug: z.string().min(2, 'Slug obrigatório').regex(/^[a-z0-9-]+$/, 'Use apenas minúsculas, números e hífen'),
  documentNumber: z.string().optional(),
  adminDisplayName: z.string().min(2, 'Nome obrigatório'),
  adminEmail: z.string().email('E-mail inválido'),
  adminPassword: z.string().min(8, 'Mínimo 8 caracteres'),
});

export function RegisterPage() {
  const { registerOrg, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizationName: '',
    slug: '',
    documentNumber: '',
    adminDisplayName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errors[String(issue.path[0] ?? 'form')] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    try {
      await registerOrg({
        ...parsed.data,
        documentNumber: parsed.data.documentNumber ?? '',
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cadastrar organização.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Cadastrar marmoraria</h1>
          <p className="text-sm text-muted-foreground">Cria o tenant e o usuário Owner com acesso total.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 bg-card border border-border rounded-xl p-5 shadow-xs" noValidate>
          {([
            ['organizationName', 'Nome da marmoraria', 'text'],
            ['slug', 'Identificador (slug)', 'text'],
            ['documentNumber', 'CNPJ (opcional)', 'text'],
            ['adminDisplayName', 'Seu nome', 'text'],
            ['adminEmail', 'E-mail do Owner', 'email'],
            ['adminPassword', 'Senha', 'password'],
          ] as const).map(([key, label, type]) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-muted-foreground">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {fieldErrors[key] && <p className="text-[11px] text-destructive">{fieldErrors[key]}</p>}
            </div>
          ))}

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
            {isLoading ? 'Criando…' : 'Criar organização'}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          Já tem conta?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
