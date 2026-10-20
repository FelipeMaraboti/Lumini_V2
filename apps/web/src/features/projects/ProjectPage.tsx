import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiRequest } from '@/services/apiClient';

interface Project {
  id: string;
  code: string;
  name: string;
  clientName: string;
  status: string;
  revisionNumber: number | null;
  revisionStatus: string | null;
  version: number;
}

const NEXT: Record<string, string | undefined> = {
  Draft: 'InReview',
  InReview: 'Approved',
  Approved: 'InProduction',
  InProduction: 'Completed',
};

export function ProjectPage() {
  const { id = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [etag, setEtag] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [conflict, setConflict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await apiRequest<Project>(`/projects/${id}`);
    setProject(response.data);
    setName(response.data.name);
    setEtag(response.etag ?? String(response.data.version));
    setConflict(null);
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof ApiError ? err.message : 'Projeto não encontrado.'));
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const response = await apiRequest<Project>(`/projects/${id}`, {
        method: 'PUT',
        etag,
        body: JSON.stringify({ name }),
      });
      setProject(response.data);
      setEtag(response.etag ?? String(response.data.version));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_CONFLICT') {
        setConflict(err.message);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar.');
    }
  }

  async function transition() {
    if (!project) return;
    const status = NEXT[project.status];
    if (!status) return;
    try {
      const response = await apiRequest<Project>(`/projects/${id}/transitions`, {
        method: 'POST',
        etag,
        body: JSON.stringify({ status }),
      });
      setProject(response.data);
      setEtag(response.etag ?? String(response.data.version));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Transição recusada.');
    }
  }

  async function openRevision() {
    try {
      await apiRequest(`/projects/${id}/revisions`, { method: 'POST', etag, body: '{}' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível abrir a revisão.');
    }
  }

  if (!project) {
    return <div className="p-6 text-sm text-muted-foreground">{error ?? 'Carregando…'}</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link to="/projects" className="text-xs text-primary hover:underline">← Projetos</Link>
        <header className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="font-mono text-xs text-primary">{project.code}</p>
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.clientName}</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">{project.status}</p>
            <p>REV {project.revisionNumber ?? '—'} · {project.revisionStatus ?? '—'}</p>
            <p className="text-muted-foreground">versão {project.version}</p>
          </div>
        </header>

        {conflict && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            {conflict}
            <button type="button" onClick={() => void load()} className="ml-3 font-semibold text-primary">Recarregar</button>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <form onSubmit={(e) => void save(e)} className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm" />
          <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Salvar</button>
        </form>

        <div className="flex gap-2">
          {NEXT[project.status] && (
            <button type="button" onClick={() => void transition()} className="h-10 rounded-lg border border-border px-4 text-sm">
              Avançar para {NEXT[project.status]}
            </button>
          )}
          {project.status === 'Approved' && (
            <button type="button" onClick={() => void openRevision()} className="h-10 rounded-lg border border-border px-4 text-sm">
              Abrir nova revisão
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
