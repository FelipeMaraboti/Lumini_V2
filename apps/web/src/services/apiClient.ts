/**
 * Cliente HTTP tipado Lumini V2 com interceptors de rastreabilidade (Correlation ID),
 * concorrência otimista (ETag / If-Match) e taxonomia de erros RFC-7807/Lumini.
 */

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; code: string; message: string }>;
    correlationId: string;
    timestamp: string;
  };
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly correlationId: string;
  public readonly status: number;
  public readonly details?: Array<{ field: string; code: string; message: string }>;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.error.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.error.code;
    this.correlationId = payload.error.correlationId;
    this.details = payload.error.details;
  }
}

export interface RequestOptions extends RequestInit {
  etag?: string;
  token?: string;
}

export interface ApiResponse<T> {
  data: T;
  etag?: string;
  correlationId?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const correlationId = crypto.randomUUID();
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('X-Correlation-Id', correlationId);

  if (options.etag) {
    headers.set('If-Match', options.etag);
  }

  const token = options.token || localStorage.getItem('lumini_auth_token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const responseCorrelationId = response.headers.get('X-Correlation-Id') || correlationId;
  const responseEtag = response.headers.get('ETag') || undefined;

  if (!response.ok) {
    let errorPayload: ApiErrorPayload;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = {
        error: {
          code: 'NETWORK_OR_SERVER_ERROR',
          message: `Erro de comunicação com o servidor (${response.status}: ${response.statusText})`,
          correlationId: responseCorrelationId,
          timestamp: new Date().toISOString(),
        },
      };
    }
    throw new ApiError(response.status, errorPayload);
  }

  if (response.status === 204) {
    return { data: {} as T, correlationId: responseCorrelationId, etag: responseEtag };
  }

  const data = (await response.json()) as T;
  return {
    data,
    correlationId: responseCorrelationId,
    etag: responseEtag,
  };
}
