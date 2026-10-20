import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiRequest } from '@/services/apiClient';
import { MaskedInput, MaskedText } from '@/components/ui';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phoneDigits: string | null;
  documentDigits: string | null;
  notes: string | null;
  status: string;
  version: number;
}

interface ProjectItem {
  id: string;
  code: string;
  name: string;
  status: string;
  revisionNumber: number | null;
}

interface Paged<T> { items: T[] }

export function ClientPage() {
  const { id = '' } = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentDigits, setDocumentDigits] = useState('');
  const [notes, setNotes] = useState('');
  const [etag, setEtag] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);

  async function load() {
    const [clientRes, projectRes] = await Promise.all([
      apiRequest<Client>(`/clients/${id}`),
      apiRequest<Paged<ProjectItem>>(`/projects?clientId=${id}&page=1&pageSize=50`),
    ]);
    setClient(clientRes.data);
    setName(clientRes.data.name);
    setEmail(clientRes.data.email ?? '');
    setPhone(clientRes.data.phoneDigits ?? '');
    setDocumentDigits(clientRes.data.documentDigits ?? '');
    setNotes(clientRes.data.notes ?? '');
    setEtag(clientRes.etag ?? String(clientRes.data.version));
    setProjects(projectRes.data.items);
    setConflict(null);
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof ApiError ? err.message : 'Cliente não encontrado.'));
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const response = await apiRequest<Client>(`/clients/${id}`, {
        method: 'PUT',
        etag,
        body: JSON.stringify({ name, email, phoneDigits: phone, documentDigits, notes }),
      });
      setClient(response.data);
      setEtag(response.etag ?? String(response.data.version));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_CONFLICT') {
        setConflict(err.message);
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar cliente.');
    }
  }

  if (!client) {
    return <div className="p-6 text-sm text-muted-foreground">{error ?? 'Carregando…'}</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link to="/clients" className="text-xs text-primary hover:underline">← Clientes</Link>
        <header className="rounded-xl border border-border bg-card p-4">
          <h1 className="text-xl font-semibold">{client.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <MaskedText mask="phone" value={client.phoneDigits} /> · <MaskedText mask="document" value={client.documentDigits} />
          </p>
          <p className="text-xs text-muted-foreground">versão {client.version} · {client.status}</p>
        </header>

        {conflict && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            {conflict}
            <button type="button" onClick={() => void load()} className="ml-3 font-semibold text-primary">Recarregar</button>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <form onSubmit={(e) => void save(e)} className="grid gap-3 rounded-xl border border-border bg-card p-4">
          <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
          <MaskedInput mask="phone" value={phone} onChange={setPhone} />
          <MaskedInput mask="document" value={documentDigits} onChange={setDocumentDigits} />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas" className="min-h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <button type="submit" className="h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Salvar cliente</button>
        </form>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Projetos vinculados</h2>
          {projects.length === 0 && <p className="text-sm text-muted-foreground">Nenhum projeto para este cliente.</p>}
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="block rounded-xl border border-border bg-card p-3 hover:border-primary/40">
              <p className="font-mono text-xs text-primary">{project.code}</p>
              <p className="font-medium">{project.name}</p>
              <p className="text-xs text-muted-foreground">{project.status} · REV {project.revisionNumber ?? '—'}</p>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
