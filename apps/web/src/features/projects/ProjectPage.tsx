import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiRequest } from '@/services/apiClient';
import { useAuth } from '@/features/auth/AuthContext';

interface Project {
  id: string;
  code: string;
  name: string;
  clientName: string;
  status: string;
  currentRevisionId: string | null;
  revisionNumber: number | null;
  revisionStatus: string | null;
  version: number;
}

interface Revision {
  id: string;
  revisionNumber: number;
  status: string;
  snapshotJson: string;
}

interface PricingTable {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
}

interface QuotePreview {
  revisionNumber: number;
  pricingTableName: string;
  grossAreaScenarioTotal: number | null;
  netAreaScenarioTotal: number | null;
  hasUnpricedGeometryLines: boolean;
  lines: Array<{
    partCode: string;
    category: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number | null;
    grossAmount: number | null;
    netAmount: number | null;
    status: string;
  }>;
  warnings: Array<{ code: string; message: string }>;
}

const NEXT: Record<string, string | undefined> = {
  Draft: 'InReview',
  InReview: 'Approved',
  Approved: 'InProduction',
  InProduction: 'Completed',
};

export function ProjectPage() {
  const { id = '' } = useParams();
  const { hasPermission } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [etag, setEtag] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>('');
  const [conflict, setConflict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pricingTables, setPricingTables] = useState<PricingTable[]>([]);
  const [pricingTableId, setPricingTableId] = useState('');
  const [quotePreview, setQuotePreview] = useState<QuotePreview | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  async function load() {
    const [response, revisionRes] = await Promise.all([
      apiRequest<Project>(`/projects/${id}`),
      apiRequest<Revision[]>(`/projects/${id}/revisions`),
    ]);
    setProject(response.data);
    setName(response.data.name);
    setEtag(response.etag ?? String(response.data.version));
    setRevisions(revisionRes.data);
    const current = revisionRes.data.find((revision) => revision.revisionNumber === response.data.revisionNumber);
    setSelectedRevisionId(current?.id ?? revisionRes.data[0]?.id ?? '');
    setConflict(null);
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof ApiError ? err.message : 'Projeto não encontrado.'));
  }, [id]);

  useEffect(() => {
    if (!hasPermission('quotes.create')) return;
    apiRequest<PricingTable[]>(`/projects/${id}/quotes/pricing-tables`)
      .then(({ data }) => {
        setPricingTables(data);
        setPricingTableId(data.find((item) => item.isDefault)?.id ?? data[0]?.id ?? '');
      })
      .catch((err) => setQuoteError(err instanceof ApiError ? err.message : 'Falha ao carregar tabelas de preço.'));
  }, [hasPermission]);

  async function calculateQuotePreview() {
    if (!selectedRevisionId || !pricingTableId) return;
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const { data } = await apiRequest<QuotePreview>(`/projects/${id}/quotes/preview`, {
        method: 'POST',
        body: JSON.stringify({ revisionId: selectedRevisionId, pricingTableId }),
      });
      setQuotePreview(data);
    } catch (err) {
      setQuoteError(err instanceof ApiError ? err.message : 'Falha ao calcular a prévia.');
      setQuotePreview(null);
    } finally {
      setQuoteLoading(false);
    }
  }

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

  const selected = revisions.find((revision) => revision.id === selectedRevisionId);

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
            <p className={name === project.name ? 'text-emerald-500' : 'text-amber-500'}>
              {name === project.name ? 'Sincronizado' : 'Alterações pendentes'}
            </p>
          </div>
        </header>

        {project.currentRevisionId && project.revisionStatus === 'Draft' && (
          <Link
            to={`/projects/${project.id}/drawing`}
            className="inline-flex h-10 items-center border border-primary/50 bg-primary/10 px-4 text-sm font-semibold text-primary hover:bg-primary/15"
          >
            Abrir editor 2D/3D da revisão atual
          </Link>
        )}

        <label className="block text-xs text-muted-foreground">
          Revisão
          <select
            value={selectedRevisionId}
            onChange={(e) => {
              setSelectedRevisionId(e.target.value);
              setQuotePreview(null);
            }}
            className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground"
          >
            {revisions.map((revision) => (
              <option key={revision.id} value={revision.id}>
                REV {revision.revisionNumber} · {revision.status}
                {revision.revisionNumber === project.revisionNumber ? ' · atual' : ' · histórica'}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <pre className="overflow-auto rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            {selected.snapshotJson}
          </pre>
        )}

        {hasPermission('quotes.create') && (
          <section className="space-y-3 border-y border-border py-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-56 flex-1 gap-1 text-xs text-muted-foreground">
                Tabela de preço
                <select
                  value={pricingTableId}
                  onChange={(event) => {
                    setPricingTableId(event.target.value);
                    setQuotePreview(null);
                  }}
                  className="h-10 border border-input bg-card px-3 text-sm text-foreground"
                  disabled={!pricingTables.length || quoteLoading}
                >
                  {pricingTables.map((table) => <option key={table.id} value={table.id}>{table.name} · {table.currency}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void calculateQuotePreview()}
                disabled={!selectedRevisionId || !pricingTableId || quoteLoading}
                className="h-10 border border-primary/50 bg-primary/10 px-4 text-sm font-semibold text-primary disabled:opacity-50"
              >
                {quoteLoading ? 'Calculando…' : 'Calcular prévia'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Prévia vinculada à revisão e à tabela. Não é proposta aprovada; não inclui impostos, margem, descontos, frete, instalação ou insumos sem regra cadastrada.</p>
            {quoteError && <p role="alert" className="text-sm text-destructive">{quoteError}</p>}
            {quotePreview && (
              <div className="space-y-3 border border-border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold">Prévia · REV {quotePreview.revisionNumber} · {quotePreview.pricingTableName}</h2>
                  <p className="font-mono text-xs text-muted-foreground">
                    BRUTO {quotePreview.grossAreaScenarioTotal === null ? 'incompleto' : currency(quotePreview.grossAreaScenarioTotal)} · LÍQUIDO {quotePreview.netAreaScenarioTotal === null ? 'incompleto' : currency(quotePreview.netAreaScenarioTotal)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-160 text-left text-xs">
                    <thead className="border-b border-border text-muted-foreground">
                      <tr><th className="py-2">Peça</th><th>Item</th><th>Qtd.</th><th>Preço unit.</th><th>Bruto</th><th>Líquido</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quotePreview.lines.map((line, index) => (
                        <tr key={`${line.partCode}-${line.category}-${line.description}-${index}`}>
                          <td className="py-2 font-mono">{line.partCode}</td>
                          <td>{line.description}</td>
                          <td>{line.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} {line.unit}</td>
                          <td>{line.unitPrice === null ? 'Sem regra' : currency(line.unitPrice)}</td>
                          <td>{line.grossAmount === null ? '—' : currency(line.grossAmount)}</td>
                          <td>{line.netAmount === null ? '—' : currency(line.netAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {quotePreview.warnings.length > 0 && (
                  <ul className="space-y-1 border-t border-border pt-3 text-xs text-amber-700 dark:text-amber-300">
                    {quotePreview.warnings.map((warning) => <li key={warning.code}>{warning.message}</li>)}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {conflict && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            {conflict}
            <button type="button" onClick={() => void load()} className="ml-3 font-semibold text-primary">Recarregar</button>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <form onSubmit={(e) => void save(e)} className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm" />
          <button type="submit" className="h-10 rounded-lg border border-border bg-foreground/5 px-4 text-sm font-semibold text-foreground hover:border-primary/50">Salvar</button>
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

function currency(amount: number): string {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
