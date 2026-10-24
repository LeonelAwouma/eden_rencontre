"use client";
import { useEffect, useState } from "react";
import { authHeaders, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Home, LogOut, ShieldCheck, Users } from "lucide-react";
type Coach={ id:string; email:string; name:string };
export default function CoachHome(){
  const router=useRouter();
  const [coach,setCoach]=useState<Coach|null>(null);
  const [error,setError]=useState(false);
  useEffect(()=>{
    let active=true;
    authHeaders().then(headers=>fetch("/api/coach/me",{headers,cache:"no-store"}))
      .then(async res=>{if(!res.ok)throw Error("Unauthorized");return res.json()})
      .then(data=>{if(active)setCoach(data.coach)})
      .catch(()=>{if(active)setError(true)});
    return ()=>{active=false};
  },[]);
  if(error)return <main className="min-h-screen grid place-items-center p-6"><div className="space-y-4 text-center"><h1 className="text-xl font-semibold">Accès Coach indisponible</h1><p>Vérifiez votre compte auprès de l'administration.</p><Link href="/login" className="text-primary underline">Revenir à la connexion</Link></div></main>;
  if(!coach)return <main className="min-h-screen grid place-items-center" role="status">Vérification de votre accès Coach…</main>;
  return <main className="min-h-screen bg-[#FAF9F6] p-6 sm:p-12"><div className="mx-auto max-w-4xl space-y-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm font-semibold text-primary">Garden of Alliance</p><h1 className="text-3xl font-bold">Espace Coach</h1></div>
      <button onClick={async()=>{await logout();router.replace("/login")}} className="inline-flex gap-2 items-center border rounded-xl px-4 py-2 bg-white"><LogOut className="w-4 h-4"/>Se déconnecter</button>
    </header>
    <section className="rounded-2xl border bg-white p-6 space-y-3">
      <ShieldCheck className="text-primary"/><h2 className="text-xl font-semibold">Bienvenue, {coach.name}</h2>
      <p className="text-sm text-[#56615A]">Compte professionnel : {coach.email}</p>
      <p>Votre accès a été créé directement par l'administration. Aucun questionnaire de matching, selfie ou inscription membre n'est requis.</p>
    </section>
    <section className="grid sm:grid-cols-3 gap-4">
      <Link href="/dashboard" className="rounded-2xl border bg-white p-5 space-y-2 hover:border-primary"><Users className="text-primary"/><h2 className="font-semibold">Espace membre</h2><p className="text-sm text-[#56615A]">Visiter le tableau de bord des membres avec votre compte Coach.</p></Link>
      <Link href="/" className="rounded-2xl border bg-white p-5 space-y-2 hover:border-primary"><Home className="text-primary"/><h2 className="font-semibold">Découvrir la plateforme</h2><p className="text-sm text-[#56615A]">Consulter les contenus publics de Garden of Alliance.</p></Link>
      <Link href="/mediatheque" className="rounded-2xl border bg-white p-5 space-y-2 hover:border-primary"><BookOpen className="text-primary"/><h2 className="font-semibold">Médiathèque</h2><p className="text-sm text-[#56615A]">Accéder aux ressources publiques disponibles.</p></Link>
    </section>
    <p className="text-xs text-[#6B746E]">Le compte Coach permet de visiter l'espace membre, mais n'autorise pas les demandes d'alliance, les matchs ni la lecture des conversations privées. Il ne donne aucun droit d'administration.</p>
  </div></main>;
}
