import assert from 'node:assert/strict';
import { addHole, addOvalSink, addSink, boundsOf, dimensionLine, dragEdge, dragOpeningEdge, hasSelfIntersection, lPart, moveHole, moveOpening, netAreaMm2, polygonPart, rectanglePart, STONE_MARGIN_MM } from './src/edit.ts';

const counter = {
  id: 'part-1',
  partCode: 'BC-01',
  name: 'Bancada',
  materialId: 'mat',
  materialName: 'Quartzito',
  thicknessMm: 20,
  outerContour: [
    { x: 0, y: 0 },
    { x: 2600, y: 0 },
    { x: 2600, y: 650 },
    { x: 0, y: 650 },
  ],
  edges: [
    { id: 'e1', startIndex: 0, endIndex: 1, lengthMm: 2600, finish: 'raw' as const },
    { id: 'e2', startIndex: 1, endIndex: 2, lengthMm: 650, finish: 'miter_45' as const },
    { id: 'e3', startIndex: 2, endIndex: 3, lengthMm: 2600, finish: 'miter_45' as const },
    { id: 'e4', startIndex: 3, endIndex: 0, lengthMm: 650, finish: 'straight_polish' as const },
  ],
  holes: [{ id: 'h1', kind: 'faucet' as const, center: { x: 1300, y: 80 }, diameterMm: 35 }],
  innerContours: [
    {
      id: 'c1',
      kind: 'undermount_sink' as const,
      widthMm: 600,
      heightMm: 450,
      points: [
        { x: 1000, y: 140 },
        { x: 1600, y: 140 },
        { x: 1600, y: 590 },
        { x: 1000, y: 590 },
      ],
    },
  ],
};

const deeper = dragEdge(counter, 'e3', 100);
assert.equal(boundsOf(deeper.outerContour).height, 750);
assert.equal(deeper.edges.find((edge) => edge.id === 'e2')?.lengthMm, 750);

const blocked = dragEdge(counter, 'e3', -200);
assert.ok(boundsOf(blocked.outerContour).height >= 605);
assert.ok(boundsOf(blocked.innerContours[0].points).maxY <= boundsOf(blocked.outerContour).maxY - 15);

const hole = moveHole(counter, 'h1', 10, 10);
assert.ok(hole.holes[0].center.x > 30);
assert.ok(hole.holes[0].center.y > 30);

const opening = moveOpening(counter, 'c1', 400, 0);
assert.equal(boundsOf(opening.innerContours[0].points).minX, 1400);

const wider = dragOpeningEdge(counter, 'c1', 1, 50);
assert.equal(wider.innerContours[0].widthMm, 650);

assert.equal(netAreaMm2(counter), 2600 * 650 - 600 * 450);

const blank = { id: 'n', partCode: 'PC-01', name: 'Peça', materialId: 'm', materialName: 'Rocha', thicknessMm: 20 };
const rect = rectanglePart(blank, 1200, 600);
assert.equal(boundsOf(rect.outerContour).width, 1200);
const ell = lPart(blank, 1800, 1400, 600);
assert.equal(hasSelfIntersection(ell.outerContour), false);
assert.equal(hasSelfIntersection([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }]), true);
const withHole = addHole(rect, 35);
assert.ok(withHole);
const withSink = addSink(rect);
assert.ok(withSink && withSink.innerContours[0].widthMm === 500);
const withOvalSink = addOvalSink(rect);
assert.ok(withOvalSink);
assert.equal(withOvalSink.innerContours[0].widthMm, 500);
assert.equal(withOvalSink.innerContours[0].heightMm, 350);
assert.equal(withOvalSink.innerContours[0].points.length, 64);
assert.equal(hasSelfIntersection(withOvalSink.innerContours[0].points), false);
assert.ok(withOvalSink.innerContours[0].points.every((point) =>
  point.x >= STONE_MARGIN_MM && point.x <= 1200 - STONE_MARGIN_MM &&
  point.y >= STONE_MARGIN_MM && point.y <= 600 - STONE_MARGIN_MM,
));
const customOutline = polygonPart(blank, [
  { x: 200, y: 100 }, { x: 1400, y: 100 }, { x: 1400, y: 500 },
  { x: 800, y: 500 }, { x: 800, y: 900 }, { x: 200, y: 900 },
]);
assert.ok(customOutline);
assert.equal(customOutline.outerContour.length, 6);
assert.equal(boundsOf(customOutline.outerContour).width, 1200);
assert.equal(boundsOf(customOutline.outerContour).height, 800);
assert.equal(polygonPart(blank, [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 100, y: 0 }]), null);

const top = dimensionLine({ x: 0, y: 0 }, { x: 2600, y: 0 }, 80);
assert.equal(top.lengthMm, 2600);
assert.ok(top.start.y < 0 && top.end.y < 0);
const right = dimensionLine({ x: 2600, y: 0 }, { x: 2600, y: 650 }, 80);
assert.ok(right.start.x > 2600 && right.end.x > 2600);
const notch = dimensionLine({ x: 1800, y: 600 }, { x: 600, y: 600 }, 80);
assert.ok(notch.start.y > 600);

console.log('geometry edit ok');
