import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Compass, 
  Scissors, 
  CurrencyDollar, 
  FileText, 
  Package, 
  FloppyDisk, 
  Check,
  SignOut,
  Users,
  ShieldCheck,
  Buildings,
  Folder,
  Palette
} from '@phosphor-icons/react';
import { addHole, addSink, boundsOf, lPart, netAreaMm2, rectanglePart, snapMm, type EdgeFinishType, type EdgeSegment, type Hole, type Part } from '@lumini/geometry-core';
import { useAuth } from '@/features/auth/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MaskedText } from '@/components/ui/MaskedText';
import { PieceEditor, type DimensionOverride } from '@/editor2d/PieceEditor';
import { AssemblyView } from '@/editor3d/AssemblyView';
import { initialKitchen, type PlacedPart } from '@/editor2d/kitchen';

const finishLabel: Record<EdgeFinishType, string> = {
  raw: 'Corte bruto',
  straight_polish: 'Polimento reto',
  miter_45: 'Meia-esquadria 45°',
  bullnose: 'Boleado',
  half_bullnose: 'Meia-cana',
  bevel: 'Bisotê',
  italian_recess: 'Rebaixo italiano',
  american_recess: 'Rebaixo americano',
};

export default function App() {
  const { user, logout, hasAnyPermission } = useAuth();
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('lumini_theme');
    return stored ? stored === 'dark' : true;
  });
  const [activeTab, setActiveTab] = useState<'drawing' | 'pricing' | 'cutting' | 'inventory' | 'documents'>('drawing');
  const [selectedPartId, setSelectedPartId] = useState<string>('part-1');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>('e3');
  const [placed, setPlaced] = useState<PlacedPart[]>(() => initialKitchen());
  const [editorNotice, setEditorNotice] = useState<string | null>(null);
  const [dimensionState, setDimensionState] = useState<Record<string, DimensionOverride>>({});
  const [space, setSpace] = useState<'2d' | '3d'>('2d');
  const placedRef = useRef(placed);
  const pastRef = useRef<PlacedPart[][]>([]);
  const futureRef = useRef<PlacedPart[][]>([]);
  placedRef.current = placed;

  // Sincroniza com ThemeToggle / localStorage
  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const selected = placed.find((item) => item.part.id === selectedPartId) ?? placed[0];
  const selectedPart = selected.part;
  const selectedBox = boundsOf(selectedPart.outerContour);

  function selectPart(partId: string) {
    setSelectedPartId(partId);
    const part = placed.find((item) => item.part.id === partId)?.part;
    setSelectedEdgeId((current) => (part?.edges.some((edge) => edge.id === current) ? current : part?.edges[0]?.id ?? null));
  }

  function setDimension(partId: string, edgeId: string, next: DimensionOverride) {
    setDimensionState((current) => ({ ...current, [`${partId}:${edgeId}`]: next }));
  }

  useEffect(() => {
    if (!selectedEdgeId) return;
    document.getElementById(`edge-${selectedPartId}-${selectedEdgeId}`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedEdgeId, selectedPartId]);

  function remember() {
    pastRef.current.push(structuredClone(placedRef.current));
    if (pastRef.current.length > 40) pastRef.current.shift();
    futureRef.current = [];
  }

  function undo() {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(structuredClone(placedRef.current));
    setPlaced(previous);
    setSelectedPartId((current) => previous.some((item) => item.part.id === current) ? current : previous[0]?.part.id ?? current);
  }

  function redo() {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(structuredClone(placedRef.current));
    setPlaced(next);
    setSelectedPartId((current) => next.some((item) => item.part.id === current) ? current : next[0]?.part.id ?? current);
  }

  function nextCode(prefix: string) {
    const numbers = placedRef.current
      .map((item) => item.part.partCode)
      .filter((code) => code.startsWith(`${prefix}-`))
      .map((code) => Number(code.slice(prefix.length + 1)) || 0);
    const sequence = Math.max(0, ...numbers) + 1;
    return `${prefix}-${String(sequence).padStart(2, '0')}`;
  }

  function placeNew(part: Part) {
    remember();
    const points = placedRef.current.flatMap((item) => item.part.outerContour.map((point) => ({ x: point.x + item.xMm, y: point.y + item.yMm })));
    const originX = points.length === 0 ? 0 : snapMm(boundsOf(points).maxX + 80);
    setPlaced([...placedRef.current, { xMm: originX, yMm: 0, part }]);
    setSelectedPartId(part.id);
    setSelectedEdgeId(part.edges[0]?.id ?? null);
    setEditorNotice(null);
  }

  function addRectangle() {
    const source = placedRef.current.find((item) => item.part.id === selectedPartId)?.part ?? placedRef.current[0]?.part;
    if (!source) return;
    placeNew(rectanglePart({
      id: crypto.randomUUID(),
      partCode: nextCode('PC'),
      name: 'Peça retangular',
      materialId: source.materialId,
      materialName: source.materialName,
      thicknessMm: source.thicknessMm,
    }, 1200, 600));
  }

  function addL() {
    const source = placedRef.current.find((item) => item.part.id === selectedPartId)?.part ?? placedRef.current[0]?.part;
    if (!source) return;
    placeNew(lPart({
      id: crypto.randomUUID(),
      partCode: nextCode('BL'),
      name: 'Bancada em L',
      materialId: source.materialId,
      materialName: source.materialName,
      thicknessMm: source.thicknessMm,
    }, 1800, 1400, 600));
  }

  function insertHole() {
    const current = placedRef.current;
    const item = current.find((entry) => entry.part.id === selectedPartId);
    if (!item) return;
    const part = addHole(item.part, 35);
    if (!part) {
      setEditorNotice('O furo de 35 mm não cabe nesta peça.');
      return;
    }
    remember();
    setPlaced(current.map((entry) => (entry.part.id === part.id ? { ...entry, part } : entry)));
    setEditorNotice(null);
  }

  function insertSink() {
    const current = placedRef.current;
    const item = current.find((entry) => entry.part.id === selectedPartId);
    if (!item) return;
    const part = addSink(item.part);
    if (!part) {
      setEditorNotice('A cuba não cabe com a margem de 15 mm.');
      return;
    }
    remember();
    setPlaced(current.map((entry) => (entry.part.id === part.id ? { ...entry, part } : entry)));
    setEditorNotice(null);
  }

  function cycleFinish(edgeId: string) {
    remember();
    const order: EdgeFinishType[] = ['raw', 'straight_polish', 'miter_45', 'bullnose', 'half_bullnose', 'bevel', 'italian_recess', 'american_recess'];
    setPlaced((current) => current.map((item) => {
      if (item.part.id !== selectedPartId) return item;
      return {
        ...item,
        part: {
          ...item.part,
          edges: item.part.edges.map((edge) => {
            if (edge.id !== edgeId) return edge;
            const finish = order[(order.indexOf(edge.finish) + 1) % order.length];
            return { ...edge, finish, skirtHeightMm: finish === 'miter_45' ? edge.skirtHeightMm ?? 40 : undefined };
          }),
        },
      };
    }));
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="flex h-screen w-screen bg-background text-foreground font-sans overflow-hidden transition-colors duration-200 antialiased">
      {/* SIDEBAR NAVEGAÇÃO PRINCIPAL */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col justify-between shrink-0 shadow-sm">
        <div>
          {/* Logo Oficial da Lumini com suporte a Dark/Light */}
          <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={isDark ? '/assets/logo-dark.png' : '/assets/logo-light.png'}
                alt="Lumini"
                className="h-8 max-w-[130px] object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-[10px] font-mono font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                V2
              </span>
            </div>
            <ThemeToggle />
          </div>

          {/* Contexto do Projeto Ativo */}
          <div className="p-3 mx-3 my-3 rounded-lg bg-card border border-border shadow-2xs">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Projeto Ativo</span>
              <span className="text-primary font-mono text-[10px] bg-primary/10 px-1.5 py-0.5 rounded font-bold">REV 03</span>
            </div>
            <p className="text-xs font-semibold text-foreground truncate">Residência Alphaville - Cozinha</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Cliente: Dr. Carlos Eduardo</p>
          </div>

          {/* Menus dos Módulos Principais */}
          <nav className="px-3 space-y-1">
            {hasAnyPermission('clients.read', 'organization.manage') && (
              <Link to="/clients" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent">
                <Buildings size={18} />
                <span>Clientes</span>
              </Link>
            )}
            {hasAnyPermission('projects.read', 'organization.manage') && (
              <Link to="/projects" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent">
                <Folder size={18} />
                <span>Projetos</span>
              </Link>
            )}
            {hasAnyPermission('pricing.read', 'organization.manage') && (
              <Link to="/settings/catalog" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent">
                <Palette size={18} />
                <span>Configurações técnicas</span>
              </Link>
            )}
            <button 
              onClick={() => setActiveTab('drawing')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'drawing' 
                  ? 'bg-foreground/5 text-foreground font-semibold shadow-[inset_2px_0_0_0_var(--primary)]' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Compass size={18} weight={activeTab === 'drawing' ? 'fill' : 'regular'} />
              <span>1. Desenho CAD 2D/3D</span>
            </button>

            <button 
              onClick={() => setActiveTab('pricing')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'pricing' 
                  ? 'bg-foreground/5 text-foreground font-semibold shadow-[inset_2px_0_0_0_var(--primary)]' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
              }`}
            >
              <CurrencyDollar size={18} weight={activeTab === 'pricing' ? 'fill' : 'regular'} />
              <span>2. Orçamento Dinâmico</span>
            </button>

            <button 
              onClick={() => setActiveTab('cutting')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'cutting' 
                  ? 'bg-foreground/5 text-foreground font-semibold shadow-[inset_2px_0_0_0_var(--primary)]' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Scissors size={18} weight={activeTab === 'cutting' ? 'fill' : 'regular'} />
              <span>3. Plano de Corte (Nesting)</span>
            </button>

            <button 
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'inventory' 
                  ? 'bg-foreground/5 text-foreground font-semibold shadow-[inset_2px_0_0_0_var(--primary)]' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Package size={18} weight={activeTab === 'inventory' ? 'fill' : 'regular'} />
              <span>4. Estoque & Sobras</span>
            </button>

            <button 
              onClick={() => setActiveTab('documents')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'documents' 
                  ? 'bg-foreground/5 text-foreground font-semibold shadow-[inset_2px_0_0_0_var(--primary)]' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
              }`}
            >
              <FileText size={18} weight={activeTab === 'documents' ? 'fill' : 'regular'} />
              <span>5. Pranchas & PDFs</span>
            </button>
          </nav>
        </div>

        {/* Rodapé da Sidebar — perfil autenticado (UI-002) */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="rounded-lg bg-card border border-border p-2.5 space-y-1">
            <p className="text-xs font-semibold text-foreground truncate">{user?.organizationName ?? '—'}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.displayName} · {user?.roleName}</p>
          </div>
          <div className="flex flex-col gap-1">
            {hasAnyPermission('members.read', 'organization.manage') && (
              <Link to="/settings/members" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent">
                <Users size={14} /> Membros
              </Link>
            )}
            {hasAnyPermission('roles.read', 'organization.manage') && (
              <Link to="/settings/roles" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent">
                <ShieldCheck size={14} /> Papéis
              </Link>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-destructive hover:bg-sidebar-accent cursor-pointer"
            >
              <SignOut size={14} /> Sair
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono tracking-wide">
            <span>v2.0-sprint1</span>
            <span>{isDark ? 'Dark' : 'Light'}</span>
          </div>
        </div>
      </aside>

      {/* ÁREA DE TRABALHO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* BARRA SUPERIOR CONTEXTUAL */}
        <header className="h-14 bg-card border-b border-border px-5 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Modelo Técnico Central (SSOT)
              </span>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {activeTab === 'drawing' && (space === '2d' ? 'Geometria da peça — arraste no desenho' : 'Montagem 3D — bancada, saia e frontão')}
                {activeTab === 'pricing' && 'Orçamento Rastreável por Metro Quadrado & Borda'}
                {activeTab === 'cutting' && 'Otimização de Corte com Kerf de Serra'}
                {activeTab === 'inventory' && 'Controle de Chapas Inteiras & Retalhos'}
                {activeTab === 'documents' && 'Documentação Técnica Executiva para Fábrica'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-md border border-border text-xs text-muted-foreground">
              <Check size={14} weight="bold" className="text-emerald-500" />
              <span>Autosave: Sincronizado</span>
            </div>
            <button className="flex items-center gap-1.5 border border-border bg-foreground/5 hover:border-primary/50 text-foreground px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer">
              <FloppyDisk size={16} weight="bold" className="text-primary" />
              <span>Salvar Revisão</span>
            </button>
          </div>
        </header>

        {/* CORPO DO MÓDULO ATIVO */}
        <div className="flex-1 flex overflow-hidden">
          {/* MÓDULO 1: DESENHO CAD */}
          {activeTab === 'drawing' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-zinc-700 bg-[#080808]">
                <div className="flex h-8 shrink-0 items-center justify-between border-b border-zinc-700 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                  <span>Prancha 01 · {selectedPart.partCode} {selectedPart.name}</span>
                  <span>unidade mm · grade 50 · snap 5</span>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-zinc-700 px-2 py-1">
                  <ToolButton onClick={addRectangle}>Retângulo</ToolButton>
                  <ToolButton onClick={addL}>Em L</ToolButton>
                  <ToolButton onClick={insertHole}>Furo Ø 35</ToolButton>
                  <ToolButton onClick={insertSink}>Cuba</ToolButton>
                  <ToolButton onClick={undo}>Desfazer</ToolButton>
                  <ToolButton onClick={redo}>Refazer</ToolButton>
                  <span className="mx-1 h-4 w-px bg-zinc-700" />
                  <ToolButton active={space === '2d'} onClick={() => setSpace('2d')}>2D</ToolButton>
                  <ToolButton active={space === '3d'} onClick={() => setSpace('3d')}>3D</ToolButton>
                  {editorNotice && <span className="px-2 text-[11px] text-primary">{editorNotice}</span>}
                </div>
                {space === '3d' ? (
                  <AssemblyView placed={placed} selectedPartId={selectedPartId} onSelectPart={selectPart} />
                ) : (
                <PieceEditor
                  placed={placed}
                  selectedPartId={selectedPartId}
                  selectedEdgeId={selectedEdgeId}
                  onChange={setPlaced}
                  onGestureStart={remember}
                  onSelectPart={selectPart}
                  onSelectEdge={(partId, edgeId) => {
                    setSelectedPartId(partId);
                    setSelectedEdgeId(edgeId);
                  }}
                  dimensionState={dimensionState}
                  onDimension={setDimension}
                />
                )}
              </div>
              {/* PAINEL LATERAL DIREITO — PROPRIEDADES DA PEÇA SELECIONADA */}
              <div className="flex w-80 flex-col overflow-y-auto border-l border-sidebar-border bg-sidebar p-4">
                <div className="flex items-center justify-between border-b border-sidebar-border pb-3">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Leitura da peça</span>
                  <span className="border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                    {selectedPart.partCode}
                  </span>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  A medida sai do desenho. Arraste o miolo para mover, a borda para esticar, a cuba e o furo para reposicionar. Arraste a cota para afastá-la; duplo clique ou o botão da borda a oculta.
                </p>

                <div className="mt-4 space-y-4 text-xs">
                  <div className="flex gap-1">
                    {placed.map((item) => (
                      <button
                        key={item.part.id}
                        type="button"
                        onClick={() => selectPart(item.part.id)}
                        className={`flex-1 border px-2 py-1.5 font-mono text-[10px] ${item.part.id === selectedPartId ? 'border-primary/50 bg-foreground/5 text-foreground' : 'border-border text-muted-foreground'}`}
                      >
                        {item.part.partCode}
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="font-semibold text-foreground">{selectedPart.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{selectedPart.materialName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border border-border bg-card p-2.5">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Largura</span>
                      <p className="mt-0.5 font-medium text-primary"><MaskedText mask="mm" unit="mm" value={selectedBox.width} /></p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Profundidade</span>
                      <p className="mt-0.5 font-medium text-primary"><MaskedText mask="mm" unit="mm" value={selectedBox.height} /></p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Espessura</span>
                      <p className="mt-0.5 font-medium text-foreground"><MaskedText mask="mm" unit="mm" value={selectedPart.thicknessMm} /></p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Área líquida</span>
                      <p className="mt-0.5 font-medium text-foreground"><MaskedText mask="decimal" unit="m²" value={(netAreaMm2(selectedPart) / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /></p>
                    </div>
                  </div>

                  <div>
                    <span className="mb-2 block text-[11px] font-semibold text-foreground">Bordas</span>
                    <div className="space-y-1.5">
                      {selectedPart.edges.map((edge: EdgeSegment) => {
                        const dimension = dimensionState[`${selectedPart.id}:${edge.id}`] ?? { offsetMm: 80, visible: true };
                        return (
                        <div
                          key={edge.id}
                          id={`edge-${selectedPart.id}-${edge.id}`}
                          className={`flex w-full items-center justify-between border bg-card p-2 text-left ${selectedEdgeId === edge.id ? 'border-primary/60 shadow-[inset_2px_0_0_0_var(--primary)]' : 'border-border'}`}
                        >
                          <button type="button" onClick={() => setSelectedEdgeId(edge.id)} className="min-w-0 flex-1 text-left">
                            <span className="font-mono text-[10px] font-bold text-primary">{edge.id.toUpperCase()}</span>
                            <span className="mt-0.5 block text-[11px] text-foreground">{finishLabel[edge.finish]}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEdgeId(edge.id);
                              cycleFinish(edge.id);
                            }}
                            className="shrink-0 border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          >
                            trocar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDimension(selectedPart.id, edge.id, { offsetMm: dimension.offsetMm, visible: !dimension.visible })}
                            className="ml-1 shrink-0 border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          >
                            {dimension.visible ? 'ocultar' : 'cota'}
                          </button>
                          <MaskedText mask="mm" unit="mm" value={edge.lengthMm} className="ml-2 font-mono font-semibold text-foreground" />
                        </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedPart.innerContours.map((opening) => (
                    <div key={opening.id} className="border border-border bg-card p-2">
                      <p className="text-[11px] text-foreground">{opening.label ?? 'Recorte'}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        <MaskedText mask="mm" unit="mm" value={opening.widthMm} /> × <MaskedText mask="mm" unit="mm" value={opening.heightMm} />
                      </p>
                    </div>
                  ))}

                  {selectedPart.holes.map((hole: Hole) => (
                    <div key={hole.id} className="border border-border bg-card p-2">
                      <p className="text-[11px] text-foreground">{hole.label ?? 'Furo'}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        Ø <MaskedText mask="mm" unit="mm" value={hole.diameterMm} /> · X <MaskedText mask="mm" unit="mm" value={hole.center.x} /> · Y <MaskedText mask="mm" unit="mm" value={hole.center.y} />
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 2: ORÇAMENTO DINÂMICO */}
          {activeTab === 'pricing' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between bg-card p-5 rounded-xl border border-border shadow-xs">
                  <div>
                    <span className="text-xs text-primary font-medium">Orçamento Automatizado</span>
                    <h3 className="text-lg font-bold text-foreground">Composição de Preços — Revisão 03</h3>
                    <p className="text-xs text-muted-foreground mt-1">Vinculado estritamente à geometria das 3 peças cadastradas</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Valor Total Líquido</span>
                    <p className="text-2xl font-mono font-extrabold text-emerald-500">
                      <MaskedText mask="currency" value={4850} />
                    </p>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-3">Código</th>
                        <th className="p-3">Item / Peça</th>
                        <th className="p-3">Matéria-Prima (m²)</th>
                        <th className="p-3">Acabamentos Lineares (m)</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-3 font-mono text-primary font-semibold">BC-01</td>
                        <td className="p-3 font-medium text-foreground">Bancada Gourmet (2600 x 650 mm)</td>
                        <td className="p-3">1,69 m² • Quartzito Calacatta Prime</td>
                        <td className="p-3">3,25 m de Meia-Esquadria 45° + 1 Furo</td>
                        <td className="p-3 text-right font-mono font-semibold text-foreground">R$ 3.420,00</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-primary font-semibold">FR-01</td>
                        <td className="p-3 font-medium text-foreground">Frontão Traseiro (2600 x 150 mm)</td>
                        <td className="p-3">0,39 m² • Quartzito Calacatta Prime</td>
                        <td className="p-3">2,90 m de Polimento Reto</td>
                        <td className="p-3 text-right font-mono font-semibold text-foreground">R$ 880,00</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-primary font-semibold">SA-01</td>
                        <td className="p-3 font-medium text-foreground">Saia Frontal 45° (2600 x 40 mm)</td>
                        <td className="p-3">0,10 m² • Quartzito Calacatta Prime</td>
                        <td className="p-3">2,60 m de Encaixe 45° + Colagem</td>
                        <td className="p-3 text-right font-mono font-semibold text-foreground">R$ 550,00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 3: CORTE & NESTING */}
          {activeTab === 'cutting' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-card p-5 rounded-xl border border-border flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-xs text-primary font-medium">Algoritmo de Nesting Otimizado</span>
                    <h3 className="text-lg font-bold text-foreground">Simulação do Plano de Corte na Chapa</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Kerf de Serra: 4.0 mm | Refilo Perimetral: 15.0 mm | Veio Alinhado: Sim
                    </p>
                  </div>
                  <div className="text-right bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-lg">
                    <span className="text-[11px] text-emerald-500 block font-semibold">Aproveitamento</span>
                    <span className="text-2xl font-mono font-extrabold text-emerald-500">84,6 %</span>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border shadow-xs">
                  <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
                    <span>Chapa de Origem: CHP-2026-089 (Quartzito Calacatta 3000 x 1800 mm)</span>
                    <span className="text-muted-foreground font-mono font-semibold">1 Retalho Gerado: <span className="text-primary">3000 x 950 mm</span></span>
                  </div>

                  {/* Desenho da Chapa com Peças Aninhadas */}
                  <div className="aspect-[30/18] bg-muted border-2 border-border rounded-lg relative overflow-hidden flex items-start justify-start p-2">
                    <div className="bg-foreground/5 border border-border border-l-2 border-l-primary text-foreground text-xs font-bold p-3 rounded absolute top-3 left-3 w-[80%] h-[35%] flex items-center justify-center">
                      BC-01 (Bancada Gourmet 2600 x 650 mm)
                    </div>
                    <div className="bg-foreground/5 border border-border text-muted-foreground text-[11px] font-bold p-2 rounded absolute top-[40%] left-3 w-[80%] h-[9%] flex items-center justify-center">
                      FR-01 (Frontão 2600 x 150 mm)
                    </div>
                    <div className="bg-foreground/5 border border-border text-muted-foreground text-[9px] font-bold rounded absolute top-[51%] left-3 w-[80%] h-[3%] flex items-center justify-center">
                      SA-01 (Saia 45°)
                    </div>
                    <div className="absolute bottom-3 right-3 text-right bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 p-2 rounded text-[11px]">
                      Área Livre / Retalho Nobre de Sobra (2,85 m²)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 4: ESTOQUE */}
          {activeTab === 'inventory' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">Chapas e Sobras Disponíveis no Pátio</h3>
                  <button className="border border-border bg-foreground/5 hover:border-primary/50 text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer">
                    + Cadastrar Chapa / Retalho
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-xl border border-border space-y-2 shadow-2xs">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono text-primary font-bold">CHP-2026-089</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-semibold">Disponível</span>
                    </div>
                    <p className="font-semibold text-foreground">Quartzito Calacatta Prime 20mm</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Dimensões: <MaskedText mask="mm" unit="mm" value={3000} /> x <MaskedText mask="mm" unit="mm" value={1800} />
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Placa veículo: <MaskedText mask="placa" value="ABC1D23" className="font-mono" /> · Cavalete 03-B
                    </p>
                  </div>
                  <div className="bg-card p-4 rounded-xl border border-border space-y-2 shadow-2xs">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono text-amber-500 font-bold">RET-2026-012</span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-semibold">Retalho / Sobra</span>
                    </div>
                    <p className="font-semibold text-foreground">Granito Preto São Gabriel 20mm</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Dimensões: <MaskedText mask="mm" unit="mm" value={1800} /> x <MaskedText mask="mm" unit="mm" value={750} />
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Contato: <MaskedText mask="phone" value="11999887766" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 5: PRANCHAS & PDFS */}
          {activeTab === 'documents' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-card p-5 rounded-xl border border-border flex items-center justify-between shadow-xs">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Exportação de Pranchas Técnicas de Fabricação</h3>
                    <p className="text-xs text-muted-foreground mt-1">Gere PDFs de alta fidelidade para o serrador e acabador</p>
                  </div>
                  <button className="border border-border bg-foreground/5 hover:border-primary/50 text-foreground px-4 py-2 rounded-lg text-xs font-bold cursor-pointer">
                    Gerar PDF Vetorial (A4/A3)
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-card p-4 rounded-xl border border-border space-y-2 shadow-2xs">
                    <span className="text-xs font-semibold text-foreground">Prancha 1: Corte & Serra</span>
                    <p className="text-[11px] text-muted-foreground">Mapa de avanço do disco e identificador das peças para o operador de serra ponte.</p>
                  </div>
                  <div className="bg-card p-4 rounded-xl border border-border space-y-2 shadow-2xs">
                    <span className="text-xs font-semibold text-foreground">Prancha 2: Acabamentos & Furos</span>
                    <p className="text-[11px] text-muted-foreground">Cotas dos furos de torneira, recortes de cuba e marcação de meia-esquadria 45°.</p>
                  </div>
                  <div className="bg-card p-4 rounded-xl border border-border space-y-2 shadow-2xs">
                    <span className="text-xs font-semibold text-foreground">Prancha 3: Proposta do Cliente</span>
                    <p className="text-[11px] text-muted-foreground">Apresentação visual com materiais, espessuras e valores detalhados para aprovação.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ToolButton({ children, onClick, active = false }: { children: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-2 py-1 text-[11px] ${active ? 'border-primary/60 bg-primary/10 text-primary' : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-primary/50'}`}
    >
      {children}
    </button>
  );
}
