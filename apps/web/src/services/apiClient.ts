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
  /** Não reenvia o access token. Usado na renovação da sessão. */
  anonymous?: boolean;
  /** Evita um segundo ciclo de renovação na mesma chamada. */
  retried?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  etag?: string;
  correlationId?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const TOKEN_KEY = 'lumini_auth_token';
const REFRESH_KEY = 'lumini_refresh_token';
const USER_KEY = 'lumini_auth_user';

let renewing: Promise<string | null> | null = null;

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event('lumini-auth-updated'));
}

async function renewAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  if (!renewing) {
    renewing = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-Id': crypto.randomUUID(),
          },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return null;
        const data = (await response.json()) as {
          accessToken: string;
          refreshToken: string;
          userId: string;
          displayName: string;
          email: string;
          tenantId: string;
          organizationName: string;
          roleName: string;
          permissions: string[];
        };
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        localStorage.setItem(REFRESH_KEY, data.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify({
          userId: data.userId,
          email: data.email,
          displayName: data.displayName,
          tenantId: data.tenantId,
          organizationName: data.organizationName,
          roleName: data.roleName,
          permissions: data.permissions,
        }));
        window.dispatchEvent(new Event('lumini-auth-updated'));
        return data.accessToken;
      } catch {
        return null;
      } finally {
        renewing = null;
      }
    })();
  }
  return renewing;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const correlationId = crypto.randomUUID();
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('X-Correlation-Id', correlationId);

  if (options.etag) {
    headers.set('If-Match', options.etag);
  }

  const token = options.anonymous ? null : options.token || localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const responseCorrelationId = response.headers.get('X-Correlation-Id') || correlationId;
  const responseEtag = response.headers.get('ETag') || undefined;

  if (response.status === 401 && !options.retried && !options.anonymous) {
    const renewed = await renewAccessToken();
    if (renewed) {
      return apiRequest<T>(endpoint, { ...options, token: renewed, retried: true });
    }
    clearStoredSession();
  }

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
