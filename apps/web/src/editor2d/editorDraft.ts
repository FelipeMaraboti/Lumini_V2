import type { DimensionOverride } from './PieceEditor';
import type { PlacedPart } from './kitchen';

const DATABASE_NAME = 'lumini-editor-drafts';
const DATABASE_VERSION = 1;
const STORE_NAME = 'drafts';

export interface EditorDraft {
  schemaVersion: 1;
  savedAt: string;
  placed: PlacedPart[];
  dimensionState: Record<string, DimensionOverride>;
  projectId?: string;
  revisionId?: string;
  syncedVersion?: number | null;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o banco local.'));
  });
}

export async function readEditorDraft(key: string): Promise<EditorDraft | null> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
      request.onsuccess = () => {
        const draft = request.result as EditorDraft | undefined;
        if (
          !draft ||
          draft.schemaVersion !== 1 ||
          !Array.isArray(draft.placed) ||
          typeof draft.dimensionState !== 'object' ||
          draft.dimensionState === null
        ) {
          resolve(null);
          return;
        }
        resolve(draft);
      };
      request.onerror = () => reject(request.error ?? new Error('Não foi possível ler o rascunho local.'));
    });
  } finally {
    database.close();
  }
}

export async function writeEditorDraft(key: string, draft: EditorDraft): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(draft, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Não foi possível salvar o rascunho local.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('O salvamento do rascunho foi cancelado.'));
    });
  } finally {
    database.close();
  }
}

export async function deleteEditorDraft(key: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Não foi possível descartar o rascunho local.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('A exclusão do rascunho foi cancelada.'));
    });
  } finally {
    database.close();
  }
}