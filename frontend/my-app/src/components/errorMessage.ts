export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const possibleError = error as { reason?: unknown; message?: unknown };

    if (typeof possibleError.reason === 'string') {
      return possibleError.reason;
    }

    if (typeof possibleError.message === 'string') {
      return possibleError.message;
    }
  }

  return String(error);
}
