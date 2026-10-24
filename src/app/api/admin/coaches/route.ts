import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function permitted() { try { await requireAdmin(); return true; } catch { return false; } }
export async function GET() {
  if (!await permitted()) return NextResponse.json({error:"Non autorisé"},{status:401});
  const {data,error}=await getSupabaseAdmin().from("coach_accounts")
    .select("user_id,email,display_name,active,created_at").order("created_at",{ascending:false});
  if(error)return NextResponse.json({error:"Impossible de consulter les coachs"},{status:500});
  return NextResponse.json({coaches:data||[]},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(req: NextRequest) {
  if (!await permitted()) return NextResponse.json({error:"Non autorisé"},{status:401});
  const body=await req.json().catch(()=>null);
  const email=typeof body?.email==="string"?body.email.trim().toLowerCase():"";
  const password=typeof body?.password==="string"?body.password:"";
  const name=typeof body?.name==="string"&&body.name.trim()?body.name.trim():"Coach";
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length>100
     ||password.length<12||password.length>128||!/\d/.test(password)||!/[A-Za-z]/.test(password))
    return NextResponse.json({error:"Adresse e-mail et mot de passe de 12 caractères minimum (lettres et chiffres) requis."},{status:400});
  const db=getSupabaseAdmin();
  // Le coach reçoit un compte Supabase, sans formulaire membre ni questionnaire.
  // Le trigger existant peut créer un profil minimal : on le rend non approuvé
  // et on exclut explicitement les coachs des accès membres.
  const {data:created,error:createError}=await db.auth.admin.createUser({
    email,password,email_confirm:true,user_metadata:{name,account_type:"coach"}
  });
  if(createError||!created.user) return NextResponse.json({error:"Création impossible : adresse déjà utilisée ou identifiants invalides."},{status:409});
  const id=created.user.id;
  const {error:coachError}=await db.from("coach_accounts").insert({user_id:id,email,display_name:name,active:true});
  if(coachError){await db.auth.admin.deleteUser(id);return NextResponse.json({error:"Impossible de définir le rôle Coach."},{status:500});}
  // Un coach peut entrer dans les espaces membre et professionnel, sans être un candidat matrimonial.
  const {error:profileError}=await db.from("profiles").update({status:"approved",account_type:"coach"}).eq("id",id);
  if(profileError) {
    await db.from("coach_accounts").delete().eq("user_id",id);
    await db.auth.admin.deleteUser(id);
    return NextResponse.json({error:"Impossible d'isoler le compte Coach."},{status:500});
  }
  return NextResponse.json({id,email,name,active:true},{status:201});
}
export async function PATCH(req: NextRequest) {
  if (!await permitted()) return NextResponse.json({error:"Non autorisé"},{status:401});
  const body=await req.json().catch(()=>null);
  if(typeof body?.id!=="string"||typeof body?.active!=="boolean")return NextResponse.json({error:"Paramètres invalides"},{status:400});
  const db=getSupabaseAdmin();
  const {data,error}=await db.from("coach_accounts").update({active:body.active,updated_at:new Date().toISOString()})
    .eq("user_id",body.id).select("user_id,active").maybeSingle();
  if(error||!data)return NextResponse.json({error:"Coach introuvable ou modification impossible"},{status:404});
  const {error:profileError}=await db.from("profiles").update({status:body.active?"approved":"suspended",account_type:"coach"}).eq("id",body.id);
  if(profileError)return NextResponse.json({error:"Statut de profil incohérent, intervention nécessaire."},{status:500});
  return NextResponse.json({coach:data});
}
