import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
/** Témoignages par membre et par jour (anti-abus). */
const MAX_PER_DAY = 5;

const text = (v: FormDataEntryValue | null, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export async function POST(req: NextRequest) {
  // Auteur = membre approuvé de la session. Avant, le user_id venait du
  // formulaire : n'importe qui pouvait publier au nom de n'importe quel membre.
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Connectez-vous pour partager votre témoignage." }, { status: 401 });

  try {
    if (!(await checkRateLimit(user.id, "testimonial_submit", MAX_PER_DAY, 24 * 3600))) {
      return NextResponse.json({ error: "Vous avez déjà envoyé plusieurs témoignages aujourd'hui. Réessayez demain." }, { status: 429 });
    }

    const formData = await req.formData();

    const user_id = user.id;
    const couple_names = text(formData.get("couple_names"), 120);
    const title = text(formData.get("title"), 200);
    const content = text(formData.get("content"), 5000);
    const rating = text(formData.get("rating"), 2);
    const image = formData.get("image");
    const imageFile = image instanceof File ? image : null;

    if (!content) {
      return NextResponse.json({ error: "Le témoignage est vide." }, { status: 400 });
    }
    if (imageFile && imageFile.size > 0 && (!IMAGE_TYPES[imageFile.type] || imageFile.size > MAX_IMAGE_BYTES)) {
      return NextResponse.json({ error: "Photo refusée : JPG, PNG ou WebP de 5 Mo au plus." }, { status: 400 });
    }

    let imageUrl: string | null = null;

    // Upload image to Supabase Storage if provided
    if (imageFile && imageFile.size > 0) {
      try {
        const supabaseUpload = getSupabaseAdmin();
        // Extension tirée du type vérifié, jamais du nom fourni par le navigateur.
        const fileName = `${user_id}/${Date.now()}.${IMAGE_TYPES[imageFile.type]}`;

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
        rating: rating ? Math.min(5, Math.max(1, parseInt(rating, 10) || 5)) : null,
        image_url: imageUrl,
        status: "pending_review",
      })
      .select()
      .single();

    if (error) {
      console.error("Testimonial insert error:", error);
      return NextResponse.json({ error: "Témoignage non enregistré. Réessayez." }, { status: 500 });
    }
    await recordRateLimit(user.id, "testimonial_submit");

    // Create admin notification for new testimonial
    try {
      await supabase.from("admin_notifications").insert({
        type: "testimonial",
        title: "Nouveau témoignage soumis",
        message: `Un nouveau témoignage a été soumis et attend votre approbation.`,
        link: "/admin/testimonials",
        metadata: { testimonial_id: data.id, user_id },
      });
    } catch (notifErr) {
      console.error("Failed to create testimonial notification:", notifErr);
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