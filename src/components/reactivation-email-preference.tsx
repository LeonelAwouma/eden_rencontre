"use client";
import { useEffect, useState } from "react";
import { authHeaders } from "@/lib/auth";

export function ReactivationEmailPreference() {
  const [enabled,setEnabled]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    let active=true;
    authHeaders().then(headers=>fetch("/api/member/reactivation/preferences",{headers,cache:"no-store"}))
      .then(async res=>{if(!res.ok)throw Error("Préférences indisponibles");return res.json()})
      .then(data=>{if(active)setEnabled(data.enabled===true)})
      .catch(()=>{if(active)setMessage("Préférences indisponibles pour le moment.")})
      .finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[]);
  const toggle=async()=>{
    setSaving(true);setMessage("");
    try {
      const headers=await authHeaders();
      const res=await fetch("/api/member/reactivation/preferences",{
        method:"PUT",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify({enabled:!enabled})
      });
      if(!res.ok)throw Error("Modification impossible");
      setEnabled(!enabled);setMessage("Votre préférence a été enregistrée.");
    }catch{setMessage("La préférence n'a pas pu être enregistrée. Réessayez.");}
    finally{setSaving(false)}
  };
  return <section className="eden-card p-6" aria-label="Préférences de relance">
    <h3 className="text-lg font-semibold text-[#2F2F2F]">Rappels de connexion par e-mail</h3>
    <p className="text-sm text-[#6B746E] my-3">Recevez au maximum trois rappels, après 7, 21 et 45 jours sans visite. Vous pouvez les désactiver à tout moment. Aucune relance n'est envoyée sans votre accord.</p>
    <label className="flex items-center gap-3 text-sm font-medium">
      <input type="checkbox" checked={enabled} onChange={toggle} disabled={loading||saving||!!message&&message.includes("indisponibles")} className="accent-[#486B46] h-4 w-4" />
      {loading?"Chargement…":enabled?"Rappels activés":"Activer les rappels"}
    </label>
    {message&&<p className="mt-2 text-xs text-[#6B746E]" role="status">{message}</p>}
  </section>;
}
