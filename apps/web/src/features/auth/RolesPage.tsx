import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, ApiError } from '@/services/apiClient';
import { useAuth } from './AuthContext';

interface Role {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  permissionCodes: string[];
}

export function RolesPage() {
  const { hasAnyPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await apiRequest<Role[]>('/roles');
        setRoles(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Falha ao carregar papéis.');
      } finally {
        setLoading(false);
      }
    }
    if (hasAnyPermission('roles.read', 'organization.manage')) {
      void load();
    } else {
      setLoading(false);
      setError('Sem permissão para listar papéis.');
    }
  }, [hasAnyPermission]);

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-background text-foreground">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link to="/" className="text-xs text-primary hover:underline">← Voltar ao workspace</Link>
          <h1 className="text-lg font-semibold mt-1">Papéis e permissões</h1>
          <p className="text-xs text-muted-foreground">RBAC por tenant (UI-013)</p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">{role.name}</h2>
                  <p className="text-[11px] text-muted-foreground">{role.description || '—'}</p>
                </div>
                {role.isSystemRole && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">Sistema</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                {role.permissionCodes.length} permissões · {role.permissionCodes.slice(0, 6).join(', ')}
                {role.permissionCodes.length > 6 ? '…' : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
