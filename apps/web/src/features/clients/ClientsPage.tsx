import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiRequest } from '@/services/apiClient';
import { MaskedInput, MaskedText } from '@/components/ui';

interface ClientItem {
  id: string;
  name: string;
  email: string | null;
  phoneDigits: string | null;
  documentDigits: string | null;
  status: string;
  version: number;
}

interface Paged<T> {
  items: T[];
  total: number;
}

export function ClientsPage() {
  const [items, setItems] = useState<ClientItem[]>([]);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentDigits, setDocumentDigits] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load(term = search) {
    const { data } = await apiRequest<Paged<ClientItem>>(`/clients?search=${encodeURIComponent(term)}&page=1&pageSize=50`);
    setItems(data.items);
  }

  useEffect(() => {
    void load('').catch((err) => setError(err instanceof ApiError ? err.message : 'Falha ao listar clientes.'));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/clients', {
        method: 'POST',
        body: JSON.stringify({ name, email, phoneDigits: phone, documentDigits, notes: null }),
      });
      setName('');
      setEmail('');
      setPhone('');
      setDocumentDigits('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar cliente.');
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link to="/" className="text-xs text-primary hover:underline">← Workspace</Link>
          <h1 className="mt-1 text-xl font-semibold">Clientes</h1>
        </div>

        <form onSubmit={(e) => void create(e)} className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nome" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-mail" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
          <MaskedInput mask="phone" value={phone} onChange={setPhone} />
          <MaskedInput mask="document" value={documentDigits} onChange={setDocumentDigits} />
          <button type="submit" className="h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground md:col-span-2">Cadastrar cliente</button>
        </form>

        <input value={search} onChange={(e) => { setSearch(e.target.value); void load(e.target.value); }} placeholder="Buscar por nome ou e-mail" className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" />
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr><th className="p-3">Nome</th><th className="p-3">Telefone</th><th className="p-3">Documento</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {items.map((client) => (
                <tr key={client.id} className="border-t border-border">
                  <td className="p-3"><Link to={`/clients/${client.id}`} className="font-medium text-primary hover:underline">{client.name}</Link></td>
                  <td className="p-3"><MaskedText mask="phone" value={client.phoneDigits} /></td>
                  <td className="p-3"><MaskedText mask="document" value={client.documentDigits} /></td>
                  <td className="p-3">{client.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
