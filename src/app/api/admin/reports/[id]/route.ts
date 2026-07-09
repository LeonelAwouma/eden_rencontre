import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) updateData.status = body.status;
    if (body.admin_notes !== undefined) updateData.admin_notes = body.admin_notes;
    if (body.priority) updateData.priority = body.priority;
    if (body.status === "resolved" || body.status === "dismissed") {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("user_reports")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Report update error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("user_reports").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Report delete error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}