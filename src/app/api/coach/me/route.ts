import { NextRequest, NextResponse } from "next/server";
import { getActiveCoach } from "@/lib/coach-auth";
export async function GET(req: NextRequest) {
  const coach = await getActiveCoach(req);
  if (!coach) return NextResponse.json({error:"Accès Coach non autorisé"},{status:403});
  return NextResponse.json({coach},{headers:{"Cache-Control":"private, no-store"}});
}
