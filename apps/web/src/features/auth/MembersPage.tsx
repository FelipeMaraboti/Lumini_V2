import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, ApiError } from '@/services/apiClient';
import { useAuth } from './AuthContext';

interface Member {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  roleName: string;
  roleId: string;
  status: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

export function MembersPage() {
  const { hasAnyPermission } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const canManage = hasAnyPermission('members.manage', 'organization.manage');

  useEffect(() => {
    async function load() {
      try {
        const [membersRes, rolesRes] = await Promise.all([
          apiRequest<Member[]>('/members'),
          apiRequest<Role[]>('/roles'),
        ]);
        setMembers(membersRes.data);
        setRoles(rolesRes.data);
        if (rolesRes.data[0]) setRoleId(rolesRes.data[0].id);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Falha ao carregar membros.');
      } finally {
        setLoading(false);
      }
    }
    if (hasAnyPermission('members.read', 'organization.manage')) {
      void load();
    } else {
      setLoading(false);
      setError('Sem permissão para listar membros.');
    }
  }, [hasAnyPermission]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteToken(null);
    try {
      const { data } = await apiRequest<{ message: string; expiresAtUtc: string; inviteToken?: string }>(
        '/members/invitations',
        { method: 'POST', body: JSON.stringify({ email, roleId }) },
      );
      setInviteToken(data.inviteToken ?? null);
      setEmail('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao convidar.');
    }
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-background text-foreground">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/" className="text-xs text-primary hover:underline">← Voltar ao workspace</Link>
            <h1 className="text-lg font-semibold mt-1">Membros da marmoraria</h1>
            <p className="text-xs text-muted-foreground">Gestão de usuários e convites (UI-012)</p>
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

        {!loading && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">Nome</th>
                  <th className="p-3">E-mail</th>
                  <th className="p-3">Papel</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr key={m.membershipId}>
                    <td className="p-3 font-medium">{m.displayName}</td>
                    <td className="p-3">{m.email}</td>
                    <td className="p-3">{m.roleName}</td>
                    <td className="p-3">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canManage && (
          <form onSubmit={handleInvite} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold">Convidar membro</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                placeholder="email@marmoraria.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button type="submit" className="h-9 px-4 rounded-lg border border-border bg-foreground/5 text-foreground text-xs font-semibold cursor-pointer hover:border-primary/50">
                Gerar convite
              </button>
            </div>
            {inviteToken && (
              <p className="text-[11px] text-muted-foreground break-all">
                Token de uso único (dev): <span className="font-mono text-foreground">{inviteToken}</span>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
