import { boundsOf, polygonAreaMm2, type EdgeFinishType, type Part, type Point2D } from '@lumini/geometry-core';

export type AssemblyRole = 'top' | 'splash' | 'skirt';

export interface AssemblyPose {
  role: AssemblyRole;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface AssemblyItem {
  xMm: number;
  part: Part;
}

const polishedFinishes = new Set<EdgeFinishType>(['straight_polish', 'miter_45', 'bullnose', 'half_bullnose', 'bevel']);

export type StoneSurface = 'polished' | 'brushed';

export function stoneSurface(part: Part): StoneSurface {
  if (part.edges.length === 0) return 'polished';
  const polished = part.edges.filter((edge) => polishedFinishes.has(edge.finish)).length;
  return polished * 2 >= part.edges.length ? 'polished' : 'brushed';
}

export function spanMm(a: readonly [number, number, number], b: readonly [number, number, number]) {
  return Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
}

export function assemblyRole(part: Part): AssemblyRole {
  const depth = boundsOf(part.outerContour).height;
  if (depth <= 80) return 'skirt';
  if (depth <= 220) return 'splash';
  return 'top';
}

export function layoutAssembly(placed: AssemblyItem[]): Record<string, AssemblyPose> {
  const entries = placed.map((item) => ({
    item,
    role: assemblyRole(item.part),
    box: boundsOf(item.part.outerContour),
  }));
  const anchor = entries
    .filter((entry) => entry.role === 'top')
    .sort((a, b) => polygonAreaMm2(b.item.part.outerContour) - polygonAreaMm2(a.item.part.outerContour))[0];
  const anchorThickness = anchor?.item.part.thicknessMm ?? 0;
  const frontZ = anchor ? anchor.box.minY - anchor.box.maxY : 0;
  const poses: Record<string, AssemblyPose> = {};

  for (const entry of entries) {
    const { item, role, box } = entry;
    if (role === 'top') {
      poses[item.part.id] = {
        role,
        position: [item.xMm, 0, box.minY],
        rotation: [-Math.PI / 2, 0, 0],
      };
      continue;
    }
    if (role === 'splash') {
      poses[item.part.id] = {
        role,
        position: [item.xMm, anchorThickness - box.minY, -item.part.thicknessMm],
        rotation: [0, 0, 0],
      };
      continue;
    }
    poses[item.part.id] = {
      role,
      position: [item.xMm, box.minY, frontZ + anchorThickness * 2],
      rotation: [Math.PI, 0, 0],
    };
  }
  return poses;
}

export function edgeInsetMm(finish: EdgeFinishType, thicknessMm: number): number {
  if (finish === 'miter_45') return thicknessMm;
  if (finish === 'bullnose' || finish === 'half_bullnose') return thicknessMm / 2;
  if (finish === 'bevel' || finish === 'italian_recess' || finish === 'american_recess') return Math.min(8, thicknessMm);
  return 0;
}

export interface EdgeBand {
  id: string;
  finish: EdgeFinishType;
  insetMm: number;
  skirtMm: number;
  outerStart: Point2D;
  outerEnd: Point2D;
  innerStart: Point2D;
  innerEnd: Point2D;
}

export function edgeBands(part: Part): { body: Point2D[]; bands: EdgeBand[] } {
  const contour = part.outerContour;
  const count = contour.length;
  if (count < 3) return { body: contour, bands: [] };
  const insets = contour.map((_, index) => {
    const edge = part.edges.find((item) => item.startIndex === index);
    return edge ? edgeInsetMm(edge.finish, part.thicknessMm) : 0;
  });
  if (insets.every((value) => value <= 0)) return { body: contour, bands: [] };

  const lines = contour.map((point, index) => {
    const next = contour[(index + 1) % count];
    const normal = inwardNormal(point, next);
    const inset = insets[index] ?? 0;
    return {
      origin: { x: point.x + normal.x * inset, y: point.y + normal.y * inset },
      direction: { x: next.x - point.x, y: next.y - point.y },
    };
  });
  const body = lines.map((_, index) => intersectLines(lines[(index + count - 1) % count], lines[index]));
  const bands: EdgeBand[] = [];
  contour.forEach((point, index) => {
    const inset = insets[index] ?? 0;
    if (inset <= 0) return;
    const edge = part.edges.find((item) => item.startIndex === index);
    const next = contour[(index + 1) % count];
    bands.push({
      id: edge?.id ?? `edge-${index}`,
      finish: edge?.finish ?? 'straight_polish',
      insetMm: inset,
      skirtMm: edge?.finish === 'miter_45' ? (edge.skirtHeightMm ?? 0) : 0,
      outerStart: point,
      outerEnd: next,
      innerStart: body[index],
      innerEnd: body[(index + 1) % count],
    });
  });
  return { body, bands };
}

function inwardNormal(a: Point2D, b: Point2D): Point2D {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
}

function intersectLines(
  previous: { origin: Point2D; direction: Point2D },
  next: { origin: Point2D; direction: Point2D },
): Point2D {
  const det = previous.direction.x * next.direction.y - previous.direction.y * next.direction.x;
  if (Math.abs(det) < 1e-6) return next.origin;
  const t =
    ((next.origin.x - previous.origin.x) * next.direction.y - (next.origin.y - previous.origin.y) * next.direction.x) / det;
  return { x: previous.origin.x + t * previous.direction.x, y: previous.origin.y + t * previous.direction.y };
}
