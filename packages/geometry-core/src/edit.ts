import type { EdgeFinishType, EdgeSegment, Hole, InnerContour, Part, Point2D } from './index';

export const SNAP_MM = 5;
export const MIN_SPAN_MM = 20;
export const STONE_MARGIN_MM = 15;
export const DEFAULT_DIMENSION_OFFSET_MM = 80;

export function snapMm(value: number, step = SNAP_MM): number {
  return Math.round(value / step) * step;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function boundsOf(points: Point2D[]): Bounds {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function polygonAreaMm2(points: Point2D[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function grossAreaMm2(part: Part): number {
  return polygonAreaMm2(part.outerContour);
}

export function netAreaMm2(part: Part): number {
  const openings = part.innerContours.reduce((sum, contour) => sum + contour.widthMm * contour.heightMm, 0);
  return Math.max(0, grossAreaMm2(part) - openings);
}

export function pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const hit = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (hit) inside = !inside;
  }
  return inside;
}

export function outwardNormal(a: Point2D, b: Point2D): Point2D {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.y - a.y) / length, y: -(b.x - a.x) / length };
}

export interface DimensionLine {
  start: Point2D;
  end: Point2D;
  normal: Point2D;
  lengthMm: number;
}

export function dimensionLine(a: Point2D, b: Point2D, offsetMm: number): DimensionLine {
  const normal = outwardNormal(a, b);
  return {
    normal,
    lengthMm: Math.round(Math.hypot(b.x - a.x, b.y - a.y)),
    start: { x: a.x + normal.x * offsetMm, y: a.y + normal.y * offsetMm },
    end: { x: b.x + normal.x * offsetMm, y: b.y + normal.y * offsetMm },
  };
}

export function distanceToSegment(point: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function lengthMm(a: Point2D, b: Point2D): number {
  return Math.round(Math.hypot(b.x - a.x, b.y - a.y));
}

export function refreshEdges(part: Part): Part {
  const edges: EdgeSegment[] = part.edges.map((edge) => {
    const a = part.outerContour[edge.startIndex];
    const b = part.outerContour[edge.endIndex];
    if (!a || !b) return edge;
    return { ...edge, lengthMm: lengthMm(a, b) };
  });
  return { ...part, edges };
}

function openingOf(contour: InnerContour): InnerContour {
  const box = boundsOf(contour.points);
  return { ...contour, widthMm: box.width, heightMm: box.height };
}

function featuresFit(part: Part): boolean {
  const box = boundsOf(part.outerContour);
  if (box.width < MIN_SPAN_MM || box.height < MIN_SPAN_MM) return false;

  for (const hole of part.holes) {
    const radius = hole.diameterMm / 2;
    const inset = radius + STONE_MARGIN_MM;
    if (
      hole.center.x - inset < box.minX ||
      hole.center.x + inset > box.maxX ||
      hole.center.y - inset < box.minY ||
      hole.center.y + inset > box.maxY
    ) {
      return false;
    }
    for (const contour of part.innerContours) {
      if (circleHitsPolygon(hole.center, hole.diameterMm / 2, contour.points)) return false;
    }
  }

  for (const contour of part.innerContours) {
    const opening = boundsOf(contour.points);
    if (
      opening.minX < box.minX + STONE_MARGIN_MM ||
      opening.maxX > box.maxX - STONE_MARGIN_MM ||
      opening.minY < box.minY + STONE_MARGIN_MM ||
      opening.maxY > box.maxY - STONE_MARGIN_MM
    ) {
      return false;
    }
  }

  return true;
}

function withContour(part: Part, outerContour: Point2D[]): Part {
  return refreshEdges({ ...part, outerContour });
}

function applyEdgeDelta(part: Part, edgeId: string, delta: number): Part {
  const edge = part.edges.find((item) => item.id === edgeId);
  if (!edge) return part;
  const start = part.outerContour[edge.startIndex];
  const end = part.outerContour[edge.endIndex];
  if (!start || !end) return part;
  const horizontal = Math.abs(start.y - end.y) <= Math.abs(start.x - end.x);
  const outerContour = part.outerContour.map((point, index) => {
    if (index !== edge.startIndex && index !== edge.endIndex) return point;
    return horizontal ? { ...point, y: start.y + delta } : { ...point, x: start.x + delta };
  });
  return withContour(part, outerContour);
}

export function dragEdge(part: Part, edgeId: string, deltaMm: number): Part {
  const target = snapMm(deltaMm);
  const step = Math.sign(target) * SNAP_MM;
  if (step === 0) return part;

  let best = 0;
  for (let delta = step; Math.abs(delta) <= Math.abs(target) + 0.01; delta += step) {
    const next = applyEdgeDelta(part, edgeId, delta);
    if (!featuresFit(next) || hasSelfIntersection(next.outerContour)) break;
    best = delta;
  }
  return best === 0 ? part : applyEdgeDelta(part, edgeId, best);
}

export function moveHole(part: Part, holeId: string, xMm: number, yMm: number): Part {
  const box = boundsOf(part.outerContour);
  const holes: Hole[] = part.holes.map((hole) => {
    if (hole.id !== holeId) return hole;
    const inset = hole.diameterMm / 2 + STONE_MARGIN_MM;
    return {
      ...hole,
      center: {
        x: Math.min(box.maxX - inset, Math.max(box.minX + inset, snapMm(xMm))),
        y: Math.min(box.maxY - inset, Math.max(box.minY + inset, snapMm(yMm))),
      },
    };
  });
  const next = { ...part, holes };
  return featuresFit(next) ? next : part;
}

export function moveOpening(part: Part, openingId: string, dxMm: number, dyMm: number): Part {
  const box = boundsOf(part.outerContour);
  const innerContours = part.innerContours.map((contour) => {
    if (contour.id !== openingId) return contour;
    const dx = snapMm(dxMm);
    const dy = snapMm(dyMm);
    const moved = contour.points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
    const opening = boundsOf(moved);
    const fixX =
      opening.minX < box.minX + STONE_MARGIN_MM
        ? box.minX + STONE_MARGIN_MM - opening.minX
        : opening.maxX > box.maxX - STONE_MARGIN_MM
          ? box.maxX - STONE_MARGIN_MM - opening.maxX
          : 0;
    const fixY =
      opening.minY < box.minY + STONE_MARGIN_MM
        ? box.minY + STONE_MARGIN_MM - opening.minY
        : opening.maxY > box.maxY - STONE_MARGIN_MM
          ? box.maxY - STONE_MARGIN_MM - opening.maxY
          : 0;
    const points = moved.map((point) => ({ x: point.x + fixX, y: point.y + fixY }));
    return openingOf({ ...contour, points });
  });
  return { ...part, innerContours };
}

export function dragOpeningEdge(part: Part, openingId: string, edgeIndex: number, deltaMm: number): Part {
  const box = boundsOf(part.outerContour);
  const target = snapMm(deltaMm);
  const step = Math.sign(target) * SNAP_MM;
  if (step === 0) return part;

  const apply = (delta: number): Part => {
    const innerContours = part.innerContours.map((contour) => {
      if (contour.id !== openingId) return contour;
      const points = contour.points.map((point, index) => {
        const onEdge = index === edgeIndex || index === (edgeIndex + 1) % contour.points.length;
        if (!onEdge) return point;
        const a = contour.points[edgeIndex];
        const b = contour.points[(edgeIndex + 1) % contour.points.length];
        const horizontal = Math.abs(a.y - b.y) <= Math.abs(a.x - b.x);
        return horizontal ? { ...point, y: a.y + delta } : { ...point, x: a.x + delta };
      });
      return openingOf({ ...contour, points });
    });
    return { ...part, innerContours };
  };

  let best = 0;
  for (let delta = step; Math.abs(delta) <= Math.abs(target) + 0.01; delta += step) {
    const next = apply(delta);
    const opening = next.innerContours.find((contour) => contour.id === openingId);
    if (!opening || opening.widthMm < 80 || opening.heightMm < 80) break;
    if (
      boundsOf(opening.points).minX < box.minX + STONE_MARGIN_MM ||
      boundsOf(opening.points).maxX > box.maxX - STONE_MARGIN_MM ||
      boundsOf(opening.points).minY < box.minY + STONE_MARGIN_MM ||
      boundsOf(opening.points).maxY > box.maxY - STONE_MARGIN_MM
    ) {
      break;
    }
    best = delta;
  }
  return best === 0 ? part : apply(best);
}

function circleHitsPolygon(center: Point2D, radius: number, polygon: Point2D[]): boolean {
  if (pointInPolygon(center, polygon)) return true;
  for (let index = 0; index < polygon.length; index++) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    if (distanceToSegment(center, a, b) < radius) return true;
  }
  return false;
}

function turn(a: Point2D, b: Point2D, c: Point2D): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function edgesCross(a: Point2D, b: Point2D, c: Point2D, d: Point2D): boolean {
  const ab = turn(a, b, c) * turn(a, b, d);
  const cd = turn(c, d, a) * turn(c, d, b);
  return ab < 0 && cd < 0;
}

export function hasSelfIntersection(points: Point2D[]): boolean {
  const count = points.length;
  for (let i = 0; i < count; i++) {
    const a = points[i];
    const b = points[(i + 1) % count];
    for (let j = i + 1; j < count; j++) {
      const adjacent = j === i || (i + 1) % count === j || (j + 1) % count === i;
      if (adjacent) continue;
      const c = points[j];
      const d = points[(j + 1) % count];
      if (edgesCross(a, b, c, d)) return true;
    }
  }
  return false;
}

function contourEdges(contour: Point2D[], finish: EdgeFinishType = 'straight_polish'): EdgeSegment[] {
  return contour.map((point, index) => {
    const next = contour[(index + 1) % contour.length];
    return {
      id: `e${index + 1}`,
      startIndex: index,
      endIndex: (index + 1) % contour.length,
      lengthMm: lengthMm(point, next),
      finish,
    };
  });
}

export interface PartBlank {
  id: string;
  partCode: string;
  name: string;
  materialId: string;
  materialName: string;
  thicknessMm: number;
  colorHex?: string;
}

export function rectanglePart(blank: PartBlank, widthMm: number, heightMm: number): Part {
  const width = Math.max(80, snapMm(widthMm));
  const height = Math.max(40, snapMm(heightMm));
  const outerContour = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  return { ...blank, outerContour, edges: contourEdges(outerContour), holes: [], innerContours: [] };
}

export function lPart(blank: PartBlank, widthMm: number, depthMm: number, armMm: number): Part {
  const width = Math.max(200, snapMm(widthMm));
  const depth = Math.max(200, snapMm(depthMm));
  const arm = Math.min(Math.max(80, snapMm(armMm)), Math.min(width, depth) - 80);
  const outerContour = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: arm },
    { x: arm, y: arm },
    { x: arm, y: depth },
    { x: 0, y: depth },
  ];
  return { ...blank, outerContour, edges: contourEdges(outerContour), holes: [], innerContours: [] };
}

export function polygonPart(blank: PartBlank, points: Point2D[]): Part | null {
  if (points.length < 3 || points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
  const snapped = points.map((point) => ({ x: snapMm(point.x), y: snapMm(point.y) }));
  const withoutDuplicateClose = snapped.length > 3 && samePoint(snapped[0], snapped[snapped.length - 1])
    ? snapped.slice(0, -1)
    : snapped;
  const compact = withoutDuplicateClose.filter((point, index, list) => !samePoint(point, list[(index + 1) % list.length]));
  if (compact.length < 3 || hasSelfIntersection(compact)) return null;
  if (polygonAreaMm2(compact) < MIN_SPAN_MM * MIN_SPAN_MM) return null;

  const bounds = boundsOf(compact);
  if (bounds.width < MIN_SPAN_MM || bounds.height < MIN_SPAN_MM) return null;
  const outerContour = compact.map((point) => ({ x: point.x - bounds.minX, y: point.y - bounds.minY }));
  const part: Part = { ...blank, outerContour, edges: contourEdges(outerContour), holes: [], innerContours: [] };
  return hasSelfIntersection(outerContour) ? null : part;
}

function samePoint(first: Point2D, second: Point2D): boolean {
  return first.x === second.x && first.y === second.y;
}

export function addHole(part: Part, diameterMm = 35): Part | null {
  if (!Number.isFinite(diameterMm) || diameterMm < 5 || diameterMm > 300) return null;
  const box = boundsOf(part.outerContour);
  const radius = diameterMm / 2;
  const inset = radius + STONE_MARGIN_MM;
  const spots: Point2D[] = [];
  for (let y = box.minY + inset; y <= box.maxY - inset; y += 40) {
    for (let x = box.minX + inset; x <= box.maxX - inset; x += 40) {
      spots.push({ x: snapMm(x), y: snapMm(y) });
    }
  }
  for (const center of spots) {
    const hole: Hole = {
      id: `h${part.holes.length + 1}`,
      kind: 'faucet',
      center,
      diameterMm,
      label: 'Furo',
    };
    const next = { ...part, holes: [...part.holes, hole] };
    if (featuresFit(next) && pointInPolygon(center, part.outerContour)) return next;
  }
  return null;
}

export function addSink(part: Part, widthMm = 500, heightMm = 350): Part | null {
  const box = boundsOf(part.outerContour);
  const width = snapMm(widthMm);
  const height = snapMm(heightMm);
  if (width < 80 || height < 80) return null;
  const roomX = box.width - width - STONE_MARGIN_MM * 2;
  const roomY = box.height - height - STONE_MARGIN_MM * 2;
  if (roomX < 0 || roomY < 0) return null;

  for (let y = box.minY + STONE_MARGIN_MM; y <= box.minY + STONE_MARGIN_MM + roomY; y += 40) {
    for (let x = box.minX + STONE_MARGIN_MM; x <= box.minX + STONE_MARGIN_MM + roomX; x += 40) {
      const origin = { x: snapMm(x), y: snapMm(y) };
      const points = [
        origin,
        { x: origin.x + width, y: origin.y },
        { x: origin.x + width, y: origin.y + height },
        { x: origin.x, y: origin.y + height },
      ];
      const contour: InnerContour = {
        id: `c${part.innerContours.length + 1}`,
        kind: 'undermount_sink',
        points,
        widthMm: width,
        heightMm: height,
        clearanceMm: 15,
        label: 'Cuba',
      };
      const next = { ...part, innerContours: [...part.innerContours, contour] };
      if (featuresFit(next)) return next;
    }
  }
  return null;
}

export function addOvalSink(part: Part, widthMm = 500, heightMm = 350): Part | null {
  const box = boundsOf(part.outerContour);
  const width = snapMm(widthMm);
  const height = snapMm(heightMm);
  if (width < 80 || height < 80) return null;

  const roomX = box.width - width - STONE_MARGIN_MM * 2;
  const roomY = box.height - height - STONE_MARGIN_MM * 2;
  if (roomX < 0 || roomY < 0) return null;

  for (let y = box.minY + STONE_MARGIN_MM; y <= box.minY + STONE_MARGIN_MM + roomY; y += 40) {
    for (let x = box.minX + STONE_MARGIN_MM; x <= box.minX + STONE_MARGIN_MM + roomX; x += 40) {
      const center = { x: snapMm(x + width / 2), y: snapMm(y + height / 2) };
      const points = Array.from({ length: 64 }, (_, index) => {
        const angle = (index * Math.PI * 2) / 64;
        return {
          x: center.x + (width / 2) * Math.cos(angle),
          y: center.y + (height / 2) * Math.sin(angle),
        };
      });
      const contour: InnerContour = {
        id: `c${part.innerContours.length + 1}`,
        kind: 'undermount_sink',
        points,
        widthMm: width,
        heightMm: height,
        clearanceMm: STONE_MARGIN_MM,
        label: 'Cuba oval',
      };
      const overlapsExisting = part.innerContours.some((existing) => polygonsOverlap(existing.points, points));
      if (overlapsExisting) continue;
      const next = { ...part, innerContours: [...part.innerContours, contour] };
      if (featuresFit(next)) return next;
    }
  }
  return null;
}

function polygonsOverlap(first: Point2D[], second: Point2D[]): boolean {
  if (first.some((point) => pointInPolygon(point, second)) || second.some((point) => pointInPolygon(point, first))) return true;
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const a = first[firstIndex];
    const b = first[(firstIndex + 1) % first.length];
    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const c = second[secondIndex];
      const d = second[(secondIndex + 1) % second.length];
      if (edgesCross(a, b, c, d)) return true;
    }
  }
  return false;
}
