import axios from 'axios';

// Create base axios instance with default configuration
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Backend (FastAPI) often returns validation errors in `detail` as an array.
    // Normalize that into a human-readable string for logs and UI.
    const data = error.response?.data;

    // If the backend returned an empty object ({}), prefer using other
    // available information such as validation detail, message, HTTP
    // statusText or the error.message instead of printing '{}' to the UI.
    const isEmptyObject = (obj: any) => obj && typeof obj === 'object' && Object.keys(obj).length === 0;

    let rawMessage;
    if (data === undefined || data === null) {
      rawMessage = error.message ?? error.response?.statusText ?? 'An unexpected error occurred';
    } else if (isEmptyObject(data)) {
      rawMessage = error.message ?? error.response?.statusText ?? 'An unexpected error occurred';
    } else {
      rawMessage = data?.detail ?? data?.message ?? data?.error ?? data ?? error.message ?? error.response?.statusText ?? 'An unexpected error occurred';
    }

    // If FastAPI validation errors are present they will be an array of objects
    // with `loc` and `msg`. Convert that into a readable string.
    const formatDetail = (detail: any) => {
      if (Array.isArray(detail)) {
        return detail
          .map((d: any) => {
            if (typeof d === 'string') return d;
            if (d?.loc && d?.msg) return `${d.loc.join('.')}: ${d.msg}`;
            return JSON.stringify(d);
          })
          .join('; ');
      }

      if (typeof detail === 'object') {
        // If it's an empty object we've already handled that above, but for
        // other objects try to extract common fields first so the message is
        // human-readable (e.g. { message: '...' } or { error: '...' }).
        if (detail === null) return 'An unexpected error occurred';
        if (detail.message) return formatDetail(detail.message);
        if (detail.error) return formatDetail(detail.error);
        if (detail.detail) return formatDetail(detail.detail);
        if (Object.keys(detail).length === 0) return null;
        return JSON.stringify(detail);
      }
      return String(detail);
    };

    const prettyMessage = formatDetail(rawMessage) ?? (error.message ?? error.response?.statusText ?? 'An unexpected error occurred');

    // Attach a portable message used by the UI to show friendly errors.
    // Attach a portable message used by the UI to show friendly errors.
    (error as any).prettyMessage = prettyMessage;

    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: prettyMessage,
      raw: data,
    });

    return Promise.reject(error);
  }
);

export default apiClient;