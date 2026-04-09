export type NylasOAuthState = {
  companyId: string
  receptionEmail: string
  provider: "google" | "microsoft"
  popup?: boolean
}

export function encodeOAuthState(payload: NylasOAuthState): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

export function decodeOAuthState(state: string): NylasOAuthState {
  const raw = Buffer.from(String(state || ""), "base64url").toString("utf8")
  const parsed = JSON.parse(raw)
  if (!parsed?.companyId || !parsed?.receptionEmail || !parsed?.provider) {
    throw new Error("State OAuth invalido")
  }
  return parsed
}
