import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "@/lib/session-secret";

const baseUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "https://gardenofalliance.com").replace(/\/$/, "");
function sign(userId: string) {
  return createHmac("sha256", getSessionSecret()).update("reactivation:v1:" + userId).digest("hex");
}
export function reactivationUnsubscribeUrl(userId: string) {
  return `${baseUrl()}/api/member/reactivation/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
}
export function validReactivationToken(userId: string, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(sign(userId)), Buffer.from(token));
}
