import type { DimensionOverride } from '@/editor2d/PieceEditor';
import type { PlacedPart } from '@/editor2d/kitchen';
import { apiRequest } from '@/services/apiClient';

export interface DrawingProject {
  id: string;
  code: string;
  name: string;
  currentRevisionId: string | null;
  revisionNumber: number | null;
  revisionStatus: string | null;
  status: string;
}

export interface DrawingRevision {
  id: string;
  projectId: string;
  revisionNumber: number;
  status: string;
  snapshotJson: string;
  version: number;
}

export interface DrawingSnapshot {
  schemaVersion: 1;
  placed: PlacedPart[];
  dimensionState: Record<string, DimensionOverride>;
}

export function parseDrawingSnapshot(snapshotJson: string): DrawingSnapshot {
  if (!snapshotJson || snapshotJson === '{}') {
    return { schemaVersion: 1, placed: [], dimensionState: {} };
  }

  const value: unknown = JSON.parse(snapshotJson);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('O snapshot da revisão não tem um formato de desenho reconhecido.');
  }

  const snapshot = value as Partial<DrawingSnapshot>;
  if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.placed) || !snapshot.dimensionState || typeof snapshot.dimensionState !== 'object') {
    throw new Error('A versão do desenho desta revisão não é compatível com este editor.');
  }

  return snapshot as DrawingSnapshot;
}

export async function loadDrawingProject(projectId: string) {
  const [projectResponse, revisionsResponse] = await Promise.all([
    apiRequest<DrawingProject>(`/projects/${projectId}`),
    apiRequest<DrawingRevision[]>(`/projects/${projectId}/revisions`),
  ]);
  const project = projectResponse.data;
  const revision = revisionsResponse.data.find((item) => item.id === project.currentRevisionId);
  if (!revision) throw new Error('O projeto ainda não possui uma revisão atual.');
  if (revision.projectId !== project.id) throw new Error('A revisão atual não pertence a este projeto.');

  return { project, revision, snapshot: parseDrawingSnapshot(revision.snapshotJson) };
}

export async function saveDrawingSnapshot(revisionId: string, version: number, snapshot: DrawingSnapshot) {
  return apiRequest<DrawingRevision>(`/projects/revisions/${revisionId}/snapshot`, {
    method: 'PUT',
    etag: String(version),
    body: JSON.stringify({ snapshotJson: JSON.stringify(snapshot) }),
  });
}
