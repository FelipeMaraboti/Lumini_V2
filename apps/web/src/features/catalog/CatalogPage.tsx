import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { ApiError, apiRequest } from '@/services/apiClient';
import { MaskedInput, MaskedText, MmInput } from '@/components/ui';
import { parseDecimal, parseMm } from '@/lib/masks';

interface MaterialItem {
  id: string;
  name: string;
  rockKind: string;
  densityKgPerM3: number;
  thicknessesMm: number[];
  colorHex: string;
  textureName: string | null;
  version: number;
}

interface FinishItem {
  id: string;
  code: string;
  name: string;
  description: string;
  profile: string;
  minSlabThicknessMm: number;
  isSystem: boolean;
}

interface PricingRule {
  id: string;
  materialId: string | null;
  finishTypeId: string | null;
  basis: string;
  unitPrice: number;
}

interface PricingTable {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
  rules: PricingRule[];
}

interface Compatibility {
  compatible: boolean;
  message: string;
  minSlabThicknessMm: number;
}

const ROCKS = [
  { value: 'Marble', label: 'Mármore' },
  { value: 'Granite', label: 'Granito' },
  { value: 'Quartzite', label: 'Quartzito' },
] as const;

const materialSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do material.'),
  rockKind: z.enum(['Marble', 'Granite', 'Quartzite']),
  density: z.string().regex(/^\d+(\.\d+)?$/, 'Densidade inválida.'),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use uma cor #RRGGBB.'),
  thicknesses: z.array(z.string().min(1)).min(1, 'Informe ao menos uma espessura.'),
});

function moneyToApi(masked: string): string {
  const digits = masked.replace(/\D/g, '');
  const padded = (digits || '0').padStart(3, '0');
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
}

function rockLabel(kind: string) {
  return ROCKS.find((rock) => rock.value === kind)?.label ?? kind;
}

export function CatalogPage() {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [finishes, setFinishes] = useState<FinishItem[]>([]);
  const [tables, setTables] = useState<PricingTable[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [rockKind, setRockKind] = useState<(typeof ROCKS)[number]['value']>('Quartzite');
  const [density, setDensity] = useState('2700');
  const [colorHex, setColorHex] = useState('#D6D3D1');
  const [texture, setTexture] = useState('');
  const [thicknessInput, setThicknessInput] = useState('20');
  const [thicknesses, setThicknesses] = useState<string[]>(['20', '30']);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  const [finishId, setFinishId] = useState('');
  const [checkThickness, setCheckThickness] = useState('20');
  const [compatibility, setCompatibility] = useState<Compatibility | null>(null);

  const [priceBasis, setPriceBasis] = useState<'SquareMeter' | 'LinearMeter'>('SquareMeter');
  const [priceTarget, setPriceTarget] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const selected = materials.find((item) => item.id === selectedMaterialId) ?? materials[0] ?? null;
  const defaultTable = tables.find((table) => table.isDefault) ?? tables[0] ?? null;

  async function load() {
    const [materialRes, finishRes, tableRes] = await Promise.all([
      apiRequest<MaterialItem[]>('/catalog/materials'),
      apiRequest<FinishItem[]>('/catalog/finishes'),
      apiRequest<PricingTable[]>('/catalog/pricing-tables'),
    ]);
    setMaterials(materialRes.data);
    setFinishes(finishRes.data);
    setTables(tableRes.data);
    setSelectedMaterialId((current) => current ?? materialRes.data[0]?.id ?? null);
    setFinishId((current) => current || finishRes.data[0]?.id || '');
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof ApiError ? err.message : 'Falha ao carregar o catálogo.'));
  }, []);

  const activeThicknesses = useMemo(
    () => (selected ? selected.thicknessesMm.map((value) => String(value)) : thicknesses),
    [selected, thicknesses],
  );

  function addThickness() {
    const parsed = parseMm(thicknessInput);
    const raw = String(parsed);
    if (!parsed || thicknesses.includes(raw)) return;
    setThicknesses((current) => [...current, raw].sort((a, b) => Number(a) - Number(b)));
    setThicknessInput('');
  }

  async function createMaterial(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = materialSchema.safeParse({
      name,
      rockKind,
      density: String(parseDecimal(density)),
      colorHex,
      thicknesses,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados do material inválidos.');
      return;
    }

    try {
      await apiRequest('/catalog/materials', {
        method: 'POST',
        body: JSON.stringify({
          name: parsed.data.name,
          rockKind: parsed.data.rockKind,
          densityKgPerM3: parsed.data.density,
          thicknessesMm: parsed.data.thicknesses,
          colorHex: parsed.data.colorHex,
          textureName: texture || null,
        }),
      });
      setName('');
      setTexture('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao cadastrar material.');
    }
  }

  async function checkCompatibility(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCompatibility(null);
    try {
      const { data } = await apiRequest<Compatibility>('/catalog/compatibility', {
        method: 'POST',
        body: JSON.stringify({
          finishId,
          thicknessMm: String(parseMm(checkThickness)),
        }),
      });
      setCompatibility(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao validar a espessura.');
    }
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    if (!defaultTable || !priceTarget) {
      setError('Selecione o material ou o acabamento da regra.');
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/catalog/pricing-tables/${defaultTable.id}/rules`, {
        method: 'POST',
        body: JSON.stringify({
          materialId: priceBasis === 'SquareMeter' ? priceTarget : null,
          finishTypeId: priceBasis === 'LinearMeter' ? priceTarget : null,
          basis: priceBasis,
          unitPrice: moneyToApi(unitPrice),
        }),
      });
      setUnitPrice('');
      setNotice('Regra gravada na tabela padrão.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao gravar o preço.');
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link to="/" className="text-xs text-primary hover:underline">← Workspace</Link>
          <h1 className="mt-1 text-xl font-semibold">Configurações técnicas</h1>
          <p className="text-sm text-muted-foreground">Materiais, espessuras em milímetros e acabamentos de borda da marmoraria.</p>
        </div>

        {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-primary">{notice}</p>}

        <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {materials.length === 0 && <p className="text-sm text-muted-foreground">Nenhum material cadastrado.</p>}
            {materials.map((material) => (
              <button
                key={material.id}
                type="button"
                onClick={() => setSelectedMaterialId(material.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selected?.id === material.id ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
              >
                <span className="h-10 w-10 shrink-0 rounded-lg border border-border" style={{ background: material.colorHex }} />
                <span>
                  <span className="block text-sm font-medium">{material.name}</span>
                  <span className="block text-xs text-muted-foreground">{rockLabel(material.rockKind)} · {material.textureName || 'Sem textura'}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            {selected ? (
              <div className="flex flex-wrap items-start gap-4">
                <span className="h-24 w-24 rounded-xl border border-border" style={{ background: selected.colorHex }} />
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">{rockLabel(selected.rockKind)} · {selected.textureName || 'Textura não informada'} · <MaskedText mask="decimal" unit="kg/m³" value={selected.densityKgPerM3} /></p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.thicknessesMm.map((thickness) => (
                      <span key={thickness} className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                        <MaskedText mask="mm" unit="mm" value={String(thickness)} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Cadastre uma rocha para ver a amostra.</p>
            )}
          </div>
        </section>

        <form onSubmit={(e) => void createMaterial(e)} className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
          <h2 className="md:col-span-3 text-sm font-semibold">Novo material</h2>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome comercial" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
          <select value={rockKind} onChange={(e) => setRockKind(e.target.value as (typeof ROCKS)[number]['value'])} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
            {ROCKS.map((rock) => <option key={rock.value} value={rock.value}>{rock.label}</option>)}
          </select>
          <MaskedInput mask="decimal" unit="kg/m³" value={density} onChange={setDensity} />
          <input value={texture} onChange={(e) => setTexture(e.target.value)} placeholder="Textura ou veio" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
          <label className="flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
            <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} />
            Amostra
          </label>
          <div className="flex gap-2">
            <MmInput value={thicknessInput} onChange={setThicknessInput} />
            <button type="button" onClick={addThickness} className="h-10 rounded-lg border border-border px-3 text-sm">Adicionar</button>
          </div>
          <p className="md:col-span-3 text-xs text-muted-foreground">
            Espessuras:{' '}
            {thicknesses.length === 0
              ? 'nenhuma'
              : thicknesses.map((item, index) => (
                  <span key={item}>{index > 0 ? ', ' : ''}<MaskedText mask="mm" unit="mm" value={item} /></span>
                ))}
          </p>
          <button type="submit" className="h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground md:col-span-3">Cadastrar material</button>
        </form>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Acabamentos de borda</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {finishes.map((finish) => (
              <article key={finish.id} className="rounded-xl border border-border bg-card p-4">
                <EdgeProfile profile={finish.profile} />
                <h3 className="mt-3 text-sm font-semibold">{finish.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{finish.description}</p>
                <p className="mt-2 text-xs font-medium">Mínimo <MaskedText mask="mm" unit="mm" value={String(finish.minSlabThicknessMm)} /></p>
              </article>
            ))}
          </div>
        </section>

        <form onSubmit={(e) => void checkCompatibility(e)} className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
          <h2 className="md:col-span-3 text-sm font-semibold">Compatibilidade da chapa</h2>
          <select value={finishId} onChange={(e) => setFinishId(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm md:col-span-2">
            {finishes.map((finish) => <option key={finish.id} value={finish.id}>{finish.name}</option>)}
          </select>
          <MmInput value={checkThickness} onChange={setCheckThickness} />
          <div className="flex flex-wrap gap-2 md:col-span-3">
            {activeThicknesses.map((thickness) => (
              <button key={thickness} type="button" onClick={() => setCheckThickness(thickness)} className="rounded-full border border-border px-2 py-1 text-xs">
                <MaskedText mask="mm" unit="mm" value={thickness} />
              </button>
            ))}
          </div>
          <button type="submit" className="h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground md:col-span-3">Validar no servidor</button>
          {compatibility && (
            <p className={`md:col-span-3 text-sm ${compatibility.compatible ? 'text-primary' : 'text-destructive'}`}>{compatibility.message}</p>
          )}
        </form>

        <form onSubmit={(e) => void addRule(e)} className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold">{defaultTable ? defaultTable.name : 'Tabela de preços'} · BRL</h2>
          <select value={priceBasis} onChange={(e) => { setPriceBasis(e.target.value as 'SquareMeter' | 'LinearMeter'); setPriceTarget(''); }} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="SquareMeter">Material por m²</option>
            <option value="LinearMeter">Acabamento por metro linear</option>
          </select>
          <select value={priceTarget} onChange={(e) => setPriceTarget(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="">Selecione</option>
            {priceBasis === 'SquareMeter'
              ? materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)
              : finishes.map((finish) => <option key={finish.id} value={finish.id}>{finish.name}</option>)}
          </select>
          <MaskedInput mask="currency" unit={priceBasis === 'SquareMeter' ? '/ m²' : '/ m'} value={unitPrice} onChange={setUnitPrice} />
          <button type="submit" className="h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Adicionar regra</button>
          <ul className="md:col-span-2 space-y-1 text-sm">
            {defaultTable?.rules.map((rule) => (
              <li key={rule.id} className="flex justify-between border-t border-border py-2">
                <span>{rule.basis === 'SquareMeter' ? materials.find((item) => item.id === rule.materialId)?.name : finishes.find((item) => item.id === rule.finishTypeId)?.name}</span>
                <span><MaskedText mask="currency" unit={rule.basis === 'SquareMeter' ? '/ m²' : '/ m'} value={rule.unitPrice} /></span>
              </li>
            ))}
          </ul>
        </form>
      </div>
    </div>
  );
}

function EdgeProfile({ profile }: { profile: string }) {
  return (
    <svg viewBox="0 0 160 72" className="h-16 w-full rounded-lg bg-muted" aria-hidden="true">
      <path d={profilePath(profile)} fill="currentColor" className="text-foreground/80" />
    </svg>
  );
}

function profilePath(profile: string): string {
  switch (profile) {
    case 'rebate-italian':
      return 'M12 18 H148 V54 H118 V40 H42 V54 H12 Z';
    case 'rebate-american':
      return 'M12 18 H148 V54 H100 V36 H40 V54 H12 Z';
    case 'miter-45':
      return 'M12 22 H120 L148 50 H12 Z';
    case 'miter-45-skirt':
      return 'M12 16 H118 L140 38 V58 H12 Z';
    case 'bullnose':
      return 'M12 28 H108 Q148 28 148 52 H12 Z';
    case 'half-bullnose':
      return 'M12 20 H100 A28 28 0 0 1 148 48 V56 H12 Z';
    case 'bevel':
      return 'M12 20 H118 L148 40 V56 H12 Z';
    case 'laminated-skirt':
      return 'M12 16 H148 V36 H132 V56 H28 V36 H12 Z';
    default:
      return 'M12 22 H148 V56 H12 Z';
  }
}
