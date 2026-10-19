import { useState } from 'react';
import { 
  Compass, 
  Scissors, 
  DollarSign, 
  FileText, 
  Boxes, 
  Save,
  Check
} from 'lucide-react';
import type { Part, EdgeSegment, Hole } from '@lumini/geometry-core';

export default function App() {
  const [activeTab, setActiveTab] = useState<'drawing' | 'pricing' | 'cutting' | 'inventory' | 'documents'>('drawing');
  const [selectedPartId, setSelectedPartId] = useState<string>('part-1');

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
    <div className="flex h-screen w-screen bg-[#090d16] text-slate-100 font-sans overflow-hidden">
      {/* SIDEBAR NAVEGAÇÃO PRINCIPAL */}
      <aside className="w-64 bg-[#0d131f] border-r border-[#1c2638] flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & Marca */}
          <div className="p-4 border-b border-[#1c2638] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 font-bold text-slate-950">
                L2
              </div>
              <div>
                <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
                  LUMINI <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">V2</span>
                </h1>
                <p className="text-[11px] text-slate-400">Plataforma para Marmorarias</p>
              </div>
            </div>
          </div>

          {/* Contexto do Projeto Ativo */}
          <div className="p-3 mx-2 my-3 rounded-lg bg-[#141d2e] border border-[#222f46]">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>PROJETO ATIVO</span>
              <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-1 rounded">REV 03</span>
            </div>
            <p className="text-xs font-semibold text-white truncate">Residência Alphaville - Cozinha</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Cliente: Dr. Carlos Eduardo</p>
          </div>

          {/* Menus dos Módulos */}
          <nav className="px-2 space-y-1">
            <button 
              onClick={() => setActiveTab('drawing')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'drawing' 
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141b2a]'
              }`}
            >
              <Compass className="h-4 w-4" />
              <span>1. Desenho CAD 2D/3D</span>
            </button>

            <button 
              onClick={() => setActiveTab('pricing')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'pricing' 
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141b2a]'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>2. Orçamento Dinâmico</span>
            </button>

            <button 
              onClick={() => setActiveTab('cutting')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'cutting' 
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141b2a]'
              }`}
            >
              <Scissors className="h-4 w-4" />
              <span>3. Plano de Corte (Nesting)</span>
            </button>

            <button 
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'inventory' 
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141b2a]'
              }`}
            >
              <Boxes className="h-4 w-4" />
              <span>4. Estoque & Sobras</span>
            </button>

            <button 
              onClick={() => setActiveTab('documents')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'documents' 
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141b2a]'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>5. Pranchas & PDFs</span>
            </button>
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-3 border-t border-[#1c2638] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Backend API .NET 8
            </span>
            <span className="text-[10px] text-slate-500">Clean Arch</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>Tenant: Marmoraria GranVix</span>
            <span>v2.0-sprint0</span>
          </div>
        </div>
      </aside>

      {/* ÁREA DE TRABALHO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* BARRA SUPERIOR CONTEXTUAL */}
        <header className="h-14 bg-[#0d131f] border-b border-[#1c2638] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Modelo Técnico Central (SSOT)
              </span>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                {activeTab === 'drawing' && 'Editor CAD Paramétrico (Medidas em mm)'}
                {activeTab === 'pricing' && 'Orçamento Rastreável por Metro Quadrado & Borda'}
                {activeTab === 'cutting' && 'Otimização de Corte com Kerf de Serra'}
                {activeTab === 'inventory' && 'Controle de Chapas Inteiras & Retalhos'}
                {activeTab === 'documents' && 'Documentação Técnica Executiva para Fábrica'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#141d2e] px-2.5 py-1 rounded-md border border-[#222f46] text-xs text-slate-300">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Autosave: Sincronizado</span>
            </div>
            <button className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-md text-xs font-semibold shadow-md shadow-amber-500/20 transition-all cursor-pointer">
              <Save className="h-3.5 w-3.5" />
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
              <div className="flex-1 relative cad-grid-pattern bg-[#080c14] overflow-hidden flex flex-col">
                {/* Régua / Controles Rápidos do Canvas */}
                <div className="h-9 bg-[#0d131f]/80 backdrop-blur border-b border-[#1c2638] px-4 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px] text-cyan-400">Grid: 50mm | Snap: Ativo</span>
                    <span className="text-[11px]">Unidade Canônica: Milímetros (mm)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">Zoom: 100%</span>
                  </div>
                </div>

                {/* VISUALIZAÇÃO GRÁFICA VETORIAL SVG (PEÇAS EM ESCALA) */}
                <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                  <div className="relative bg-[#0c121e] border-2 border-dashed border-[#222f46] rounded-xl p-8 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">Layout da Bancada & Frontão (Preview em Escala)</span>
                      <span className="font-mono text-cyan-400">Dimensões Reais de Fábrica</span>
                    </div>

                    <svg width="680" height="340" viewBox="0 0 2800 1200" className="bg-[#090d16] rounded-lg border border-[#1e293b]">
                      {/* Grid de fundo do SVG */}
                      <defs>
                        <pattern id="cadGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
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
                          fill={selectedPartId === 'part-2' ? '#a855f7' : '#334155'} 
                          fillOpacity={selectedPartId === 'part-2' ? 0.35 : 0.2}
                          stroke={selectedPartId === 'part-2' ? '#c084fc' : '#64748b'} 
                          strokeWidth="6" 
                          rx="4"
                        />
                        <text x="1400" y="170" fill="#f8fafc" fontSize="60" textAnchor="middle" fontWeight="bold">
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
                          fill={selectedPartId === 'part-1' ? '#0284c7' : '#1e293b'} 
                          fillOpacity={selectedPartId === 'part-1' ? 0.3 : 0.15}
                          stroke={selectedPartId === 'part-1' ? '#38bdf8' : '#475569'} 
                          strokeWidth="8" 
                          rx="6"
                        />

                        {/* Recorte da Cuba com rebaixo */}
                        <rect 
                          x="1100" 
                          y="420" 
                          width="600" 
                          height="450" 
                          fill="#0f172a" 
                          stroke="#f59e0b" 
                          strokeWidth="6" 
                          strokeDasharray="16 8"
                          rx="8"
                        />
                        <text x="1400" y="660" fill="#f59e0b" fontSize="48" textAnchor="middle" fontWeight="bold">
                          Recorte Cuba Tramontina (600 x 450 mm)
                        </text>

                        {/* Furo de Torneira Ø35mm */}
                        <circle cx="1400" cy="370" r="28" fill="#f43f5e" stroke="#fff" strokeWidth="4" />
                        <text x="1400" y="320" fill="#f43f5e" fontSize="42" textAnchor="middle" fontWeight="bold">
                          Ø 35mm
                        </text>

                        <text x="400" y="420" fill="#38bdf8" fontSize="56" fontWeight="bold">
                          BC-01 (Bancada Gourmet)
                        </text>
                        <text x="400" y="490" fill="#94a3b8" fontSize="44">
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
                          fill={selectedPartId === 'part-3' ? '#f59e0b' : '#334155'} 
                          fillOpacity={selectedPartId === 'part-3' ? 0.4 : 0.2}
                          stroke={selectedPartId === 'part-3' ? '#fbbf24' : '#64748b'} 
                          strokeWidth="4" 
                        />
                        <text x="1400" y="1080" fill="#fbbf24" fontSize="42" textAnchor="middle" fontWeight="bold">
                          SA-01: Saia Frontal 45° (2600 x 40 mm)
                        </text>
                      </g>

                      {/* COTA DE COMPRIMENTO TOTAL */}
                      <line x1="100" y1="50" x2="2700" y2="50" stroke="#06b6d4" strokeWidth="4" />
                      <circle cx="100" cy="50" r="8" fill="#06b6d4" />
                      <circle cx="2700" cy="50" r="8" fill="#06b6d4" />
                      <text x="1400" y="40" fill="#06b6d4" fontSize="48" textAnchor="middle" fontWeight="bold">
                        2.600 mm (2,60 m)
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* PAINEL LATERAL DIREITO — PROPRIEDADES DA PEÇA SELECIONADA */}
              <div className="w-80 bg-[#0d131f] border-l border-[#1c2638] flex flex-col p-4 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-[#1c2638]">
                  <span className="text-xs font-semibold uppercase text-slate-400">Propriedades da Peça</span>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {selectedPart.partCode}
                  </span>
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400">Identificação / Nome</label>
                    <p className="font-semibold text-white mt-0.5">{selectedPart.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[#141d2e] p-2.5 rounded-lg border border-[#222f46]">
                    <div>
                      <span className="text-[10px] text-slate-400">Material</span>
                      <p className="font-medium text-slate-200 mt-0.5">{selectedPart.materialName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Espessura</span>
                      <p className="font-medium text-amber-400 mt-0.5">{selectedPart.thicknessMm} mm</p>
                    </div>
                  </div>

                  {/* BORDAS & ACABAMENTOS */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-300 block mb-2">
                      Acabamentos de Borda ({selectedPart.edges.length})
                    </span>
                    <div className="space-y-1.5">
                      {selectedPart.edges.map((edge: EdgeSegment) => (
                        <div key={edge.id} className="p-2 rounded bg-[#131b29] border border-[#222f46] flex items-center justify-between">
                          <div>
                            <span className="font-mono text-cyan-400 text-[10px]">{edge.id.toUpperCase()}</span>
                            <p className="text-[11px] text-slate-300 capitalize">
                              {edge.finish === 'miter_45' ? 'Meia-Esquadria 45°' : edge.finish === 'straight_polish' ? 'Polimento Reto' : 'Corte Bruto'}
                            </p>
                            {edge.notes && <p className="text-[10px] text-slate-500">{edge.notes}</p>}
                          </div>
                          <span className="font-mono text-slate-200 font-semibold">{edge.lengthMm} mm</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FUROS */}
                  {selectedPart.holes.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-300 block mb-2">Furações Paramétricas</span>
                      {selectedPart.holes.map((hole: Hole) => (
                        <div key={hole.id} className="p-2 rounded bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                          <div>
                            <p className="text-[11px] text-rose-300 font-medium">{hole.label}</p>
                            <span className="text-[10px] text-slate-400">Centro: X={hole.center.x} Y={hole.center.y}</span>
                          </div>
                          <span className="font-mono text-rose-400 font-bold">Ø {hole.diameterMm} mm</span>
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
                <div className="flex items-center justify-between bg-[#121824] p-5 rounded-xl border border-[#222f46]">
                  <div>
                    <span className="text-xs text-amber-400 font-medium">Orçamento Automatizado</span>
                    <h3 className="text-lg font-bold text-white">Composição de Preços — Revisão 03</h3>
                    <p className="text-xs text-slate-400 mt-1">Vinculado estritamente à geometria das 3 peças cadastradas</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Valor Total Líquido</span>
                    <p className="text-2xl font-mono font-extrabold text-emerald-400">R$ 4.850,00</p>
                  </div>
                </div>

                <div className="bg-[#121824] rounded-xl border border-[#222f46] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#172030] text-slate-400 border-b border-[#222f46]">
                      <tr>
                        <th className="p-3">Código</th>
                        <th className="p-3">Item / Peça</th>
                        <th className="p-3">Matéria-Prima ($m^2$)</th>
                        <th className="p-3">Acabamentos Lineares ($m$)</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2a3f]">
                      <tr>
                        <td className="p-3 font-mono text-cyan-400">BC-01</td>
                        <td className="p-3 font-medium text-white">Bancada Gourmet (2600 x 650 mm)</td>
                        <td className="p-3">1,69 m² • Quartzito Calacatta Prime</td>
                        <td className="p-3">3,25 m de Meia-Esquadria 45° + 1 Furo</td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-200">R$ 3.420,00</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-cyan-400">FR-01</td>
                        <td className="p-3 font-medium text-white">Frontão Traseiro (2600 x 150 mm)</td>
                        <td className="p-3">0,39 m² • Quartzito Calacatta Prime</td>
                        <td className="p-3">2,90 m de Polimento Reto</td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-200">R$ 880,00</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-cyan-400">SA-01</td>
                        <td className="p-3 font-medium text-white">Saia Frontal 45° (2600 x 40 mm)</td>
                        <td className="p-3">0,10 m² • Quartzito Calacatta Prime</td>
                        <td className="p-3">2,60 m de Encaixe 45° + Colagem</td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-200">R$ 550,00</td>
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
                <div className="bg-[#121824] p-5 rounded-xl border border-[#222f46] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-cyan-400 font-medium">Algoritmo de Nesting Otimizado</span>
                    <h3 className="text-lg font-bold text-white">Simulação do Plano de Corte na Chapa</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Kerf de Serra: 4.0 mm | Refilo Perimetral: 15.0 mm | Veio Alinhado: Sim
                    </p>
                  </div>
                  <div className="text-right bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-lg">
                    <span className="text-[11px] text-emerald-400 block font-semibold">Aproveitamento</span>
                    <span className="text-2xl font-mono font-extrabold text-emerald-300">84,6 %</span>
                  </div>
                </div>

                <div className="bg-[#0f172a] p-6 rounded-xl border border-[#222f46]">
                  <div className="text-xs text-slate-400 mb-3 flex items-center justify-between">
                    <span>Chapa de Origem: CHP-2026-089 (Quartzito Calacatta 3000 x 1800 mm)</span>
                    <span className="text-amber-400 font-mono">1 Retalho Gerado: 3000 x 950 mm</span>
                  </div>

                  {/* Desenho da Chapa com Peças Aninhadas */}
                  <div className="aspect-[30/18] bg-[#1a2333] border-2 border-slate-600 rounded-lg relative overflow-hidden flex items-start justify-start p-2">
                    <div className="bg-sky-600/40 border border-sky-400 text-sky-200 text-xs font-bold p-3 rounded absolute top-3 left-3 w-[80%] h-[35%] flex items-center justify-center">
                      BC-01 (Bancada Gourmet 2600 x 650 mm)
                    </div>
                    <div className="bg-purple-600/40 border border-purple-400 text-purple-200 text-[11px] font-bold p-2 rounded absolute top-[40%] left-3 w-[80%] h-[9%] flex items-center justify-center">
                      FR-01 (Frontão 2600 x 150 mm)
                    </div>
                    <div className="bg-amber-600/40 border border-amber-400 text-amber-200 text-[9px] font-bold rounded absolute top-[51%] left-3 w-[80%] h-[3%] flex items-center justify-center">
                      SA-01 (Saia 45°)
                    </div>
                    <div className="absolute bottom-3 right-3 text-right bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-2 rounded text-[11px]">
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
                  <h3 className="text-base font-bold text-white">Chapas e Sobras Disponíveis no Pátio</h3>
                  <button className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer">
                    + Cadastrar Chapa / Retalho
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#121824] p-4 rounded-xl border border-[#222f46] space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono text-cyan-400">CHP-2026-089</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">Disponível</span>
                    </div>
                    <p className="font-semibold text-white">Quartzito Calacatta Prime 20mm</p>
                    <p className="text-xs text-slate-400 font-mono">Dimensões: 3000 x 1800 mm (5,40 m²)</p>
                    <p className="text-[11px] text-slate-500">Lote: 2026-ES-04 • Cavalete 03-B</p>
                  </div>
                  <div className="bg-[#121824] p-4 rounded-xl border border-[#222f46] space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono text-amber-400">RET-2026-012</span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">Retalho / Sobra</span>
                    </div>
                    <p className="font-semibold text-white">Granito Preto São Gabriel 20mm</p>
                    <p className="text-xs text-slate-400 font-mono">Dimensões: 1800 x 750 mm (1,35 m²)</p>
                    <p className="text-[11px] text-slate-500">Origem: Pedido #841 • Prateleira Retalhos 2</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MÓDULO 5: PRANCHAS & PDFS */}
          {activeTab === 'documents' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-[#121824] p-5 rounded-xl border border-[#222f46] flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Exportação de Pranchas Técnicas de Fabricação</h3>
                    <p className="text-xs text-slate-400 mt-1">Gere PDFs de alta fidelidade para o serrador e acabador</p>
                  </div>
                  <button className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer">
                    Gerar PDF Vetorial (A4/A3)
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0f172a] p-4 rounded-xl border border-[#222f46] space-y-2">
                    <span className="text-xs font-semibold text-slate-300">Prancha 1: Corte & Serra</span>
                    <p className="text-[11px] text-slate-400">Mapa de avanço do disco e identificador das peças para o operador de serra ponte.</p>
                  </div>
                  <div className="bg-[#0f172a] p-4 rounded-xl border border-[#222f46] space-y-2">
                    <span className="text-xs font-semibold text-slate-300">Prancha 2: Acabamentos & Furos</span>
                    <p className="text-[11px] text-slate-400">Cotas dos furos de torneira, recortes de cuba e marcação de meia-esquadria 45°.</p>
                  </div>
                  <div className="bg-[#0f172a] p-4 rounded-xl border border-[#222f46] space-y-2">
                    <span className="text-xs font-semibold text-slate-300">Prancha 3: Proposta do Cliente</span>
                    <p className="text-[11px] text-slate-400">Apresentação visual com materiais, espessuras e valores detalhados para aprovação.</p>
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
