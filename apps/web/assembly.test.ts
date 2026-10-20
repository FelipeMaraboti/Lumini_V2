import assert from 'node:assert/strict';
import { boundsOf, polygonAreaMm2 } from '../../packages/geometry-core/src/edit.ts';
import type { Part } from '../../packages/geometry-core/src/index.ts';
import { assemblyRole, edgeBands, layoutAssembly, spanMm, stoneSurface } from './src/editor3d/assembly.ts';

function part(id: string, code: string, width: number, height: number): Part {
  return {
    id,
    partCode: code,
    name: code,
    materialId: 'm',
    materialName: 'Quartzito',
    thicknessMm: 20,
    outerContour: [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
    edges: [],
    holes: [],
    innerContours: [],
  };
}

const placed = [
  { xMm: 0, part: part('splash', 'FR-01', 2600, 150) },
  { xMm: 0, part: part('top', 'BC-01', 2600, 650) },
  { xMm: 0, part: part('skirt', 'SA-01', 2600, 40) },
];
const poses = layoutAssembly(placed);
const counter = placed[1].part;
const splash = placed[0].part;
const skirt = placed[2].part;

assert.equal(assemblyRole(counter), 'top');
assert.equal(assemblyRole(splash), 'splash');
assert.equal(assemblyRole(skirt), 'skirt');

const counterPose = poses[counter.id];
const splashPose = poses[splash.id];
const skirtPose = poses[skirt.id];
assert.equal(counterPose.position[1], 0);
assert.equal(counterPose.rotation[0], -Math.PI / 2);
assert.equal(counterPose.position[1] + counter.thicknessMm, 20);

assert.equal(splashPose.position[1], counter.thicknessMm);
assert.equal(splashPose.position[2], -splash.thicknessMm);
assert.equal(splashPose.position[1] + boundsOf(splash.outerContour).height, 170);

const skirtBox = boundsOf(skirt.outerContour);
assert.equal(skirtPose.rotation[0], Math.PI);
assert.equal(skirtPose.position[1] - skirtBox.minY, 0);
assert.equal(skirtPose.position[1] - skirtBox.maxY, -skirtBox.height);
assert.equal(skirtPose.position[2], -boundsOf(counter.outerContour).height + counter.thicknessMm * 2);

const profiled = {
  ...counter,
  edges: [
    { id: 'e1', startIndex: 0, endIndex: 1, lengthMm: 2600, finish: 'raw' as const },
    { id: 'e2', startIndex: 1, endIndex: 2, lengthMm: 650, finish: 'miter_45' as const, skirtHeightMm: 40 },
    { id: 'e3', startIndex: 2, endIndex: 3, lengthMm: 2600, finish: 'miter_45' as const, skirtHeightMm: 40 },
    { id: 'e4', startIndex: 3, endIndex: 0, lengthMm: 650, finish: 'straight_polish' as const },
  ],
};
const cut = edgeBands(profiled);
const covered = polygonAreaMm2(cut.body) + cut.bands.reduce((sum, band) => sum + polygonAreaMm2([band.outerStart, band.outerEnd, band.innerEnd, band.innerStart]), 0);
assert.equal(Math.round(covered), 2600 * 650);
assert.equal(cut.bands.length, 2);

assert.equal(spanMm([0, 0, 0], [2600, 0, 0]), 2600);
assert.equal(spanMm([0, 20, 0], [0, 20, -650]), 650);
assert.equal(stoneSurface({ ...counter, edges: [{ id: 'a', startIndex: 0, endIndex: 1, lengthMm: 1, finish: 'straight_polish' }] }), 'polished');
assert.equal(stoneSurface({ ...counter, edges: [{ id: 'a', startIndex: 0, endIndex: 1, lengthMm: 1, finish: 'raw' }] }), 'brushed');

console.log('assembly 3d ok');
