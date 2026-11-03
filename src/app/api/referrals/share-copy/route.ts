// GET /api/referrals/share-copy?locale=fr|en — texte localisé pour le
// partage WhatsApp / natif du lien de parrainage.

import { NextRequest, NextResponse } from "next/server";
import { getApprovedUser } from "@/lib/api-auth";

const COPY = {
  fr: (url: string) =>
    `Bonjour ! Je t'invite à découvrir Garden of Alliance, une communauté chrétienne de rencontre en vue du mariage. ` +
    `Inscris-toi via mon lien : ${url}`,
  en: (url: string) =>
    `Hi! I'd love to invite you to Garden of Alliance, a Christian community for marriage-minded relationships. ` +
    `Join using my link: ${url}`,
};

export async function GET(request: NextRequest) {
  const user = await getApprovedUser(request);
  if (!user) return NextResponse.json({ error: "Session expirée ou compte non approuvé." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "fr";
  const url = searchParams.get("url") || "";

  return NextResponse.json({ text: COPY[locale](url) });
}
