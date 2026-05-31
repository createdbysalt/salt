export function urlHasHost(url: string, ...hosts: string[]): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}
