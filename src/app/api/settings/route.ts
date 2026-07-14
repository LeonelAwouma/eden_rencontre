import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Public endpoint — no auth required
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("key, value")
      .eq("category", "appearance");

    if (error) throw error;

    const appearance: Record<string, unknown> = {};
    (data || []).forEach((s) => {
      appearance[s.key] = s.value;
    });

    return NextResponse.json({
      accent_color: appearance.accent_color || "#486B46",
      theme: appearance.theme || "light",
      banner_text: appearance.banner_text || "",
    });
  } catch (err) {
    console.error("Public settings fetch error:", err);
    // Return defaults on error
    return NextResponse.json({
      accent_color: "#486B46",
      theme: "light",
      banner_text: "",
    });
  }
}