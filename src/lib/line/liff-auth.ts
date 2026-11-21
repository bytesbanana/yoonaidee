import type liff from "@line/liff";

export function lineAuthHeaders(client: typeof liff | null): Record<string, string> | null {
  const idToken = client?.getIDToken();
  if (idToken) return { Authorization: `Bearer ${idToken}` };
  const accessToken = client?.getAccessToken();
  if (accessToken) return { Authorization: `Bearer ${accessToken}`, "X-Line-Token-Type": "access" };
  return null;
}
