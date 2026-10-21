/**
 * Lumini Geometry Core — Modelo Canônico de Geometria e Fabricação
 * 
 * Regra Arquitetural Obrigatória (RN-002, RN-003):
 * Todas as medidas de domínio são estritamente expressas em milímetros (mm).
 * Conversões para pixels ocorrem exclusivamente no renderer gráfico (SVG/Canvas/Three.js).
 */

export type Millimeters = number;
export type Degrees = number;

/**
 * Acabamentos de borda tradicionais de marmoraria
 */
export type EdgeFinishType = 
  | 'raw'               // Bruto / serrado
  | 'straight_polish'   // Polimento reto simples
  | 'miter_45'          // Meia-esquadria 45° (para colagem de saia)
  | 'bullnose'          // Boleado total
  | 'half_bullnose'     // Meio boleado / meia-cana
  | 'bevel'             // Bisotê reto
  | 'italian_recess'    // Rebaixo italiano (área molhada)
  | 'american_recess';  // Rebaixo americano

export interface Point2D {
  x: Millimeters;
  y: Millimeters;
}

export interface EdgeSegment {
  id: string;
  startIndex: number;
  endIndex: number;
  lengthMm: Millimeters;
  finish: EdgeFinishType;
  /** Acabamento do catálogo da marmoraria. Ausente em desenhos antigos, que o orçamento ainda resolve pelo código do perfil. */
  finishTypeId?: string;
  skirtHeightMm?: Millimeters; // Altura da saia colada em 45° se aplicável (ex: 40mm)
  notes?: string;
}

export type HoleKind = 'faucet' | 'sink_drain' | 'water_outlet' | 'soap_dispenser' | 'custom';

export interface Hole {
  id: string;
  kind: HoleKind;
  center: Point2D;
  diameterMm: Millimeters; // Entrada padrão canônica (RN-003)
  label?: string;
}

export interface InnerContour {
  id: string;
  kind: 'undermount_sink' | 'dropin_sink' | 'cooktop' | 'custom';
  points: Point2D[];
  widthMm: Millimeters;
  heightMm: Millimeters;
  clearanceMm?: Millimeters; // Folga de colagem
  label?: string;
}

export interface Part {
  id: string;
  partCode: string; // Ex: "BC-01" (Bancada 01), "SA-01" (Saia 01)
  name: string;
  materialId: string;
  materialName: string;
  thicknessMm: Millimeters; // Ex: 20mm, 30mm
  outerContour: Point2D[]; // Polígono fechado em sentido horário
  edges: EdgeSegment[];
  holes: Hole[];
  innerContours: InnerContour[];
  notes?: string;
  colorHex?: string;
}

export interface DimensionAnnotation {
  id: string;
  partId?: string;
  startPoint: Point2D;
  endPoint: Point2D;
  offsetMm: Millimeters;
  text?: string;
  visible: boolean;
}

export interface DrawingProjectSnapshot {
  schemaVersion: '1.0';
  parts: Part[];
  dimensions: DimensionAnnotation[];
  lastModifiedAt: string;
}

/**
 * Entidades para o Plano de Corte e Estoque
 */
export interface Slab {
  id: string;
  materialId: string;
  materialName: string;
  thicknessMm: Millimeters;
  widthMm: Millimeters;
  heightMm: Millimeters;
  batchCode?: string;
  location?: string;
  isRemnant: boolean; // True se for retalho/sobra aproveitada
}

export interface CutPlacement {
  id: string;
  partId: string;
  partCode: string;
  slabId: string;
  xMm: Millimeters;
  yMm: Millimeters;
  rotationDeg: Degrees; // 0, 90, 180, 270
  mirrored: boolean;
}

export interface CutPlan {
  id: string;
  projectRevisionId: string;
  algorithmVersion: string;
  kerfMm: Millimeters; // Espessura do disco de serra (ex: 3.5mm a 5mm)
  edgeMarginMm: Millimeters; // Refilo perimetral da chapa (ex: 15mm)
  respectVeinDirection: boolean;
  placements: CutPlacement[];
  totalAreaSlabsMm2: number;
  totalAreaPartsMm2: number;
  utilizationPercentage: number;
  remnantsGenerated: {
    widthMm: Millimeters;
    heightMm: Millimeters;
    areaMm2: number;
  }[];
}

export * from './edit';
