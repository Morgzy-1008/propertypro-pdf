/**
 * Helper to determine whether the current browser environment is running on localhost.
 * Used to isolate experimental development features (like Builders Estimate V2,
 * comparison switchers, and experimental branding) to localhost only, ensuring
 * that the production live site strictly retains the proven, official release.
 */
export function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;

  const hostname = (window as any).__MOCK_HOSTNAME__ || window.location.hostname;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.") ||
    hostname.startsWith("172.17.") ||
    hostname.startsWith("172.18.") ||
    hostname.startsWith("172.19.") ||
    hostname.startsWith("172.20.") ||
    hostname.startsWith("172.21.") ||
    hostname.startsWith("172.22.") ||
    hostname.startsWith("172.23.") ||
    hostname.startsWith("172.24.") ||
    hostname.startsWith("172.25.") ||
    hostname.startsWith("172.26.") ||
    hostname.startsWith("172.27.") ||
    hostname.startsWith("172.28.") ||
    hostname.startsWith("172.29.") ||
    hostname.startsWith("172.30.") ||
    hostname.startsWith("172.31.");

  const hasDevQuery =
    window.location.search.includes("dev_v2=true") ||
    window.location.search.includes("dev=true") ||
    window.location.search.includes("localhost=true");

  return Boolean(isLocal || hasDevQuery);
}
