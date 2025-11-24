export function getFriendlyApiError(error: any): string {
  if (!error) return 'An unexpected error occurred';

  // Prefer a pre-computed prettyMessage from the axios interceptor, but
  // guard against the interceptor returning an unhelpful value like "{}".
  if (typeof error.prettyMessage === 'string' && error.prettyMessage.trim() !== '{}' && error.prettyMessage.trim() !== '') {
    return error.prettyMessage;
  }

  // FastAPI returns errors in response.data.detail which can be an array
  const data = error?.response?.data;
  const isEmptyObject = (obj: any) => obj && typeof obj === 'object' && Object.keys(obj).length === 0;
  if (isEmptyObject(data)) return error?.message ?? 'An unexpected error occurred';
  if (data?.detail) {
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((d: any) => (d?.loc && d?.msg ? `${d.loc.join('.')}: ${d.msg}` : String(d)))
        .join('; ');
    }
    return String(data.detail);
  }

  if (data?.message) return String(data.message);
  return error?.message ?? error?.response?.statusText ?? 'An unexpected error occurred';
}

export default getFriendlyApiError;
