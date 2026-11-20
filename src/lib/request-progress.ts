let activeRequestCount = 0;
const listeners = new Set<() => void>();

function updateActiveRequestCount(change: number) {
  activeRequestCount = Math.max(0, activeRequestCount + change);
  for (const listener of listeners) listener();
}

export function subscribeToRequestProgress(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveRequestCount() {
  return activeRequestCount;
}

export async function withRequestProgress<T>(request: () => Promise<T>): Promise<T> {
  if (typeof window === "undefined") return request();
  updateActiveRequestCount(1);

  try {
    return await request();
  } finally {
    updateActiveRequestCount(-1);
  }
}

export function fetchWithProgress(input: RequestInfo | URL, init?: RequestInit) {
  return withRequestProgress(() => fetch(input, init));
}
