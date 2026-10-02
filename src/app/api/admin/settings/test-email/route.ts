/**
 * POST /api/admin/settings/test-email — { to } : envoie un e-mail de test avec
 * la configuration réelle du serveur (SMTP de production) et renvoie la cause
 * précise en cas d'échec. Sert à comprendre pourquoi les membres ne reçoivent
 * pas les e-mails (validation de compte, etc.).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sendTestEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const to = typeof body.to === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to.trim()) ? body.to.trim() : admin.email;
  if (!to) return NextResponse.json({ error: "Indiquez une adresse e-mail." }, { status: 400 });

  const result = await sendTestEmail(to);
  return NextResponse.json({ ...result, to, smtpConfigured: !!process.env.SMTP_PASSWORD });
}
