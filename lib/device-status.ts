const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export function isDeviceOnline(lastSeen: string): boolean {
  const lastSeenTime = new Date(lastSeen).getTime();
  return Date.now() - lastSeenTime < ONLINE_THRESHOLD_MS;
}
