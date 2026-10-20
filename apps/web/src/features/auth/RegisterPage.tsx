import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Building2, Eye, EyeOff, Hash, Lock, Mail, Phone, User } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ApiError } from '@/services/apiClient';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AuthBrandPanel } from './AuthBrandPanel';
import { MaskedInput } from '@/components/ui/MaskedInput';
import { onlyDigits } from '@/lib/masks';

const registerSchema = z.object({
  organizationName: z.string().min(2, 'Nome da marmoraria obrigatório'),
  slug: z.string().min(2, 'Slug obrigatório').regex(/^[a-z0-9-]+$/, 'Use apenas minúsculas, números e hífen'),
  documentNumber: z.string().optional(),
  phone: z.string().optional(),
  adminDisplayName: z.string().min(2, 'Nome obrigatório'),
  adminEmail: z.string().email('E-mail inválido'),
  adminPassword: z.string().min(8, 'Mínimo 8 caracteres'),
});

const fieldClass =
  'h-12 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-primary dark:focus:ring-primary/30';

export function RegisterPage() {
  const { registerOrg, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizationName: '',
    slug: '',
    documentNumber: '',
    phone: '',
    adminDisplayName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'organizationName' && !prev.slug) {
        next.slug = value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      return next;
    });
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
        organizationName: parsed.data.organizationName,
        slug: parsed.data.slug,
        documentNumber: onlyDigits(parsed.data.documentNumber ?? ''),
        adminDisplayName: parsed.data.adminDisplayName,
        adminEmail: parsed.data.adminEmail,
        adminPassword: parsed.data.adminPassword,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cadastrar organização.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-white dark:bg-zinc-950 md:flex-row">
      <AuthBrandPanel />

      <div className="relative z-20 flex min-h-screen w-full flex-col border-border/60 bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.12)] md:w-[25%] md:border-l dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-[-20px_0_40px_rgba(0,0,0,0.45)]">
        <div className="absolute right-4 top-4 z-10 md:right-6 md:top-6">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 flex-col justify-center overflow-y-auto p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md animate-in space-y-8 slide-in-from-right-12 duration-500">
            <div className="space-y-2">
              <div className="mb-6 flex justify-center md:hidden">
                <img src="/assets/logo-light.png" alt="Lumini" className="h-8 w-auto dark:hidden" />
                <img src="/assets/logo-dark.png" alt="Lumini" className="hidden h-8 w-auto dark:block" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Criar marmoraria
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Cadastre o tenant e o usuário Owner com acesso total.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Field
                id="organizationName"
                label="Nome da marmoraria"
                icon={<Building2 className="h-4 w-4" />}
                value={form.organizationName}
                onChange={(v) => update('organizationName', v)}
                error={fieldErrors.organizationName}
                placeholder="ex: GranVix Mármores"
              />
              <Field
                id="slug"
                label="Identificador (slug)"
                icon={<Hash className="h-4 w-4" />}
                value={form.slug}
                onChange={(v) => update('slug', v.toLowerCase())}
                error={fieldErrors.slug}
                placeholder="granvix-marmores"
              />
              <div className="space-y-2">
                <label htmlFor="documentNumber" className="ml-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  CNPJ (opcional)
                </label>
                <div className="relative group">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary dark:text-zinc-500 z-10" />
                  <MaskedInput
                    id="documentNumber"
                    mask="cnpj"
                    value={form.documentNumber}
                    onChange={(v) => update('documentNumber', v)}
                    className={`${fieldClass} h-12 rounded-xl`}
                  />
                </div>
                {fieldErrors.documentNumber && (
                  <p className="ml-1 text-[11px] text-destructive">{fieldErrors.documentNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="ml-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Telefone (opcional)
                </label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary dark:text-zinc-500 z-10" />
                  <MaskedInput
                    id="phone"
                    mask="phone"
                    value={form.phone}
                    onChange={(v) => update('phone', v)}
                    className={`${fieldClass} h-12 rounded-xl`}
                  />
                </div>
              </div>

              <Field
                id="adminDisplayName"
                label="Nome do responsável"
                icon={<User className="h-4 w-4" />}
                value={form.adminDisplayName}
                onChange={(v) => update('adminDisplayName', v)}
                error={fieldErrors.adminDisplayName}
                placeholder="Seu nome"
              />
              <Field
                id="adminEmail"
                label="E-mail do Owner"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                value={form.adminEmail}
                onChange={(v) => update('adminEmail', v)}
                error={fieldErrors.adminEmail}
                placeholder="admin@marmoraria.com"
                autoComplete="email"
              />

              <div className="space-y-2">
                <label htmlFor="adminPassword" className="ml-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Senha <span className="text-destructive">*</span>
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary dark:text-zinc-500" />
                  <input
                    id="adminPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.adminPassword}
                    onChange={(e) => update('adminPassword', e.target.value)}
                    className={`${fieldClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-primary dark:text-zinc-500 cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.adminPassword && (
                  <p className="ml-1 text-[11px] text-destructive">{fieldErrors.adminPassword}</p>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="h-14 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/92 hover:shadow-md active:scale-[0.98] disabled:opacity-50 dark:shadow-[0_4px_24px_rgba(249,115,22,0.18)] cursor-pointer"
              >
                {isLoading ? (
                  <span className="inline-flex items-center justify-center">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </span>
                ) : (
                  'Concluir cadastro'
                )}
              </button>

              <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Já tem conta?{' '}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Entrar no sistema
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  required = true,
  autoComplete,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="ml-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative group">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary dark:text-zinc-500">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
        />
      </div>
      {error && <p className="ml-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
