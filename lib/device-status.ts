const ONLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export function isDeviceOnline(lastSeen: string): boolean {
  const lastSeenTime = new Date(lastSeen).getTime();
  return Date.now() - lastSeenTime < ONLINE_THRESHOLD_MS;
}
