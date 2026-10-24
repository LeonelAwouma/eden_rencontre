"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, UserPlus, RefreshCw } from "lucide-react";
type Coach={user_id:string;email:string;display_name:string;active:boolean;created_at:string};
export default function AdminCoaches(){
  const [coaches,setCoaches]=useState<Coach[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const load=useCallback(async()=>{
    setLoading(true);
    try{const res=await fetch("/api/admin/coaches",{cache:"no-store"});const data=await res.json();if(!res.ok)throw Error(data.error);setCoaches(data.coaches||[]);setError("");}
    catch(e){setError(e instanceof Error?e.message:"Erreur de chargement");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load()},[load]);
  const create=async(e:React.FormEvent)=>{
    e.preventDefault();setSaving(true);setError("");setNotice("");
    try{const res=await fetch("/api/admin/coaches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,password})});const data=await res.json();if(!res.ok)throw Error(data.error);setName("");setEmail("");setPassword("");setNotice("Compte Coach créé. Il peut se connecter avec son adresse e-mail et son mot de passe.");await load();}
    catch(e){setError(e instanceof Error?e.message:"Erreur de création");}
    finally{setSaving(false)}
  };
  const toggle=async(c:Coach)=>{
    setError("");try{const res=await fetch("/api/admin/coaches",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:c.user_id,active:!c.active})});if(!res.ok)throw Error("Modification refusée");await load();}
    catch(e){setError(e instanceof Error?e.message:"Erreur");}
  };
  return <main className="space-y-6">
    <Link href="/admin/users" className="inline-flex gap-2 items-center text-sm text-primary font-semibold"><ArrowLeft className="h-4 w-4"/>Retour aux utilisateurs</Link>
    <header><h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-primary"/>Coachs de la plateforme</h1><p className="text-sm text-[#56615A]">Comptes professionnels distincts des profils membres, sans questionnaire matrimonial.</p></header>
    <div className="grid lg:grid-cols-[minmax(0,360px)_1fr] gap-5">
      <form onSubmit={create} className="bg-white border rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold flex gap-2 items-center"><UserPlus className="h-5 w-5 text-primary"/>Ajouter un coach</h2>
        <label className="block text-sm font-medium">Nom du coach (facultatif)<input value={name} onChange={e=>setName(e.target.value)} maxLength={100} className="mt-1 block w-full border rounded-lg px-3 py-2"/></label>
        <label className="block text-sm font-medium">Adresse e-mail<input required type="email" autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 block w-full border rounded-lg px-3 py-2"/></label>
        <label className="block text-sm font-medium">Mot de passe initial<input required type="password" autoComplete="new-password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 block w-full border rounded-lg px-3 py-2"/><span className="text-xs text-[#56615A]">12 caractères minimum, lettres et chiffres. Transmettez-le par un canal sécurisé.</span></label>
        <button disabled={saving} className="rounded-xl bg-[#486B46] text-white px-4 py-2 w-full disabled:opacity-50">{saving?"Création…":"Créer le compte Coach"}</button>
      </form>
      <section className="bg-white border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Comptes Coach ({coaches.length})</h2><button onClick={()=>void load()} aria-label="Actualiser" className="border rounded-lg p-2"><RefreshCw className="w-4 h-4"/></button></div>
        {loading?<p>Chargement…</p>:coaches.length===0?<p className="text-sm text-[#56615A]">Aucun coach enregistré.</p>:
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="py-2">Coach</th><th>Statut</th><th>Action</th></tr></thead><tbody>
          {coaches.map(c=><tr key={c.user_id} className="border-b last:border-0"><td className="py-3"><p className="font-semibold">{c.display_name}</p><p className="text-xs text-[#56615A] break-all">{c.email}</p></td><td>{c.active?"Actif":"Suspendu"}</td><td><button className="border px-3 py-1.5 rounded-lg" onClick={()=>void toggle(c)}>{c.active?"Suspendre":"Réactiver"}</button></td></tr>)}
        </tbody></table></div>}
      </section>
    </div>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="text-sm text-primary">{notice}</p>}
  </main>;
}
