export function logServerInfo(message: string, context: Record<string, unknown> = {}) {
  console.info('[server]', message, sanitizeContext(context));
}

export function logServerError(message: string, error: unknown, context: Record<string, unknown> = {}) {
  const payload = {
    ...sanitizeContext(context),
    error: error instanceof Error ? error.message : String(error),
  };
  console.error('[server]', message, payload);
}

function sanitizeContext(context: Record<string, unknown>) {
  const blocked = new Set(['apikey', 'authorization', 'token', 'key', 'secret', 'password']);
  return Object.fromEntries(
    Object.entries(context).filter(([k]) => !blocked.has(k.toLowerCase())),
  );
}
