"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getMyAccountStatus, logout, saveMyPseudo, isValidPseudo } from "@/lib/auth";
import { Monogram } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import { LoadingScreen } from "@/components/loading-screen";

/**
 * Espace membre réservé aux comptes approuvés par l'admin.
 *
 * La connexion email passe par /api/auth/login qui refuse les comptes non
 * approuvés, mais une session peut s'ouvrir autrement (Google OAuth, session
 * encore active quand l'admin suspend le compte). On revérifie donc le statut
 * à chaque entrée dans l'espace membre ; sans approbation, la session est
 * fermée et l'utilisateur renvoyé vers la page adaptée.
 *
 * Deux informations sont aussi exigées avant d'entrer :
 *  - le profil de base (genre, pays, ville) → page « Complétez votre profil » ;
 *  - le pseudonyme public → demandé ici même, quelle que soit la page visitée.
 */
export function MemberGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [needsPseudo, setNeedsPseudo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let account: Awaited<ReturnType<typeof getMyAccountStatus>>;
      try {
        account = await getMyAccountStatus();
      } catch {
        account = null;
      }
      if (cancelled) return;
      if (!account) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
        return;
      }
      // Profil de base incomplet (souvent une inscription Google interrompue) : on
      // garde la session et on renvoie vers le formulaire, avant tout le reste.
      if (!account.profileComplete && account.status !== "rejected" && account.status !== "suspended") {
        router.replace("/onboarding/complete-registration");
        return;
      }
      if (account.status === "approved") {
        if (!account.pseudo) {
          // Pseudo choisi autrefois mais resté dans la session : on le reporte en silence.
          if (account.sessionPseudo && isValidPseudo(account.sessionPseudo)) {
            const res = await saveMyPseudo(account.sessionPseudo);
            if (cancelled) return;
            if (res.ok) { setAllowed(true); return; }
          }
          setNeedsPseudo(true);
          return;
        }
        setAllowed(true);
        return;
      }
      await logout();
      if (cancelled) return;
      if (account.status === "pending") {
        router.replace(`/register/pending?email=${encodeURIComponent(account.email)}`);
      } else {
        router.replace(`/login?blocked=${account.status}`);
      }
    })();
    return () => { cancelled = true; };
  }, [router, pathname]);

  if (needsPseudo && !allowed) {
    return <PseudoPrompt onDone={() => { setNeedsPseudo(false); setAllowed(true); }} />;
  }

  if (!allowed) {
    return (
      <LoadingScreen />
    );
  }
  return <>{children}</>;
}

/** Demande du pseudonyme public, bloquante tant qu'il n'est pas enregistré. */
function PseudoPrompt({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = isValidPseudo(value);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) { setError(t("completeRegistration.pseudoInvalid")); return; }
    setSaving(true);
    setError(null);
    const res = await saveMyPseudo(value);
    setSaving(false);
    if (res.ok) onDone();
    else setError(res.error || t("completeRegistration.pseudoInvalid"));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-md bg-card rounded-3xl border border-foreground/5 shadow-xl p-7 sm:p-9 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <Monogram className="w-11 h-9 text-primary" />
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">{t("dashboard.choosePseudoTitle")}</h1>
          <p className="text-sm text-foreground/60">{t("dashboard.choosePseudoDesc")}</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="member-pseudo" className="sr-only">{t("register.pseudoLabel")}</label>
          <input
            id="member-pseudo"
            autoFocus
            maxLength={30}
            autoComplete="nickname"
            placeholder={t("register.pseudoPlaceholder")}
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            className="w-full h-12 rounded-xl border border-foreground/10 bg-background px-4 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={saving || !value.trim()}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("dashboard.pseudoConfirm")}
        </button>
      </form>
    </div>
  );
}
