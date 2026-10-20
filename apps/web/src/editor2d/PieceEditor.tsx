import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import {
  boundsOf,
  DEFAULT_DIMENSION_OFFSET_MM,
  dimensionLine,
  distanceToSegment,
  dragEdge,
  dragOpeningEdge,
  moveHole,
  moveOpening,
  pointInPolygon,
  snapMm,
  type EdgeFinishType,
  type InnerContour,
  type Part,
  type Point2D,
} from '@lumini/geometry-core';
import { MaskedText } from '@/components/ui/MaskedText';
import type { PlacedPart } from './kitchen';

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Axis = 'x' | 'y';

type Hit =
  | { kind: 'pan' }
  | { kind: 'part'; id: string }
  | { kind: 'edge'; id: string; edgeId: string; axis: Axis }
  | { kind: 'hole'; id: string; holeId: string }
  | { kind: 'opening'; id: string; openingId: string }
  | { kind: 'opening-edge'; id: string; openingId: string; edgeIndex: number; axis: Axis }
  | { kind: 'dimension'; id: string; edgeId: string; axis: Axis };

export interface DimensionOverride {
  offsetMm: number;
  visible: boolean;
}

type Drag =
  | { kind: 'pan'; px: number; py: number; view: ViewBox }
  | ({ start: PlacedPart[]; x: number; y: number } & Exclude<Hit, { kind: 'pan' }>);

interface PieceEditorProps {
  placed: PlacedPart[];
  selectedPartId: string;
  selectedEdgeId: string | null;
  onChange: (placed: PlacedPart[]) => void;
  onSelectPart: (partId: string) => void;
  onSelectEdge: (partId: string, edgeId: string) => void;
  onGestureStart?: () => void;
  dimensionState: Record<string, DimensionOverride>;
  onDimension: (partId: string, edgeId: string, next: DimensionOverride) => void;
}

function coverView(camera: ViewBox, width: number, height: number): ViewBox {
  if (width < 1 || height < 1 || camera.w <= 0 || camera.h <= 0) return camera;
  const cameraAspect = camera.w / camera.h;
  const screenAspect = width / height;
  if (Math.abs(cameraAspect - screenAspect) < 0.002) return camera;
  if (screenAspect > cameraAspect) {
    const w = camera.h * screenAspect;
    return { x: camera.x - (w - camera.w) / 2, y: camera.y, w, h: camera.h };
  }
  const h = camera.w / screenAspect;
  return { x: camera.x, y: camera.y - (h - camera.h) / 2, w: camera.w, h };
}

function worldPoints(item: PlacedPart): Point2D[] {
  return item.part.outerContour.map((point) => ({ x: point.x + item.xMm, y: point.y + item.yMm }));
}

function toPath(points: Point2D[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ') + ' Z';
}

export function PieceEditor({
  placed,
  selectedPartId,
  selectedEdgeId,
  onChange,
  onSelectPart,
  onSelectEdge,
  onGestureStart,
  dimensionState,
  onDimension,
}: PieceEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const placedRef = useRef(placed);
  const userFramed = useRef(false);
  const fitW = useRef(3000);
  const [view, setView] = useState<ViewBox>({ x: -400, y: -280, w: 3400, h: 1600 });
  const [zoomLabel, setZoomLabel] = useState('100%');
  const [mmPerPx, setMmPerPx] = useState(3);
  const [cursor, setCursor] = useState('crosshair');
  const [callout, setCallout] = useState<Callout | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  placedRef.current = placed;

  function frame() {
    const svg = svgRef.current;
    const items = placedRef.current;
    if (!svg || svg.clientWidth < 40 || svg.clientHeight < 40 || items.length === 0) return;
    const box = boundsOf(items.flatMap(worldPoints));
    const padX = Math.max(170, box.width * 0.04);
    const padY = Math.max(170, box.height * 0.08);
    const x = box.minX - padX;
    const y = box.minY - padY;
    const w = box.width + padX * 2;
    const h = box.height + padY * 2;
    const covered = coverView({ x, y, w, h }, svg.clientWidth, svg.clientHeight);
    fitW.current = covered.w;
    setView(covered);
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => {
      if (!userFramed.current) {
        frame();
        return;
      }
      setView((current) => coverView(current, svg.clientWidth, svg.clientHeight));
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || svg.clientWidth < 1) return;
    setMmPerPx(view.w / svg.clientWidth);
    setZoomLabel(`${Math.max(1, Math.round((fitW.current / view.w) * 100))}%`);
  }, [view]);

  function toMm(event: { clientX: number; clientY: number }): Point2D {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const local = point.matrixTransform(matrix.inverse());
    return { x: local.x, y: local.y };
  }

  function tolerance(): number {
    const svg = svgRef.current;
    if (!svg) return 18;
    return (18 * view.w) / Math.max(svg.clientWidth, 1);
  }

  function cursorFor(target: Hit): string {
    if (target.kind === 'edge' || target.kind === 'opening-edge') return target.axis === 'x' ? 'ew-resize' : 'ns-resize';
    if (target.kind === 'pan') return 'default';
    return 'grab';
  }

  function dimensionOverride(partId: string, edgeId: string): DimensionOverride {
    return dimensionState[`${partId}:${edgeId}`] ?? { offsetMm: DEFAULT_DIMENSION_OFFSET_MM, visible: true };
  }

  function shownOffset(item: PlacedPart, edgeId: string, preferred: number): number {
    if (dimensionState[`${item.part.id}:${edgeId}`]) return preferred;
    const edge = item.part.edges.find((entry) => entry.id === edgeId);
    const a = edge ? item.part.outerContour[edge.startIndex] : undefined;
    const b = edge ? item.part.outerContour[edge.endIndex] : undefined;
    if (!a || !b) return preferred;
    const worldA = { x: a.x + item.xMm, y: a.y + item.yMm };
    const worldB = { x: b.x + item.xMm, y: b.y + item.yMm };
    for (let offset = preferred; offset <= 480; offset += 20) {
      const line = dimensionLine(worldA, worldB, offset);
      const samples = [line.start, line.end, { x: (line.start.x + line.end.x) / 2, y: (line.start.y + line.end.y) / 2 }];
      const blocked = samples.some((point) =>
        placed.some((other) => other.part.id !== item.part.id && pointInPolygon(point, worldPoints(other))),
      );
      if (!blocked) return offset;
    }
    return preferred;
  }

  function hit(mm: Point2D): Hit {
    const reach = tolerance();
    const selected = placed.find((item) => item.part.id === selectedPartId);
    if (selected) {
      for (const edge of selected.part.edges) {
        const state = dimensionOverride(selected.part.id, edge.id);
        if (!state.visible) continue;
        const a = selected.part.outerContour[edge.startIndex];
        const b = selected.part.outerContour[edge.endIndex];
        if (!a || !b) continue;
        const line = dimensionLine(
          { x: a.x + selected.xMm, y: a.y + selected.yMm },
          { x: b.x + selected.xMm, y: b.y + selected.yMm },
          shownOffset(selected, edge.id, state.offsetMm),
        );
        const horizontal = Math.abs(a.y - b.y) <= Math.abs(a.x - b.x);
        if (distanceToSegment(mm, line.start, line.end) <= reach) {
          return { kind: 'dimension', id: selected.part.id, edgeId: edge.id, axis: horizontal ? 'y' : 'x' };
        }
      }
    }
    for (const item of [...placed].reverse()) {
      const local = { x: mm.x - item.xMm, y: mm.y - item.yMm };
      let best: Hit | null = null;
      let bestDist = Number.POSITIVE_INFINITY;

      const consider = (dist: number, limit: number, next: Hit) => {
        if (dist <= limit && dist < bestDist) {
          bestDist = dist;
          best = next;
        }
      };

      for (const hole of item.part.holes) {
        consider(
          Math.hypot(local.x - hole.center.x, local.y - hole.center.y) - hole.diameterMm / 2,
          Math.max(reach, 30),
          { kind: 'hole', id: item.part.id, holeId: hole.id },
        );
      }
      for (const opening of item.part.innerContours) {
        for (let index = 0; index < opening.points.length; index++) {
          const a = opening.points[index];
          const b = opening.points[(index + 1) % opening.points.length];
          const horizontal = Math.abs(a.y - b.y) <= Math.abs(a.x - b.x);
          consider(distanceToSegment(local, a, b), reach, {
            kind: 'opening-edge',
            id: item.part.id,
            openingId: opening.id,
            edgeIndex: index,
            axis: horizontal ? 'y' : 'x',
          });
        }
      }
      for (const edge of item.part.edges) {
        const a = item.part.outerContour[edge.startIndex];
        const b = item.part.outerContour[edge.endIndex];
        if (!a || !b) continue;
        const horizontal = Math.abs(a.y - b.y) <= Math.abs(a.x - b.x);
        consider(distanceToSegment(local, a, b), reach, {
          kind: 'edge',
          id: item.part.id,
          edgeId: edge.id,
          axis: horizontal ? 'y' : 'x',
        });
      }
      if (best) return best;

      for (const opening of item.part.innerContours) {
        if (pointInPolygon(local, opening.points)) return { kind: 'opening', id: item.part.id, openingId: opening.id };
      }
      if (pointInPolygon(local, item.part.outerContour)) return { kind: 'part', id: item.part.id };
    }
    return { kind: 'pan' };
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const mm = toMm(event);
    const target = hit(mm);
    if (target.kind === 'dimension' && event.detail >= 2) {
      const current = dimensionOverride(target.id, target.edgeId);
      onDimension(target.id, target.edgeId, { ...current, visible: false });
      onSelectEdge(target.id, target.edgeId);
      return;
    }
    if (target.kind === 'part' || target.kind === 'edge' || target.kind === 'hole' || target.kind === 'opening' || target.kind === 'opening-edge' || target.kind === 'dimension') {
      onSelectPart(target.id);
    }
    if (target.kind === 'edge' || target.kind === 'dimension') onSelectEdge(target.id, target.edgeId);
    if (target.kind !== 'pan' && target.kind !== 'dimension') onGestureStart?.();
    if (target.kind === 'pan') userFramed.current = true;
    dragRef.current =
      target.kind === 'pan'
        ? { kind: 'pan', px: event.clientX, py: event.clientY, view }
        : { ...target, start: placed, x: mm.x, y: mm.y };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // O gesto segue pelos eventos do ponteiro mesmo sem captura.
    }
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) {
      setCursor(cursorFor(hit(toMm(event))));
      return;
    }
    if (drag.kind === 'pan') {
      const svg = svgRef.current;
      if (!svg) return;
      const shown = coverView(drag.view, svg.clientWidth, svg.clientHeight);
      const scale = shown.w / Math.max(svg.clientWidth, 1);
      const dx = (event.clientX - drag.px) * scale;
      const dy = (event.clientY - drag.py) * scale;
      setView({ ...drag.view, x: drag.view.x - dx, y: drag.view.y - dy });
      return;
    }

    const mm = toMm(event);
    if (drag.kind === 'dimension') {
      const item = drag.start.find((entry) => entry.part.id === drag.id);
      const edge = item?.part.edges.find((entry) => entry.id === drag.edgeId);
      const a = edge ? item?.part.outerContour[edge.startIndex] : undefined;
      const b = edge ? item?.part.outerContour[edge.endIndex] : undefined;
      if (!item || !a || !b) return;
      const line = dimensionLine({ x: a.x + item.xMm, y: a.y + item.yMm }, { x: b.x + item.xMm, y: b.y + item.yMm }, 0);
      const signed = (mm.x - (a.x + item.xMm)) * line.normal.x + (mm.y - (a.y + item.yMm)) * line.normal.y;
      const offsetMm = Math.max(36, Math.min(480, snapMm(signed)));
      onDimension(drag.id, drag.edgeId, { offsetMm, visible: true });
      return;
    }
    const dx = mm.x - drag.x;
    const dy = mm.y - drag.y;
    const next = drag.start.map((item) => {
      if (item.part.id !== drag.id) return item;
      if (drag.kind === 'part') {
        return { ...item, xMm: snapMm(item.xMm + dx), yMm: snapMm(item.yMm + dy) };
      }
      if (drag.kind === 'edge') {
        return { ...item, part: dragEdge(item.part, drag.edgeId, drag.axis === 'x' ? dx : dy) };
      }
      if (drag.kind === 'hole') {
        const hole = drag.start.find((entry) => entry.part.id === drag.id)?.part.holes.find((entry) => entry.id === drag.holeId);
        if (!hole) return item;
        return { ...item, part: moveHole(item.part, drag.holeId, hole.center.x + dx, hole.center.y + dy) };
      }
      if (drag.kind === 'opening') {
        return { ...item, part: moveOpening(item.part, drag.openingId, dx, dy) };
      }
      return { ...item, part: dragOpeningEdge(item.part, drag.openingId, drag.edgeIndex, drag.axis === 'x' ? dx : dy) };
    });
    onChange(next);
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    userFramed.current = true;
    const mm = toMm(event);
    let factor = event.deltaY > 0 ? 1.1 : 0.9;
    const minFactor = Math.max(400 / view.w, 280 / view.h);
    const maxFactor = Math.min(14000 / view.w, 14000 / view.h);
    factor = Math.min(maxFactor, Math.max(minFactor, factor));
    const w = view.w * factor;
    const h = view.h * factor;
    const sx = (mm.x - view.x) / view.w;
    const sy = (mm.y - view.y) / view.h;
    setView({ x: mm.x - sx * w, y: mm.y - sy * h, w, h });
  }

  const selectedItem = placed.find((item) => item.part.id === selectedPartId) ?? null;

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap || !selectedItem) {
      setCallout(null);
      return;
    }
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const origin = wrap.getBoundingClientRect();
    const toPx = (x: number, y: number) => {
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = y;
      const screen = point.matrixTransform(matrix);
      return { x: screen.x - origin.left, y: screen.y - origin.top };
    };
    const boxes = placed.map((item) => {
      const box = boundsOf(item.part.outerContour);
      const a = toPx(box.minX + item.xMm, box.minY + item.yMm);
      const b = toPx(box.maxX + item.xMm, box.maxY + item.yMm);
      return {
        l: Math.min(a.x, b.x),
        t: Math.min(a.y, b.y),
        r: Math.max(a.x, b.x),
        b: Math.max(a.y, b.y),
        selected: item.part.id === selectedItem.part.id,
      };
    });
    for (const edge of selectedItem.part.edges) {
      const state = dimensionOverride(selectedItem.part.id, edge.id);
      if (!state.visible) continue;
      const a = selectedItem.part.outerContour[edge.startIndex];
      const b = selectedItem.part.outerContour[edge.endIndex];
      if (!a || !b) continue;
      const line = dimensionLine(
        { x: a.x + selectedItem.xMm, y: a.y + selectedItem.yMm },
        { x: b.x + selectedItem.xMm, y: b.y + selectedItem.yMm },
        shownOffset(selectedItem, edge.id, state.offsetMm),
      );
      const start = toPx(line.start.x, line.start.y);
      const end = toPx(line.end.x, line.end.y);
      boxes.push({
        l: Math.min(start.x, end.x) - 16,
        t: Math.min(start.y, end.y) - 16,
        r: Math.max(start.x, end.x) + 16,
        b: Math.max(start.y, end.y) + 16,
        selected: false,
      });
    }
    const card = cardRef.current;
    const host = boxes.find((box) => box.selected);
    if (!host || !card) return;
    const width = card.offsetWidth || 232;
    const height = card.offsetHeight || 160;
    const gap = 14;
    const sheet = svg.getBoundingClientRect();
    const limit = {
      l: Math.max(8, sheet.left - origin.left + 8),
      t: Math.max(8, sheet.top - origin.top + 8),
      r: Math.min(origin.width - 8, sheet.right - origin.left - 8),
      b: Math.min(origin.height - 8, sheet.bottom - origin.top - 8),
    };
    const hostCx = (host.l + host.r) / 2;
    const hostCy = (host.t + host.b) / 2;
    const xs = [host.l, host.r - width, hostCx - width / 2].map((value) =>
      Math.max(limit.l, Math.min(value, limit.r - width)),
    );
    const found: { x: number; y: number; distance: number }[] = [];
    for (const x of xs) {
      const above = firstClear(x, host.t - height - gap, -8, width, height, limit, boxes);
      const below = firstClear(x, host.b + gap, 8, width, height, limit, boxes);
      if (above) found.push({ ...above, distance: Math.hypot(above.x + width / 2 - hostCx, above.y + height / 2 - hostCy) });
      if (below) found.push({ ...below, distance: Math.hypot(below.x + width / 2 - hostCx, below.y + height / 2 - hostCy) });
    }
    found.sort((a, b) => a.distance - b.distance);
    const place = found[0] ?? {
      x: Math.max(limit.l, Math.min(host.l, limit.r - width)),
      y: Math.max(limit.t, Math.min(host.t - height - gap, limit.b - height)),
    };
    const tip = nearestOnRect((host.l + host.r) / 2, (host.t + host.b) / 2, {
      l: place.x,
      t: place.y,
      r: place.x + width,
      b: place.y + height,
    });
    const anchor = toWorld(svg, matrix, origin, tip.x, tip.y);
    const hostWorld = boundsOf(selectedItem.part.outerContour);
    const fromX = Math.min(hostWorld.maxX, Math.max(hostWorld.minX, anchor.x - selectedItem.xMm)) + selectedItem.xMm;
    const fromY = Math.min(hostWorld.maxY, Math.max(hostWorld.minY, anchor.y - selectedItem.yMm)) + selectedItem.yMm;
    setCallout((current) => {
      if (
        current &&
        Math.abs(current.x - place.x) < 0.5 &&
        Math.abs(current.y - place.y) < 0.5 &&
        Math.abs(current.toX - anchor.x) < 0.5 &&
        Math.abs(current.toY - anchor.y) < 0.5
      ) {
        return current;
      }
      return { x: place.x, y: place.y, fromX, fromY, toX: anchor.x, toY: anchor.y };
    });
  }, [dimensionState, placed, selectedEdgeId, selectedItem, view]);

  return (
    <div ref={wrapRef} className="relative flex h-full min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 text-[11px] text-muted-foreground">
        <span>Arraste a peça, a borda, o furo, a cuba ou a cota. Duplo clique na cota oculta. Snap {5} mm.</span>
        <span className="border border-border bg-muted px-2 py-0.5 font-mono text-foreground">{zoomLabel}</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none bg-[#121418]"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        <StoneDefs />
        <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="#121418" />
        <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="url(#mm-grid-major)" />
        <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="url(#mm-grid)" />
        {callout && (
          <line
            x1={callout.fromX}
            y1={callout.fromY}
            x2={callout.toX}
            y2={callout.toY}
            stroke="#f97316"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />
        )}
        {placed.map((item) => {
          const selected = item.part.id === selectedPartId;
          const box = boundsOf(item.part.outerContour);
          const showCode = px(box.width, mmPerPx) >= 72 && px(box.height, mmPerPx) >= 22;
          const showSize = px(box.width, mmPerPx) >= 110 && px(box.height, mmPerPx) >= 42;
          return (
            <g key={item.part.id} transform={`translate(${item.xMm} ${item.yMm})`}>
              <path
                d={`${toPath(item.part.outerContour)} ${item.part.innerContours.map((opening) => toPath(opening.points)).join(' ')}`}
                fill="url(#calacatta)"
                fillRule="evenodd"
                stroke="#2c2825"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              {item.part.innerContours.map((opening) => (
                <SinkCut key={opening.id} opening={opening} mmPerPx={mmPerPx} />
              ))}
              {item.part.holes.map((hole) => (
                <HoleMark key={hole.id} hole={hole} mmPerPx={mmPerPx} showText={px(box.height, mmPerPx) >= 90} />
              ))}
              {item.part.edges.map((edge) => {
                const a = item.part.outerContour[edge.startIndex];
                const b = item.part.outerContour[edge.endIndex];
                if (!a || !b) return null;
                return (
                  <EdgeFinishMark
                    key={edge.id}
                    a={a}
                    b={b}
                    finish={edge.finish}
                    mmPerPx={mmPerPx}
                    active={selected && selectedEdgeId === edge.id}
                  />
                );
              })}
              {showCode && (
                <text
                  x={14 * mmPerPx}
                  y={16 * mmPerPx}
                  fill="#292524"
                  fontSize={12 * mmPerPx}
                  fontFamily="ui-monospace, monospace"
                  style={{ pointerEvents: 'none' }}
                >
                  {item.part.partCode}
                </text>
              )}
              {showSize && <LiveDimensions part={item.part} mmPerPx={mmPerPx} />}
            </g>
          );
        })}
        {selectedItem &&
          selectedItem.part.edges.map((edge) => {
            const state = dimensionOverride(selectedItem.part.id, edge.id);
            if (!state.visible) return null;
            const a = selectedItem.part.outerContour[edge.startIndex];
            const b = selectedItem.part.outerContour[edge.endIndex];
            if (!a || !b) return null;
            return (
              <EdgeDimension
                key={edge.id}
                a={{ x: a.x + selectedItem.xMm, y: a.y + selectedItem.yMm }}
                b={{ x: b.x + selectedItem.xMm, y: b.y + selectedItem.yMm }}
                offsetMm={shownOffset(selectedItem, edge.id, state.offsetMm)}
                mmPerPx={mmPerPx}
                active={selectedEdgeId === edge.id}
              />
            );
          })}
      </svg>
      {selectedItem && (
        <div
          ref={cardRef}
          className="pointer-events-none absolute z-20 w-[232px] border border-primary/55 bg-[#16181e] px-3 py-2 text-[11px] text-zinc-200 shadow-[0_10px_28px_rgba(0,0,0,0.45)]"
          style={{ left: callout?.x ?? 0, top: callout?.y ?? 0, visibility: callout ? 'visible' : 'hidden' }}
        >
          <p className="font-mono text-xs font-semibold text-primary">{selectedItem.part.partCode}</p>
          <p className="mt-0.5 text-zinc-100">{selectedItem.part.name}</p>
          {calloutRows(selectedItem.part, selectedEdgeId).map((row) => (
            <p key={row.label} className="mt-1 flex justify-between gap-3 text-zinc-400">
              <span>{row.label}</span>
              <span className="font-mono text-zinc-100">
                {row.prefix}
                <MaskedText mask="mm" unit="mm" value={row.value} />
                {row.extra ? <span> {row.extra}</span> : null}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

interface Callout {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface CalloutRow {
  label: string;
  value: number;
  prefix?: string;
  extra?: string;
}

const finishName: Record<EdgeFinishType, string> = {
  raw: 'Corte bruto',
  straight_polish: 'Polimento reto',
  miter_45: '45°',
  bullnose: 'Boleado',
  half_bullnose: 'Meia-cana',
  bevel: 'Bisotê',
  italian_recess: 'Rebaixo italiano',
  american_recess: 'Rebaixo americano',
};

function px(mm: number, mmPerPx: number) {
  return mm / Math.max(mmPerPx, 0.001);
}

function nearestOnRect(
  px: number,
  py: number,
  rect: { l: number; t: number; r: number; b: number },
) {
  const inside = px > rect.l && px < rect.r && py > rect.t && py < rect.b;
  if (!inside) {
    return {
      x: Math.max(rect.l, Math.min(px, rect.r)),
      y: Math.max(rect.t, Math.min(py, rect.b)),
    };
  }
  const edges = [
    { x: px, y: rect.t, dist: py - rect.t },
    { x: px, y: rect.b, dist: rect.b - py },
    { x: rect.l, y: py, dist: px - rect.l },
    { x: rect.r, y: py, dist: rect.r - px },
  ];
  edges.sort((a, b) => a.dist - b.dist);
  return edges[0];
}

function firstClear(
  x: number,
  startY: number,
  step: number,
  width: number,
  height: number,
  limit: { l: number; t: number; r: number; b: number },
  boxes: { l: number; t: number; r: number; b: number }[],
) {
  const maxY = limit.b - height;
  let y = Math.max(limit.t, Math.min(startY, maxY));
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const rect = { l: x, t: y, r: x + width, b: y + height };
    const clear = boxes.every((box) => overlapArea(rect, { l: box.l - 10, t: box.t - 10, r: box.r + 10, b: box.b + 10 }) === 0);
    if (clear) return { x, y };
    const next = y + step;
    if (next < limit.t || next > maxY) return null;
    y = next;
  }
  return null;
}

function overlapArea(a: { l: number; t: number; r: number; b: number }, b: { l: number; t: number; r: number; b: number }) {
  const width = Math.min(a.r, b.r) - Math.max(a.l, b.l);
  const height = Math.min(a.b, b.b) - Math.max(a.t, b.t);
  return width > 0 && height > 0 ? width * height : 0;
}

function toWorld(svg: SVGSVGElement, matrix: DOMMatrix, origin: DOMRect, x: number, y: number): Point2D {
  const point = svg.createSVGPoint();
  point.x = origin.left + x;
  point.y = origin.top + y;
  const world = point.matrixTransform(matrix.inverse());
  return { x: world.x, y: world.y };
}

function calloutRows(part: Part, selectedEdgeId: string | null): CalloutRow[] {
  const box = boundsOf(part.outerContour);
  const rows: CalloutRow[] = [
    { label: 'Largura', value: Math.round(box.width) },
    { label: 'Profundidade', value: Math.round(box.height) },
    { label: 'Espessura', value: part.thicknessMm },
  ];
  for (const opening of part.innerContours) {
    rows.push({
      label: opening.label ?? 'Recorte',
      value: Math.round(opening.widthMm),
      extra: `× ${Math.round(opening.heightMm)} mm`,
    });
  }
  for (const hole of part.holes) {
    rows.push({ label: hole.label ?? 'Furo', value: hole.diameterMm, prefix: 'Ø ' });
  }
  const edge = part.edges.find((item) => item.id === selectedEdgeId);
  if (edge) rows.push({ label: finishName[edge.finish], value: Math.round(edge.lengthMm) });
  return rows;
}

function finishColor(finish: EdgeFinishType) {
  if (finish === 'raw') return '#78716c';
  if (finish === 'miter_45') return '#c2410c';
  if (finish === 'bevel') return '#44403c';
  if (finish === 'bullnose' || finish === 'half_bullnose') return '#292524';
  if (finish === 'italian_recess' || finish === 'american_recess') return '#9a3412';
  return '#1c1917';
}

function EdgeFinishMark({
  a,
  b,
  finish,
  mmPerPx,
  active,
}: {
  a: Point2D;
  b: Point2D;
  finish: EdgeFinishType;
  mmPerPx: number;
  active: boolean;
}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const color = active ? '#f97316' : finishColor(finish);
  const line = {
    stroke: color,
    fill: 'none' as const,
    vectorEffect: 'non-scaling-stroke' as const,
    style: { pointerEvents: 'none' as const },
  };
  const inner = 9 * mmPerPx;
  const ix1 = a.x + nx * inner;
  const iy1 = a.y + ny * inner;
  const ix2 = b.x + nx * inner;
  const iy2 = b.y + ny * inner;

  if (finish === 'raw') {
    return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={2} strokeDasharray={`${9 * mmPerPx} ${6 * mmPerPx}`} {...line} />;
  }
  if (finish === 'miter_45') {
    return (
      <g style={{ pointerEvents: 'none' }}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1.7} {...line} />
        <line x1={ix1} y1={iy1} x2={ix2} y2={iy2} strokeWidth={1} {...line} />
        {edgeTicks(a, b, nx, ny, mmPerPx, color)}
      </g>
    );
  }
  if (finish === 'bullnose') {
    return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={4.5} strokeLinecap="round" {...line} />;
  }
  if (finish === 'half_bullnose') {
    return (
      <g style={{ pointerEvents: 'none' }}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={2.6} strokeLinecap="round" {...line} />
        <line x1={ix1} y1={iy1} x2={ix2} y2={iy2} strokeWidth={1} {...line} />
      </g>
    );
  }
  if (finish === 'bevel') {
    return (
      <g style={{ pointerEvents: 'none' }}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1.4} {...line} />
        {edgeTicks(a, b, nx, ny, mmPerPx, color)}
      </g>
    );
  }
  if (finish === 'italian_recess' || finish === 'american_recess') {
    const deep = (finish === 'american_recess' ? 7 : 4.2) * mmPerPx;
    return (
      <g style={{ pointerEvents: 'none' }}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1.3} {...line} />
        <line x1={a.x + nx * deep} y1={a.y + ny * deep} x2={b.x + nx * deep} y2={b.y + ny * deep} strokeWidth={1.4} {...line} />
      </g>
    );
  }
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1.8} {...line} />;
}

function edgeTicks(a: Point2D, b: Point2D, nx: number, ny: number, mmPerPx: number, color: string) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const count = Math.max(2, Math.floor(length / (18 * mmPerPx)));
  const size = 9 * mmPerPx;
  return Array.from({ length: count - 1 }, (_, index) => {
    const t = (index + 1) / count;
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    return (
      <line
        key={index}
        x1={x}
        y1={y}
        x2={x + nx * size + (dx / length) * size}
        y2={y + ny * size + (dy / length) * size}
        stroke={color}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: 'none' }}
      />
    );
  });
}

function EdgeDimension({
  a,
  b,
  offsetMm,
  mmPerPx,
  active,
}: {
  a: Point2D;
  b: Point2D;
  offsetMm: number;
  mmPerPx: number;
  active: boolean;
}) {
  const line = dimensionLine(a, b, offsetMm);
  const over = 7 * mmPerPx;
  const gap = 3 * mmPerPx;
  const ext = (point: Point2D) => ({
    x: point.x + line.normal.x * (offsetMm + over),
    y: point.y + line.normal.y * (offsetMm + over),
  });
  const from = (point: Point2D) => ({
    x: point.x + line.normal.x * gap,
    y: point.y + line.normal.y * gap,
  });
  const mid = {
    x: (line.start.x + line.end.x) / 2 + line.normal.x * 10 * mmPerPx,
    y: (line.start.y + line.end.y) / 2 + line.normal.y * 10 * mmPerPx,
  };
  let angle = (Math.atan2(line.end.y - line.start.y, line.end.x - line.start.x) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  const tick = 5 * mmPerPx;
  const rad = ((angle + 45) * Math.PI) / 180;
  const color = active ? '#f97316' : '#d6d3d1';
  const startExt = from(a);
  const endExt = from(b);
  const startFar = ext(a);
  const endFar = ext(b);
  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={startExt.x} y1={startExt.y} x2={startFar.x} y2={startFar.y} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1={endExt.x} y1={endExt.y} x2={endFar.x} y2={endFar.y} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y} stroke={color} strokeWidth={active ? 1.5 : 1} vectorEffect="non-scaling-stroke" />
      <line
        x1={line.start.x - Math.cos(rad) * tick}
        y1={line.start.y - Math.sin(rad) * tick}
        x2={line.start.x + Math.cos(rad) * tick}
        y2={line.start.y + Math.sin(rad) * tick}
        stroke={color}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={line.end.x - Math.cos(rad) * tick}
        y1={line.end.y - Math.sin(rad) * tick}
        x2={line.end.x + Math.cos(rad) * tick}
        y2={line.end.y + Math.sin(rad) * tick}
        stroke={color}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={mid.x}
        y={mid.y}
        fill="#f5f5f4"
        fontSize={11 * mmPerPx}
        fontFamily="ui-monospace, monospace"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${angle} ${mid.x} ${mid.y})`}
      >
        {line.lengthMm} mm
      </text>
    </g>
  );
}

function LiveDimensions({ part, mmPerPx }: { part: Part; mmPerPx: number }) {
  const font = 12 * mmPerPx;
  const box = boundsOf(part.outerContour);
  return (
    <text
      x={14 * mmPerPx}
      y={32 * mmPerPx}
      fill="#44403c"
      fontSize={font}
      fontFamily="ui-monospace, monospace"
      style={{ pointerEvents: 'none' }}
    >
      {Math.round(box.width)} × {Math.round(box.height)}
    </text>
  );
}

function SinkCut({ opening, mmPerPx }: { opening: InnerContour; mmPerPx: number }) {
  const box = boundsOf(opening.points);
  const lip = Math.min(22, box.width * 0.04, box.height * 0.04);
  const font = 12 * mmPerPx;
  const showText = px(box.width, mmPerPx) >= 88 && px(box.height, mmPerPx) >= 48;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={toPath(opening.points)} fill="#241f1b" stroke="#d6cfc6" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      <rect
        x={box.minX + lip}
        y={box.minY + lip}
        width={Math.max(8, box.width - lip * 2)}
        height={Math.max(8, box.height - lip * 2)}
        fill="#161311"
        stroke="#6b625b"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={box.minX + box.width / 2} cy={box.minY + box.height * 0.62} r={Math.max(6, Math.min(box.width, box.height) * 0.045)} fill="#0c0b0a" stroke="#a8a29e" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {showText && (
        <text
          x={box.minX + box.width / 2}
          y={box.minY + box.height * 0.38}
          fill="#e7e5e4"
          fontSize={font}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
        >
          {Math.round(opening.widthMm)} × {Math.round(opening.heightMm)}
        </text>
      )}
    </g>
  );
}

function HoleMark({ hole, mmPerPx, showText }: { hole: { center: Point2D; diameterMm: number }; mmPerPx: number; showText: boolean }) {
  const arm = 7 * mmPerPx;
  const font = 12 * mmPerPx;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={hole.center.x} cy={hole.center.y} r={hole.diameterMm / 2} fill="#121418" stroke="#f97316" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      <line x1={hole.center.x - arm} y1={hole.center.y} x2={hole.center.x + arm} y2={hole.center.y} stroke="#f97316" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <line x1={hole.center.x} y1={hole.center.y - arm} x2={hole.center.x} y2={hole.center.y + arm} stroke="#f97316" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {showText && (
        <text x={hole.center.x + arm + 4 * mmPerPx} y={hole.center.y - 4 * mmPerPx} fill="#f97316" fontSize={font} fontFamily="ui-monospace, monospace">
          Ø {hole.diameterMm}
        </text>
      )}
    </g>
  );
}

function StoneDefs() {
  return (
    <defs>
      <pattern id="mm-grid" width="100" height="100" patternUnits="userSpaceOnUse">
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#ffffff" strokeOpacity="0.035" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </pattern>
      <pattern id="mm-grid-major" width="500" height="500" patternUnits="userSpaceOnUse">
        <path d="M 500 0 L 0 0 0 500" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </pattern>
      <pattern id="calacatta" width="1800" height="1100" patternUnits="userSpaceOnUse">
        <rect width="1800" height="1100" fill="#f3ebe1" />
        <path d="M-40 140 C 80 90, 120 220, 40 310 C -20 390, 90 470, 60 620" fill="none" stroke="#6d655d" strokeWidth="4" opacity="0.55" />
        <path d="M180 0 C 240 160, 90 240, 210 420 C 300 560, 140 640, 250 860 C 310 980, 180 1040, 260 1120" fill="none" stroke="#cfc4b6" strokeWidth="18" opacity="0.8" />
        <path d="M520 40 C 480 180, 640 220, 560 380 C 470 560, 700 600, 610 820" fill="none" stroke="#3e3934" strokeWidth="2" opacity="0.4" />
        <path d="M860 200 C 980 160, 1040 280, 960 340 C 860 420, 1100 390, 1180 300" fill="none" stroke="#8a8178" strokeWidth="6" opacity="0.35" />
        <path d="M1280 80 C 1220 260, 1400 320, 1320 520 C 1240 720, 1460 780, 1360 980" fill="none" stroke="#b3a89c" strokeWidth="11" opacity="0.5" />
        <path d="M1500 640 C 1620 700, 1580 860, 1720 900" fill="none" stroke="#4f4943" strokeWidth="3" opacity="0.4" />
        <ellipse cx="700" cy="140" rx="70" ry="18" fill="#fffaf5" opacity="0.55" />
        <ellipse cx="1040" cy="760" rx="110" ry="26" fill="#e7dcd0" opacity="0.4" />
      </pattern>
    </defs>
  );
}
