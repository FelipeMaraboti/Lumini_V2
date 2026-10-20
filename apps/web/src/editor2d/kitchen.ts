import type { Part } from '@lumini/geometry-core';

export interface PlacedPart {
  xMm: number;
  yMm: number;
  part: Part;
}

const material = {
  materialId: 'mat-quartz-calacatta',
  materialName: 'Quartzito Calacatta Prime',
  thicknessMm: 20,
};

export function initialKitchen(): PlacedPart[] {
  return [
    {
      xMm: 0,
      yMm: 0,
      part: {
        id: 'part-2',
        partCode: 'FR-01',
        name: 'Frontão Traseiro de Parede',
        ...material,
        outerContour: [
          { x: 0, y: 0 },
          { x: 2600, y: 0 },
          { x: 2600, y: 150 },
          { x: 0, y: 150 },
        ],
        edges: [
          { id: 'fe1', startIndex: 0, endIndex: 1, lengthMm: 2600, finish: 'raw', notes: 'Encontro com a bancada' },
          { id: 'fe2', startIndex: 1, endIndex: 2, lengthMm: 150, finish: 'straight_polish' },
          { id: 'fe3', startIndex: 2, endIndex: 3, lengthMm: 2600, finish: 'straight_polish', notes: 'Borda superior visível' },
          { id: 'fe4', startIndex: 3, endIndex: 0, lengthMm: 150, finish: 'straight_polish' },
        ],
        holes: [],
        innerContours: [],
      },
    },
    {
      xMm: 0,
      yMm: 220,
      part: {
        id: 'part-1',
        partCode: 'BC-01',
        name: 'Bancada Cozinha Gourmet',
        ...material,
        outerContour: [
          { x: 0, y: 0 },
          { x: 2600, y: 0 },
          { x: 2600, y: 650 },
          { x: 0, y: 650 },
        ],
        edges: [
          { id: 'e1', startIndex: 0, endIndex: 1, lengthMm: 2600, finish: 'raw', notes: 'Parede de fundo' },
          { id: 'e2', startIndex: 1, endIndex: 2, lengthMm: 650, finish: 'miter_45', skirtHeightMm: 40, notes: 'Lateral direita com saia 40 mm' },
          { id: 'e3', startIndex: 2, endIndex: 3, lengthMm: 2600, finish: 'miter_45', skirtHeightMm: 40, notes: 'Frente com saia 40 mm 45°' },
          { id: 'e4', startIndex: 3, endIndex: 0, lengthMm: 650, finish: 'straight_polish', notes: 'Lateral livre polida' },
        ],
        holes: [{ id: 'h1', kind: 'faucet', center: { x: 1300, y: 80 }, diameterMm: 35, label: 'Furo monocomando' }],
        innerContours: [
          {
            id: 'c1',
            kind: 'undermount_sink',
            widthMm: 600,
            heightMm: 450,
            clearanceMm: 15,
            points: [
              { x: 1000, y: 140 },
              { x: 1600, y: 140 },
              { x: 1600, y: 590 },
              { x: 1000, y: 590 },
            ],
            label: 'Cuba Tramontina',
          },
        ],
      },
    },
    {
      xMm: 0,
      yMm: 940,
      part: {
        id: 'part-3',
        partCode: 'SA-01',
        name: 'Saia Frontal Meia-Esquadria 45°',
        ...material,
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
      },
    },
  ];
}
