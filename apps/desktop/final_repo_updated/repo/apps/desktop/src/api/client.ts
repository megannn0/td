// Robust API client

export interface RequestOptions extends RequestInit {
  json?: boolean; // default: true when body exists
}

const API_BASE = '/api';

function buildHeaders(options: RequestOptions): Headers {
  const headers = new Headers(options.headers);

  const hasBody = options.body != null;
  const shouldSendJson = options.json !== false && hasBody;

  if (shouldSendJson && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return headers;
}

function normalizeBody(options: RequestOptions): BodyInit | undefined {
  const body = options.body;

  if (body == null) return undefined;

  const isFormData = body instanceof FormData;
  const isBlob = body instanceof Blob;
  const isString = typeof body === 'string';

  if (isFormData || isBlob || isString) {
    return body;
  }

  // auto JSON stringify
  if (options.json !== false && typeof body === 'object') {
    return JSON.stringify(body);
  }

  return body;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  if (contentType.startsWith('text/')) {
    return (await response.text()) as T;
  }

  // fallback (blob, etc.)
  return undefined as T;
}

export async function request<T = unknown>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = buildHeaders(options);
  const body = normalizeBody(options);

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    body,
  });

  if (!response.ok) {
    let message: string;

    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        message = json?.detail || JSON.stringify(json);
      } else {
        message = await response.text();
      }
    } catch {
      message = `Request failed with status ${response.status}`;
    }

    throw new Error(message);
  }

  return parseResponse<T>(response);
}

// upload uses same core logic
export function uploadFormData<T = unknown>(
  url: string,
  formData: FormData,
): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    body: formData,
    json: false,
  });
}