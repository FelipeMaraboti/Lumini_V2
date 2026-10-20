import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
import { boundsOf, type Part, type Point2D } from '@lumini/geometry-core';
import { MaskedText } from '@/components/ui/MaskedText';
import type { PlacedPart } from '@/editor2d/kitchen';
import { edgeBands, layoutAssembly, spanMm, stoneSurface, type AssemblyPose, type AssemblyRole, type EdgeBand } from './assembly';

type Mark = [number, number, number];

interface AssemblyViewProps {
  placed: PlacedPart[];
  selectedPartId: string;
  onSelectPart: (partId: string) => void;
}

export function AssemblyView({ placed, selectedPartId, onSelectPart }: AssemblyViewProps) {
  const poses = useMemo(() => layoutAssembly(placed), [placed]);
  const selected = placed.find((item) => item.part.id === selectedPartId) ?? placed[0];
  const selectedBox = selected ? boundsOf(selected.part.outerContour) : null;
  const [measuring, setMeasuring] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const distance = marks.length === 2 ? spanMm(marks[0], marks[1]) : null;

  function markPoint(point: Mark) {
    setMarks((current) => (current.length >= 2 ? [point] : [...current, point]));
  }

  return (
    <div className="relative h-full min-h-0 flex-1 bg-[#121418]">
      <Canvas
        camera={{ position: [2200, 680, -1760], fov: 32, near: 1, far: 20000 }}
        gl={{ antialias: true }}
        onPointerMissed={() => undefined}
      >
        <color attach="background" args={['#121418']} />
        <ambientLight intensity={0.62} />
        <directionalLight position={[900, 1600, 1400]} intensity={1.35} />
        <directionalLight position={[-700, 500, -400]} intensity={0.28} />
        {placed.map((item) => {
          const pose = poses[item.part.id];
          if (!pose) return null;
          return (
            <StonePiece
              key={item.part.id}
              part={item.part}
              pose={pose}
              selected={item.part.id === selectedPartId}
              measuring={measuring}
              onSelect={onSelectPart}
              onMark={markPoint}
            />
          );
        })}
        <RulerMarks marks={marks} />
        <gridHelper args={[8000, 80, '#3f3f46', '#27272a']} position={[1300, -48, -320]} />
        <OrbitRig measuring={measuring} />
      </Canvas>
      <div className="absolute left-3 top-3 border border-zinc-700 bg-[#16181e]/90 px-3 py-2 text-[11px] text-zinc-300">
        <div className="flex items-center gap-2">
          <p className="pointer-events-none">{measuring ? 'Clique dois pontos na pedra. O botão direito gira a vista.' : 'Arraste para girar. Scroll aproxima. Clique na pedra para selecionar.'}</p>
          <button
            type="button"
            onClick={() => {
              setMeasuring((current) => !current);
              setMarks([]);
            }}
            className={`border px-2 py-0.5 font-mono text-[10px] ${measuring ? 'border-primary/60 bg-primary/10 text-primary' : 'border-zinc-600 text-zinc-200'}`}
          >
            Régua
          </button>
        </div>
        {selected && selectedBox && (
          <p className="pointer-events-none mt-1 font-mono text-zinc-100">
            {selected.part.partCode}{' '}
            <MaskedText mask="mm" unit="mm" value={Math.round(selectedBox.width)} />
            {' × '}
            <MaskedText mask="mm" unit="mm" value={Math.round(selectedBox.height)} />
            {' × '}
            <MaskedText mask="mm" unit="mm" value={selected.part.thicknessMm} />
          </p>
        )}
        {distance !== null && (
          <p className="pointer-events-none mt-1 font-mono text-primary">
            Distância <MaskedText mask="mm" unit="mm" value={distance} />
          </p>
        )}
      </div>
    </div>
  );
}

function OrbitRig({ measuring }: { measuring: boolean }) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const next = new OrbitControls(camera, gl.domElement);
    next.enableDamping = true;
    next.target.set(1200, 0, -340);
    next.update();
    controls.current = next;
    return () => next.dispose();
  }, [camera, gl]);

  useEffect(() => {
    const next = controls.current;
    if (!next) return;
    next.mouseButtons.LEFT = measuring ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    next.mouseButtons.RIGHT = measuring ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
  }, [measuring]);

  useFrame(() => controls.current?.update());
  return null;
}

function RulerMarks({ marks }: { marks: Mark[] }) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ color: '#f97316' });
    return new THREE.Line(geometry, material);
  }, []);

  useEffect(() => {
    const geometry = line.geometry;
    if (marks.length < 2) {
      geometry.setFromPoints([]);
      return;
    }
    geometry.setFromPoints(marks.map((mark) => new THREE.Vector3(mark[0], mark[1], mark[2])));
  }, [line, marks]);

  useEffect(() => () => {
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
  }, [line]);

  return (
    <group>
      <primitive object={line} />
      {marks.map((mark) => (
        <mesh key={mark.join(',')} position={mark}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
      ))}
    </group>
  );
}

function StonePiece({
  part,
  pose,
  selected,
  measuring,
  onSelect,
  onMark,
}: {
  part: Part;
  pose: AssemblyPose;
  selected: boolean;
  measuring: boolean;
  onSelect: (partId: string) => void;
  onMark: (point: Mark) => void;
}) {
  const cut = useMemo(() => (pose.role === 'top' ? edgeBands(part) : { body: part.outerContour, bands: [] as EdgeBand[] }), [part, pose.role]);
  const geometry = useMemo(() => stoneGeometry(cut.body, part, pose.role), [cut.body, part, pose.role]);
  const profiles = useMemo(
    () => (pose.role === 'top' ? cut.bands.flatMap((band) => bandGeometries(band, part.thicknessMm)) : []),
    [cut.bands, part.thicknessMm, pose.role],
  );
  const surface = stoneSurface(part);
  const texture = useMemo(() => calacattaTexture(), []);
  useEffect(() => () => {
    geometry.dispose();
    profiles.forEach((profile) => profile.dispose());
  }, [geometry, profiles]);

  function pick(event: { stopPropagation: () => void; point: { x: number; y: number; z: number } }) {
    event.stopPropagation();
    if (measuring) {
      onMark([event.point.x, event.point.y, event.point.z]);
      return;
    }
    onSelect(part.id);
  }

  return (
    <group position={pose.position} rotation={pose.rotation}>
      <mesh geometry={geometry} onClick={pick}>
        <StoneMaterial texture={texture} polished={surface === 'polished'} selected={selected} />
      </mesh>
      {profiles.map((profile) => (
        <mesh key={profile.uuid} geometry={profile} onClick={pick}>
          <StoneMaterial texture={null} polished={surface === 'polished'} selected={selected} flat />
        </mesh>
      ))}
    </group>
  );
}

function StoneMaterial({
  texture,
  polished,
  selected,
  flat = false,
}: {
  texture: THREE.CanvasTexture | null;
  polished: boolean;
  selected: boolean;
  flat?: boolean;
}) {
  return (
    <meshPhysicalMaterial
      color="#f4ece3"
      map={texture}
      flatShading={flat}
      roughness={flat ? 0.42 : polished ? 0.16 : 0.82}
      metalness={0.02}
      clearcoat={flat ? 0 : polished ? 0.45 : 0}
      clearcoatRoughness={0.16}
      emissive={selected ? '#f97316' : '#000000'}
      emissiveIntensity={selected ? 0.07 : 0}
    />
  );
}

let sharedStone: THREE.CanvasTexture | null | undefined;

function calacattaTexture() {
  if (sharedStone !== undefined) return sharedStone;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) {
    sharedStone = null;
    return null;
  }
  context.fillStyle = '#f4ece3';
  context.fillRect(0, 0, 1024, 1024);
  const random = mulberry32(42);
  for (let vein = 0; vein < 6; vein += 1) {
    context.beginPath();
    context.moveTo(random() * 1024, -20);
    context.bezierCurveTo(random() * 1024, 280, random() * 1024, 640, random() * 1024, 1060);
    context.strokeStyle = vein % 2 === 0 ? 'rgba(120, 108, 96, 0.28)' : 'rgba(255,255,255,0.35)';
    context.lineWidth = vein % 2 === 0 ? 2 : 8;
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / 700, 1 / 700);
  texture.anisotropy = 8;
  sharedStone = texture;
  return texture;
}

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function bandGeometries(band: EdgeBand, thickness: number) {
  return [loftBand(band, clockwise(sectionOf(band.finish, band.insetMm, thickness)))];
}

function sectionOf(finish: EdgeBand['finish'], inset: number, thickness: number): Array<[number, number]> {
  if (finish === 'miter_45') return [[0, thickness], [inset, thickness], [inset, 0]];
  if (finish === 'bevel') return [[0, 0], [inset, 0], [inset, thickness], [0, Math.max(0, thickness - inset)]];
  if (finish === 'bullnose') {
    const points: Array<[number, number]> = [];
    for (let step = 0; step <= 10; step += 1) {
      const angle = -Math.PI / 2 - (Math.PI * step) / 10;
      points.push([inset + inset * Math.cos(angle), inset + inset * Math.sin(angle)]);
    }
    return points;
  }
  if (finish === 'half_bullnose') {
    const points: Array<[number, number]> = [[0, 0], [inset, 0]];
    for (let step = 0; step <= 8; step += 1) {
      const angle = Math.PI / 2 + (Math.PI * step) / 16;
      points.push([inset + inset * Math.cos(angle), thickness - inset + inset * Math.sin(angle)]);
    }
    return points;
  }
  if (finish === 'italian_recess') {
    return [
      [0, 0],
      [inset, 0],
      [inset, thickness],
      [inset * 0.7, thickness],
      [inset * 0.7, thickness - 5],
      [inset * 0.28, thickness - 5],
      [inset * 0.28, thickness],
      [0, thickness],
    ];
  }
  return [
    [0, 0],
    [inset, 0],
    [inset, thickness],
    [inset * 0.45, thickness],
    [inset * 0.45, thickness * 0.62],
    [0, thickness * 0.62],
  ];
}

function clockwise(section: Array<[number, number]>) {
  let sum = 0;
  for (let index = 0; index < section.length; index += 1) {
    const [u1, h1] = section[index];
    const [u2, h2] = section[(index + 1) % section.length];
    sum += u1 * h2 - u2 * h1;
  }
  return sum > 0 ? [...section].reverse() : section;
}

function loftBand(band: EdgeBand, section: Array<[number, number]>) {
  const start = new THREE.Vector2(band.outerStart.x, band.outerStart.y);
  const end = new THREE.Vector2(band.outerEnd.x, band.outerEnd.y);
  const acrossStart = new THREE.Vector2(band.innerStart.x - band.outerStart.x, band.innerStart.y - band.outerStart.y);
  const acrossEnd = new THREE.Vector2(band.innerEnd.x - band.outerEnd.x, band.innerEnd.y - band.outerEnd.y);
  const positions: number[] = [];
  section.forEach(([inward, height]) => {
    const scale = band.insetMm > 0 ? inward / band.insetMm : 0;
    positions.push(start.x + acrossStart.x * scale, start.y + acrossStart.y * scale, height);
    positions.push(end.x + acrossEnd.x * scale, end.y + acrossEnd.y * scale, height);
  });
  const indices: number[] = [];
  const count = section.length;
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    const a = index * 2;
    const b = a + 1;
    const c = next * 2;
    const d = c + 1;
    indices.push(a, b, c, b, d, c);
  }
  for (let index = 1; index < count - 1; index += 1) {
    indices.push(0, index * 2, (index + 1) * 2);
    indices.push(1, (index + 1) * 2 + 1, index * 2 + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function stoneGeometry(points: Point2D[], part: Part, role: AssemblyRole) {
  const shape = new THREE.Shape();
  points.forEach((point, index) => {
    if (index === 0) shape.moveTo(point.x, point.y);
    else shape.lineTo(point.x, point.y);
  });
  if (role === 'top') {
    for (const opening of part.innerContours) {
      const hole = new THREE.Path();
      [...opening.points].reverse().forEach((point, index) => {
        if (index === 0) hole.moveTo(point.x, point.y);
        else hole.lineTo(point.x, point.y);
      });
      shape.holes.push(hole);
    }
    for (const cut of part.holes) {
      const hole = new THREE.Path();
      hole.absarc(cut.center.x, cut.center.y, cut.diameterMm / 2, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
  }
  return new THREE.ExtrudeGeometry(shape, { depth: part.thicknessMm, bevelEnabled: false, curveSegments: 20 });
}
