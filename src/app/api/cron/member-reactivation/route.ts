import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import { sendInactivityReminderEmail } from "@/lib/email";
import { reactivationUnsubscribeUrl } from "@/lib/member-reactivation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STEPS = [7, 21, 45] as const;
type Step = (typeof STEPS)[number];
const DAY = 86400000;
const MAX_EMAILS_PER_RUN = 8;
type Member = { id: string; email: string; name: string | null; pseudo: string | null; last_member_visit_at: string | null; created_at: string };
type Pref = { user_id: string; email_opt_in: boolean };

// Requires explicit operator activation AND explicit recipient opt-in.
// Schedule is harmless while REACTIVATION_EMAILS_ENABLED !== "true".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (process.env.REACTIVATION_EMAILS_ENABLED !== "true") {
    return NextResponse.json({ enabled: false, sent: 0, message: "Relances désactivées" });
  }
  const db = getSupabaseAdmin();
  try {
    // Query only explicitly opted-in accounts. No implicit enrollment.
    const optedIn: string[] = [];
    const batch = 500;
    for (let start=0;start<50000;start+=batch) {
      const {data,error}=await db.from("member_reactivation_preferences")
        .select("user_id,email_opt_in").eq("email_opt_in",true)
        .order("user_id",{ascending:true}).range(start,start+batch-1);
      if(error) throw error;
      optedIn.push(...((data||[]) as Pref[]).map(x=>x.user_id));
      if(!data || data.length < batch) break;
      if(start+batch>=50000) throw Error("Limite de membres consentants atteinte");
    }
    if(optedIn.length===0) return NextResponse.json({enabled:true,sent:0,eligible:0});
    let eligible=0,sent=0,failed=0;
    for(let offset=0; offset<optedIn.length; offset+=100) {
      if(sent>=MAX_EMAILS_PER_RUN) break;
      const ids=optedIn.slice(offset,offset+100);
      const {data:profiles,error}=await db.from("profiles")
        .select("id,email,name,pseudo,last_member_visit_at,created_at")
        .eq("status","approved").in("id",ids);
      if(error) throw error;
      for(const member of (profiles||[]) as Member[]) {
        if(sent>=MAX_EMAILS_PER_RUN) break;
        if(!member.email || member.email.toLowerCase()===ADMIN_SYSTEM_EMAIL.toLowerCase() || member.email.endsWith(".local")) continue;
        const since=member.last_member_visit_at;
        if(!since) continue; // Never infer inactivity from registration date.
        const inactiveSince=Date.parse(since);
        if(!Number.isFinite(inactiveSince)) continue;
        const days=Math.floor((Date.now()-inactiveSince)/DAY);
        const step=[...STEPS].reverse().find(n=>days>=n) as Step|undefined;
        if(!step) continue;
        // Send earlier unsent step first, and at most one mail per recipient per run.
        const {data:previous,error:sentError}=await db.from("member_reactivation_sends")
          .select("step_days,status").eq("user_id",member.id).eq("inactive_since",since);
        if(sentError) throw sentError;
        const prior=new Set((previous||[]).filter(s=>s.status!=="failed").map(s=>s.step_days));
        const next=STEPS.find(n=>days>=n&&!prior.has(n));
        if(!next) continue;
        eligible++;
        const {data:recent,error:recentError}=await db.from("member_reactivation_sends")
          .select("sent_at").eq("user_id",member.id).eq("status","sent")
          .order("sent_at",{ascending:false}).limit(1);
        if(recentError) throw recentError;
        if(recent?.[0]?.sent_at && Date.now()-Date.parse(recent[0].sent_at)<7*DAY) continue;
        // Atomic claim: prevents duplicate emails if two cron invocations overlap.
        const {error:claimError}=await db.from("member_reactivation_sends")
          .insert({user_id:member.id,inactive_since:since,step_days:next,status:"claimed"});
        if(claimError) {
          if(claimError.code==="23505") continue;
          throw claimError;
        }
        // One final check protects against opt-out or a visit during the run.
        const [{data:pref},{data:fresh}] = await Promise.all([
          db.from("member_reactivation_preferences").select("email_opt_in").eq("user_id",member.id).maybeSingle(),
          db.from("profiles").select("status,last_member_visit_at").eq("id",member.id).maybeSingle(),
        ]);
        if(pref?.email_opt_in!==true||fresh?.status!=="approved"||fresh?.last_member_visit_at!==since){
          await db.from("member_reactivation_sends").update({status:"failed"}).eq("user_id",member.id).eq("inactive_since",since).eq("step_days",next);
          continue;
        }
        const ok=await sendInactivityReminderEmail(member.email,member.pseudo||member.name||"Membre",next,reactivationUnsubscribeUrl(member.id));
        await db.from("member_reactivation_sends").update({
          status:ok?"sent":"failed",sent_at:ok?new Date().toISOString():null
        }).eq("user_id",member.id).eq("inactive_since",since).eq("step_days",next);
        if(ok) sent++; else failed++;
      }
    }
    return NextResponse.json({enabled:true,eligible,sent,failed,perRunLimit:MAX_EMAILS_PER_RUN},{headers:{"Cache-Control":"no-store"}});
  } catch(err) {
    console.error("[reactivation] cron failed",err);
    return NextResponse.json({error:"Contrôle des relances impossible."},{status:500});
  }
}
