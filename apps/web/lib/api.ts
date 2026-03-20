export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: { page: number; limit: number; total: number };
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export function ok<T>(data: T, meta?: { page: number; limit: number; total: number; totalPages?: number }): ApiResponse<T> {
  return { success: true, data, ...(meta ? { meta: { page: meta.page, limit: meta.limit, total: meta.total } } : {}) };
}

export function err(code: string, message: string, details?: unknown): ApiError {
  return { success: false, error: { code, message, details } };
}

// Client-side fetcher
async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const json = (await res.json()) as ApiResult<T>;

  if (!json.success) {
    throw new Error(json.error.message);
  }

  return json;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
