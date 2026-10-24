import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function getActiveCoach(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return null;
  const { data, error } = await getSupabaseAdmin().from("coach_accounts")
    .select("user_id,email,display_name,active").eq("user_id",user.id).maybeSingle();
  if (error || !data?.active) return null;
  return { id: user.id, email: data.email as string, name: data.display_name as string };
}
