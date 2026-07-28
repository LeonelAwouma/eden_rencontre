import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const user_id = formData.get("user_id") as string;
    const couple_names = formData.get("couple_names") as string;
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const rating = formData.get("rating") as string;
    const imageFile = formData.get("image") as File | null;

    if (!user_id || !content) {
      return NextResponse.json(
        { error: "user_id et content sont requis" },
        { status: 400 }
      );
    }

    let imageUrl: string | null = null;

    // Upload image to Supabase Storage if provided
    if (imageFile && imageFile.size > 0) {
      try {
        const supabaseUpload = getSupabaseAdmin();
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user_id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabaseUpload.storage
          .from("testimonials")
          .upload(fileName, imageFile, {
            contentType: imageFile.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Image upload error (continuing without image):", uploadError.message);
        } else if (uploadData) {
          const { data: urlData } = supabaseUpload.storage
            .from("testimonials")
            .getPublicUrl(uploadData.path);
          imageUrl = urlData.publicUrl;
        }
      } catch (uploadErr) {
        console.error("Image upload exception (continuing without image):", uploadErr);
      }
    }

    // Insert testimonial with pending_review status
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("testimonials")
      .insert({
        user_id,
        couple_names: couple_names || null,
        title: title || null,
        content,
        rating: rating ? parseInt(rating, 10) : null,
        image_url: imageUrl,
        status: "pending_review",
      })
      .select()
      .single();

    if (error) {
      console.error("Testimonial insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ testimonial: data }, { status: 201 });
  } catch (err) {
    console.error("Testimonial submission error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}