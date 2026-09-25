import { betaEnabled, createStore } from "../../../../beta/store";
import { consentVersion } from "../../../../beta/contracts";
import {
  listVersions,
  defaultVersion,
} from "../../../../recommendation/registry";
export const runtime = "nodejs";
// Public, non-secret configuration so the consent screen can say truthfully
// whether records are being kept and where.
export function GET() {
  let store = "none";
  const enabled = betaEnabled();
  if (enabled) {
    try {
      store = createStore().name;
    } catch {
      store = "misconfigured";
    }
  }
  return Response.json(
    {
      enabled: enabled && store !== "none" && store !== "misconfigured",
      store,
      consentVersion,
      defaultVersion,
      versions: listVersions()
        .filter((v) => v.runnable)
        .map((v) => ({ version: v.version, status: v.status })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
