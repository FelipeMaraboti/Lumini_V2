import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Compass, 
  Scissors, 
  CurrencyDollar, 
  FileText, 
  Package, 
  FloppyDisk, 
  Check,
  Ruler,
  SignOut,
  Users,
  ShieldCheck,
  Buildings,
  Folder
} from '@phosphor-icons/react';
import type { Part, EdgeSegment, Hole } from '@lumini/geometry-core';
import { useAuth } from '@/features/auth/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MaskedText } from '@/components/ui/MaskedText';

export default function App() {
  const { user, logout, hasAnyPermission } = useAuth();
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('lumini_theme');
    return stored ? stored === 'dark' : true;
  });
  const [activeTab, setActiveTab] = useState<'drawing' | 'pricing' | 'cutting' | 'inventory' | 'documents'>('drawing');
  const [selectedPartId, setSelectedPartId] = useState<string>('part-1');

  // Sincroniza com ThemeToggle / localStorage
  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Exemplo de peças reais modeladas no formato canônico da marmoraria
  const demoParts: Part[] = [
    {
      id: 'part-1',
      partCode: 'BC-01',
      name: 'Bancada Cozinha Gourmet',
      materialId: 'mat-quartz-calacatta',
      materialName: 'Quartzito Calacatta Prime',
      thicknessMm: 20,
      outerContour: [
        { x: 0, y: 0 },
        { x: 2600, y: 0 },
        { x: 2600, y: 650 },
        { x: 0, y: 650 },
      ],
      edges: [
        { id: 'e1', startIndex: 0, endIndex: 1, lengthMm: 2600, finish: 'raw', notes: 'Parede de fundo' },
        { id: 'e2', startIndex: 1, endIndex: 2, lengthMm: 650, finish: 'miter_45', skirtHeightMm: 40, notes: 'Lateral direita com saia 40mm' },
        { id: 'e3', startIndex: 2, endIndex: 3, lengthMm: 2600, finish: 'miter_45', skirtHeightMm: 40, notes: 'Frente com saia 40mm 45°' },
        { id: 'e4', startIndex: 3, endIndex: 0, lengthMm: 650, finish: 'straight_polish', notes: 'Lateral livre polida' },
      ],
      holes: [
        { id: 'h1', kind: 'faucet', center: { x: 1300, y: 120 }, diameterMm: 35, label: 'Furo Monocomando 35mm' }
      ],
      innerContours: [
        { 
          id: 'c1', 
          kind: 'undermount_sink', 
          widthMm: 600, 
          heightMm: 450, 
          clearanceMm: 15, 
          points: [
            { x: 1000, y: 200 },
            { x: 1600, y: 200 },
            { x: 1600, y: 550 },
            { x: 1000, y: 550 }
          ],
          label: 'Cuba Inox Tramontina Morgana' 
        }
      ],
      colorHex: '#38bdf8'
    },
    {
      id: 'part-2',
      partCode: 'FR-01',
      name: 'Frontão Traseiro de Parede',
      materialId: 'mat-quartz-calacatta',
      materialName: 'Quartzito Calacatta Prime',
      thicknessMm: 20,
      outerContour: [
        { x: 0, y: 0 },
        { x: 2600, y: 0 },
        { x: 2600, y: 150 },
        { x: 0, y: 150 },
      ],
      edges: [
        { id: 'fe1', startIndex: 0, endIndex: 1, lengthMm: 2600, finish: 'raw' },
        { id: 'fe2', startIndex: 1, endIndex: 2, lengthMm: 150, finish: 'straight_polish' },
        { id: 'fe3', startIndex: 2, endIndex: 3, lengthMm: 2600, finish: 'straight_polish', notes: 'Borda superior visível' },
        { id: 'fe4', startIndex: 3, endIndex: 0, lengthMm: 150, finish: 'straight_polish' },
      ],
      holes: [],
      innerContours: [],
      colorHex: '#a855f7'
    },
    {
      id: 'part-3',
      partCode: 'SA-01',
      name: 'Saia Frontal Meia-Esquadria 45°',
      materialId: 'mat-quartz-calacatta',
      materialName: 'Quartzito Calacatta Prime',
      thicknessMm: 20,
      outerContour: [
        { x: 0, y: 0 },
        { x: 2600, y: 0 },
        { x: 2600, y: 40 },
        { x: 0, y: 40 },
      ],
      edges: [
        { id: 'se1', startIndex: 0, endIndex: 1, lengthMm: 2600, finish: 'miter_45', notes: 'Encaixe 45° com a bancada' },
        { id: 'se2', startIndex: 1, endIndex: 2, lengthMm: 40, finish: 'miter_45' },
        { id: 'se3', startIndex: 2, endIndex: 3, lengthMm: 2600, finish: 'straight_polish' },
        { id: 'se4', startIndex: 3, endIndex: 0, lengthMm: 40, finish: 'miter_45' },
      ],
      holes: [],
      innerContours: [],
      colorHex: '#f59e0b'
    }
  ];

  const selectedPart = demoParts.find(p => p.id === selectedPartId) || demoParts[0];

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
            <button 
              onClick={() => setActiveTab('drawing')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'drawing' 
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold' 
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
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold' 
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
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold' 
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
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold' 
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
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold' 
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
                {activeTab === 'drawing' && 'Editor CAD Paramétrico (Medidas em mm)'}
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
            <button className="flex items-center gap-1.5 bg-primary hover:opacity-90 text-primary-foreground px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer">
              <FloppyDisk size={16} weight="bold" />
              <span>Salvar Revisão</span>
            </button>
          </div>
        </header>

        {/* CORPO DO MÓDULO ATIVO */}
        <div className="flex-1 flex overflow-hidden">
          {/* MÓDULO 1: DESENHO CAD */}
          {activeTab === 'drawing' && (
            <div className="flex-1 flex overflow-hidden">
              {/* CANVAS 2D INTERATIVO */}
              <div className="flex-1 relative cad-grid-pattern bg-background overflow-hidden flex flex-col">
                {/* Régua / Controles Rápidos do Canvas */}
                <div className="h-9 bg-card/80 backdrop-blur border-b border-border px-4 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px] text-primary flex items-center gap-1">
                      <Ruler size={14} weight="bold" />
                      Grid: 50mm | Snap: Ativo
                    </span>
                    <span className="text-[11px]">Unidade Canônica: Milímetros (mm)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] bg-muted px-2 py-0.5 rounded text-foreground font-mono">Zoom: 100%</span>
                  </div>
                </div>

                {/* VISUALIZAÇÃO GRÁFICA VETORIAL SVG (PEÇAS EM ESCALA) */}
                <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                  <div className="relative bg-card border-2 border-dashed border-border rounded-xl p-8 shadow-md">
                    <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Layout da Bancada & Frontão (Preview em Escala)</span>
                      <span className="font-mono text-primary font-medium">Dimensões Reais de Fábrica</span>
                    </div>

                    <svg width="680" height="340" viewBox="0 0 2800 1200" className="bg-background rounded-lg border border-border">
                      {/* Grid de fundo do SVG */}
                      <defs>
                        <pattern id="cadGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="2800" height="1200" fill="url(#cadGrid)" />

                      {/* FRONTÃO FR-01 */}
                      <g className="cursor-pointer" onClick={() => setSelectedPartId('part-2')}>
                        <rect 
                          x="100" 
                          y="80" 
                          width="2600" 
                          height="150" 
                          fill={selectedPartId === 'part-2' ? '#a855f7' : '#71717a'} 
                          fillOpacity={selectedPartId === 'part-2' ? 0.35 : 0.15}
                          stroke={selectedPartId === 'part-2' ? '#a855f7' : '#a1a1aa'} 
                          strokeWidth="6" 
                          rx="4"
                        />
                        <text x="1400" y="170" fill={isDark ? '#fbfaf9' : '#0c0a09'} fontSize="60" textAnchor="middle" fontWeight="bold">
                          FR-01: Frontão Traseiro 2600 x 150 mm
                        </text>
                      </g>

                      {/* BANCADA PRINCIPAL BC-01 */}
                      <g className="cursor-pointer" onClick={() => setSelectedPartId('part-1')}>
                        <rect 
                          x="100" 
                          y="320" 
                          width="2600" 
                          height="650" 
                          fill={selectedPartId === 'part-1' ? '#ca3500' : '#71717a'} 
                          fillOpacity={selectedPartId === 'part-1' ? 0.25 : 0.1}
                          stroke={selectedPartId === 'part-1' ? '#ca3500' : '#a1a1aa'} 
                          strokeWidth="8" 
                          rx="6"
                        />

                        {/* Recorte da Cuba com rebaixo */}
                        <rect 
                          x="1100" 
                          y="420" 
                          width="600" 
                          height="450" 
                          fill={isDark ? '#1d1816' : '#f3f1f1'} 
                          stroke="#ff6900" 
                          strokeWidth="6" 
                          strokeDasharray="16 8"
                          rx="8"
                        />
                        <text x="1400" y="660" fill="#ff6900" fontSize="48" textAnchor="middle" fontWeight="bold">
                          Recorte Cuba Tramontina (600 x 450 mm)
                        </text>

                        {/* Furo de Torneira Ø35mm */}
                        <circle cx="1400" cy="370" r="28" fill="#e7000b" stroke="#fff" strokeWidth="4" />
                        <text x="1400" y="320" fill="#e7000b" fontSize="42" textAnchor="middle" fontWeight="bold">
                          Ø 35mm
                        </text>

                        <text x="400" y="420" fill="#ca3500" fontSize="56" fontWeight="bold">
                          BC-01 (Bancada Gourmet)
                        </text>
                        <text x="400" y="490" fill={isDark ? '#aba09c' : '#7c6d67'} fontSize="44">
                          2600 x 650 mm • Esp. 20mm
                        </text>
                      </g>

                      {/* SAIA FRONTAL SA-01 (45°) */}
                      <g className="cursor-pointer" onClick={() => setSelectedPartId('part-3')}>
                        <rect 
                          x="100" 
                          y="1050" 
                          width="2600" 
                          height="40" 
                          fill={selectedPartId === 'part-3' ? '#f54900' : '#71717a'} 
                          fillOpacity={selectedPartId === 'part-3' ? 0.4 : 0.2}
                          stroke={selectedPartId === 'part-3' ? '#f54900' : '#a1a1aa'} 
                          strokeWidth="4" 
                        />
                        <text x="1400" y="1080" fill="#f54900" fontSize="42" textAnchor="middle" fontWeight="bold">
                          SA-01: Saia Frontal 45° (2600 x 40 mm)
                        </text>
                      </g>

                      {/* COTA DE COMPRIMENTO TOTAL */}
                      <line x1="100" y1="50" x2="2700" y2="50" stroke="#ca3500" strokeWidth="4" />
                      <circle cx="100" cy="50" r="8" fill="#ca3500" />
                      <circle cx="2700" cy="50" r="8" fill="#ca3500" />
                      <text x="1400" y="40" fill="#ca3500" fontSize="48" textAnchor="middle" fontWeight="bold">
                        2.600 mm (2,60 m)
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* PAINEL LATERAL DIREITO — PROPRIEDADES DA PEÇA SELECIONADA */}
              <div className="w-80 bg-sidebar border-l border-sidebar-border flex flex-col p-4 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-sidebar-border">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Propriedades da Peça</span>
                  <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {selectedPart.partCode}
                  </span>
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Identificação / Nome</label>
                    <p className="font-semibold text-foreground mt-0.5">{selectedPart.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-card p-2.5 rounded-lg border border-border">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Material</span>
                      <p className="font-medium text-foreground mt-0.5">{selectedPart.materialName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Espessura</span>
                      <p className="font-medium text-primary mt-0.5">
                        <MaskedText mask="mm" value={selectedPart.thicknessMm} /> mm
                      </p>
                    </div>
                  </div>

                  {/* BORDAS & ACABAMENTOS */}
                  <div>
                    <span className="text-[11px] font-semibold text-foreground block mb-2">
                      Acabamentos de Borda ({selectedPart.edges.length})
                    </span>
                    <div className="space-y-1.5">
                      {selectedPart.edges.map((edge: EdgeSegment) => (
                        <div key={edge.id} className="p-2 rounded bg-card border border-border flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="font-mono text-primary text-[10px] font-bold">{edge.id.toUpperCase()}</span>
                            <p className="text-[11px] text-foreground capitalize">
                              {edge.finish === 'miter_45' ? 'Meia-Esquadria 45°' : edge.finish === 'straight_polish' ? 'Polimento Reto' : 'Corte Bruto'}
                            </p>
                            {edge.notes && <p className="text-[10px] text-muted-foreground">{edge.notes}</p>}
                          </div>
                          <span className="font-mono text-foreground font-semibold">{edge.lengthMm} mm</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FUROS */}
                  {selectedPart.holes.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-foreground block mb-2">Furações Paramétricas</span>
                      {selectedPart.holes.map((hole: Hole) => (
                        <div key={hole.id} className="p-2 rounded bg-destructive/10 border border-destructive/20 flex items-center justify-between">
                          <div>
                            <p className="text-[11px] text-destructive font-medium">{hole.label}</p>
                            <span className="text-[10px] text-muted-foreground">Centro: X={hole.center.x} Y={hole.center.y}</span>
                          </div>
                          <span className="font-mono text-destructive font-bold">Ø {hole.diameterMm} mm</span>
                        </div>
                      ))}
                    </div>
                  )}
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
                    <span className="text-primary font-mono font-semibold">1 Retalho Gerado: 3000 x 950 mm</span>
                  </div>

                  {/* Desenho da Chapa com Peças Aninhadas */}
                  <div className="aspect-[30/18] bg-muted border-2 border-border rounded-lg relative overflow-hidden flex items-start justify-start p-2">
                    <div className="bg-primary/20 border border-primary text-primary text-xs font-bold p-3 rounded absolute top-3 left-3 w-[80%] h-[35%] flex items-center justify-center">
                      BC-01 (Bancada Gourmet 2600 x 650 mm)
                    </div>
                    <div className="bg-purple-500/20 border border-purple-500 text-purple-600 dark:text-purple-300 text-[11px] font-bold p-2 rounded absolute top-[40%] left-3 w-[80%] h-[9%] flex items-center justify-center">
                      FR-01 (Frontão 2600 x 150 mm)
                    </div>
                    <div className="bg-amber-500/20 border border-amber-500 text-amber-600 dark:text-amber-300 text-[9px] font-bold rounded absolute top-[51%] left-3 w-[80%] h-[3%] flex items-center justify-center">
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
                  <button className="bg-primary hover:opacity-90 text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-xs">
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
                      Dimensões: <MaskedText mask="mm" value={3000} /> x <MaskedText mask="mm" value={1800} /> mm
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
                      Dimensões: <MaskedText mask="mm" value={1800} /> x <MaskedText mask="mm" value={750} /> mm
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
                  <button className="bg-primary hover:opacity-90 text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold shadow-xs cursor-pointer">
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
