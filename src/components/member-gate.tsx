"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, RefreshCw, LogIn } from "lucide-react";
import { getMyAccountStatus, logout, saveMyPseudo, saveMyPhone, isValidPseudo, AccountStatusUnavailableError } from "@/lib/auth";
import { PhoneInput } from "@/components/phone-input";
import { dialOfIso, phoneIsoFor, toE164 } from "@/lib/geo";
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
 * Trois informations sont aussi exigées avant d'entrer :
 *  - le profil de base (genre, pays, ville) → page « Complétez votre profil » ;
 *  - le pseudonyme public → demandé ici même, quelle que soit la page visitée ;
 *  - le numéro de téléphone → demandé ici même aux membres inscrits avant
 *    qu'il ne fasse partie de l'inscription.
 */
export function MemberGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [needsPseudo, setNeedsPseudo] = useState(false);
  /** Pays du profil, pour préremplir l'indicatif ; non nul = numéro à demander. */
  const [phoneCountry, setPhoneCountry] = useState<string | null>(null);
  /** Statut illisible (erreur technique) : écran d'erreur, jamais « en attente » ni « déconnecté ». */
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let account: Awaited<ReturnType<typeof getMyAccountStatus>>;
      try {
        account = await getMyAccountStatus();
      } catch (err) {
        if (cancelled) return;
        // Erreur technique (déjà signalée à l'admin par getMyAccountStatus) :
        // on le dit au membre au lieu de le renvoyer ailleurs sans explication.
        if (err instanceof AccountStatusUnavailableError) { setUnavailable(true); return; }
        account = null;
      }
      if (cancelled) return;
      setUnavailable(false);
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
            if (res.ok) { if (account.hasPhone) setAllowed(true); else setPhoneCountry(account.country || ""); return; }
          }
          setNeedsPseudo(true);
          if (!account.hasPhone) setPhoneCountry(account.country || "");
          return;
        }
        if (!account.hasPhone) { setPhoneCountry(account.country || ""); return; }
        setAllowed(true);
        return;
      }
      // En attente : la session est gardée, la page d'attente surveille le
      // statut et fait entrer le membre dès la validation.
      if (account.status === "pending") {
        router.replace(`/register/pending?email=${encodeURIComponent(account.email)}`);
        return;
      }
      await logout();
      if (cancelled) return;
      router.replace(`/login?blocked=${account.status}`);
    })();
    return () => { cancelled = true; };
  }, [router, pathname, attempt]);

  if (unavailable) {
    return <AccountUnavailable onRetry={() => { setUnavailable(false); setAttempt((n) => n + 1); }} />;
  }

  if (needsPseudo && !allowed) {
    return <PseudoPrompt onDone={() => { setNeedsPseudo(false); if (phoneCountry === null) setAllowed(true); }} />;
  }

  if (phoneCountry !== null && !allowed) {
    return <PhonePrompt country={phoneCountry} onDone={() => { setPhoneCountry(null); setAllowed(true); }} />;
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

/** Numéro de téléphone, bloquant tant qu'il n'est pas enregistré (membres inscrits avant qu'il soit demandé). */
function PhonePrompt({ country, onDone }: { country: string; onDone: () => void }) {
  const { t } = useI18n();
  const [iso, setIso] = useState(() => phoneIsoFor(country));
  const [local, setLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone = toE164(dialOfIso(iso), local);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) { setError(t("phone.invalid")); return; }
    setSaving(true);
    setError(null);
    const res = await saveMyPhone(phone);
    setSaving(false);
    if (res.ok) onDone();
    else setError(res.error || t("phone.invalid"));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-5">
      <form onSubmit={submit} className="w-full max-w-md bg-card rounded-3xl border border-foreground/5 shadow-xl px-4 py-7 sm:p-9 space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <Monogram className="w-11 h-9 text-primary" />
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">{t("dashboard.phonePromptTitle")}</h1>
          <p className="text-sm text-foreground/60">{t("dashboard.phonePromptDesc")}</p>
        </div>
        <div className="space-y-2 text-left">
          <PhoneInput iso={iso} local={local} onIso={(v) => { setIso(v); setError(null); }} onLocal={(v) => { setLocal(v); setError(null); }} />
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={saving || !phone}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("dashboard.pseudoConfirm")}
        </button>
      </form>
    </div>
  );
}

/**
 * Statut du compte illisible : le membre est connecté mais le site n'arrive
 * pas à vérifier son compte. L'incident est déjà signalé à l'admin.
 * « Me reconnecter » renouvelle la session, ce qui suffit le plus souvent.
 */
function AccountUnavailable({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const reconnect = async () => {
    setBusy(true);
    await logout().catch(() => {});
    router.replace("/login");
  };
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-5">
      <div role="alert" className="w-full max-w-md bg-card rounded-3xl border border-foreground/5 shadow-xl px-5 py-8 sm:p-9 space-y-6 text-center">
        <Monogram className="w-11 h-9 text-primary mx-auto" />
        <div className="space-y-2">
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">{t("memberGate.unavailableTitle")}</h1>
          <p className="text-sm text-foreground/60">{t("memberGate.unavailableDesc")}</p>
        </div>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={onRetry} disabled={busy}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            <RefreshCw className="w-4 h-4" /> {t("memberGate.retry")}
          </button>
          <button type="button" onClick={reconnect} disabled={busy}
            className="w-full h-12 rounded-xl border border-foreground/10 text-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} {t("memberGate.reconnect")}
          </button>
        </div>
      </div>
    </div>
  );
}
