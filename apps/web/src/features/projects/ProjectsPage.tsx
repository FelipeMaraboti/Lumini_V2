import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiRequest } from '@/services/apiClient';

interface ClientItem { id: string; name: string }
interface ProjectItem {
  id: string;
  code: string;
  name: string;
  clientName: string;
  status: string;
  revisionNumber: number | null;
}
interface Paged<T> { items: T[] }

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [clientId, setClientId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [projectRes, clientRes] = await Promise.all([
      apiRequest<Paged<ProjectItem>>('/projects?page=1&pageSize=50'),
      apiRequest<Paged<ClientItem>>('/clients?page=1&pageSize=100'),
    ]);
    setProjects(projectRes.data.items);
    setClients(clientRes.data.items);
    if (!clientId && clientRes.data.items[0]) setClientId(clientRes.data.items[0].id);
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof ApiError ? err.message : 'Falha ao carregar projetos.'));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/projects', { method: 'POST', body: JSON.stringify({ clientId, code, name }) });
      setCode('');
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar projeto.');
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link to="/" className="text-xs text-primary hover:underline">← Workspace</Link>
          <h1 className="mt-1 text-xl font-semibold">Projetos</h1>
        </div>

        <form onSubmit={(e) => void create(e)} className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm md:col-span-2">
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="Código" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nome do projeto" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
          <button type="submit" className="h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground md:col-span-4">Criar projeto</button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-primary">{project.code}</p>
                  <p className="font-semibold">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.clientName}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold">{project.status}</p>
                  <p className="text-muted-foreground">REV {project.revisionNumber ?? '—'}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
