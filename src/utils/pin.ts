/**
 * Generates a stable, deterministic 4-digit numeric pickup PIN code
 * from a given group buy ID and user ID.
 */
export function getPickupPin(groupBuyId: string, userId: string): string {
  const combined = `${groupBuyId}_${userId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  const numeric = Math.abs(hash) % 10000;
  return String(numeric).padStart(4, '0');
}
