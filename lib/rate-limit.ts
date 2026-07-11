type RateLimitInfo = {
  count: number;
  lastReset: number;
};

const rateLimits = new Map<string, RateLimitInfo>();

export function rateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const info = rateLimits.get(identifier);

  if (!info) {
    rateLimits.set(identifier, { count: 1, lastReset: now });
    return true; // Allowed
  }

  if (now - info.lastReset > windowMs) {
    // Reset window
    info.count = 1;
    info.lastReset = now;
    return true; // Allowed
  }

  if (info.count >= limit) {
    return false; // Rate limited
  }

  info.count++;
  return true; // Allowed
}

// Limpiador automático para evitar fuga de memoria (corre cada 10 minutos)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, info] of rateLimits.entries()) {
      // Si la entrada es más antigua que 15 minutos, bórrala
      if (now - info.lastReset > 15 * 60 * 1000) {
        rateLimits.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}
