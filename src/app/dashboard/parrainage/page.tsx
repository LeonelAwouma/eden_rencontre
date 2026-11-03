"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gift, Copy, Check, Share2 } from "lucide-react";
import { Monogram } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

interface DashboardData {
  enabled: boolean;
  requiredReferrals: number;
  signupsCount: number;
  validatedCount: number;
  pendingCount: number;
  rejectedCount: number;
  rewards: { durationDays: number; status: string; grantedAt: string; activatedAt: string | null; expiresAt: string | null }[];
  goldActiveUntil: string | null;
  queuedCreditsDays: number;
  effectiveSource: string;
  history: { label: string; status: string; createdAt: string; validatedAt: string | null; rejectedAt: string | null }[];
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ReferralPage() {
  const { t, locale } = useI18n();
  const [code, setCode] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [copied, setCopied] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activateMsg, setActivateMsg] = useState<string | null>(null);

  const load = async () => {
    const headers = await authHeader();
    const [codeRes, dashRes] = await Promise.all([
      fetch("/api/referrals/code", { headers }),
      fetch("/api/referrals/dashboard", { headers }),
    ]);
    if (codeRes.ok) {
      const c = await codeRes.json();
      setCode(c.code);
      setUrl(c.url);
    }
    if (dashRes.ok) setData(await dashRes.json());
  };

  useEffect(() => { void load(); }, []);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const share = async () => {
    if (!url) return;
    const headers = await authHeader();
    const res = await fetch(`/api/referrals/share-copy?locale=${locale}&url=${encodeURIComponent(url)}`, { headers });
    const { text } = res.ok ? await res.json() : { text: url };
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const activate = async () => {
    setActivating(true);
    setActivateMsg(null);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/referrals/activate", { method: "POST", headers });
      const body = await res.json();
      if (res.ok) {
        setActivateMsg(t("referral.activateSuccess"));
        void load();
      } else {
        setActivateMsg(body.error || "");
      }
    } finally {
      setActivating(false);
    }
  };

  const required = data?.requiredReferrals ?? 3;
  const validated = data?.validatedCount ?? 0;
  const progressInCycle = required > 0 ? validated % required : 0;
  const remaining = Math.max(0, required - progressInCycle);
  const canActivate = (data?.queuedCreditsDays ?? 0) > 0 && data?.effectiveSource !== "launch_promo" && data?.effectiveSource !== "discovery";

  const statusLabel = (s: string) =>
    s === "validated" ? t("referral.statusValidated")
    : s === "rejected" ? t("referral.statusRejected")
    : s === "under_review" ? t("referral.statusUnderReview")
    : t("referral.statusPending");

  const rewardStatusLabel = (s: string) =>
    s === "active" ? t("referral.rewardStatusActive")
    : s === "expired" ? t("referral.rewardStatusExpired")
    : s === "revoked" ? t("referral.rewardStatusRevoked")
    : t("referral.rewardStatusPendingActivation");

  return (
    <div className="eden-public min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-2.5">
          <Link href="/dashboard" className="flex items-center gap-2 text-[14px] font-semibold text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <Monogram className="w-7 h-6 text-primary hidden sm:block" />
          </Link>
          <span className="font-headline text-[17px] font-bold">{t("referral.pageTitle")}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <section className="text-center max-w-xl mx-auto">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EEF5EE] mb-4">
            <Gift className="w-7 h-7 text-[#28543C]" aria-hidden="true" />
          </span>
          <h1 className="font-headline text-[26px] sm:text-[32px] font-bold text-foreground mb-2">{t("referral.pageTitle")}</h1>
          <p className="text-[15px] text-[#4A564F]">{t("referral.pageSubtitle", { count: required })}</p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#486B46] mb-3">{t("referral.linkCardTitle")}</h2>
          {url ? (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-[14px] text-foreground break-all">
                {url}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={copy} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#1F4D3A] text-white text-[14px] font-semibold hover:bg-[#28543C] transition-colors">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? t("referral.copied") : t("referral.copyButton")}
                </button>
                <button type="button" onClick={share} className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border text-[14px] font-semibold text-foreground hover:bg-muted transition-colors">
                  <Share2 className="w-4 h-4" /> {t("referral.shareWhatsapp")}
                </button>
              </div>
            </>
          ) : (
            <p className="text-[14px] text-[#777]">…</p>
          )}
        </section>

        {data && (
          <>
            <section className="rounded-3xl border border-border bg-card p-6">
              <p className="text-[14px] font-semibold text-foreground mb-2">{t("referral.progressLabel", { validated: progressInCycle, required })}</p>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (progressInCycle / required) * 100)}%` }} />
              </div>
              {remaining > 0 && remaining < required && (
                <p className="mt-2 text-[13px] text-[#56615A]">{t("referral.progressHint", { remaining })}</p>
              )}
            </section>

            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: t("referral.statsSignups"), value: data.signupsCount },
                { label: t("referral.statsValidated"), value: data.validatedCount },
                { label: t("referral.statsPending"), value: data.pendingCount },
                { label: t("referral.statsCreditsQueued"), value: data.queuedCreditsDays },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
                  <p className="text-[24px] font-bold text-[#28543C]">{s.value}</p>
                  <p className="text-[12px] text-[#56615A] mt-1">{s.label}</p>
                </div>
              ))}
            </section>

            {data.goldActiveUntil && (
              <p className="text-[14px] font-semibold text-primary text-center">
                {t("referral.goldActiveUntil", { date: new Date(data.goldActiveUntil).toLocaleDateString(locale) })}
              </p>
            )}

            {canActivate && (
              <div className="text-center">
                <button type="button" onClick={activate} disabled={activating}
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[#C6A15B] text-white text-[14px] font-bold hover:bg-[#B08F4E] transition-colors disabled:opacity-60">
                  {t("referral.activateNow")}
                </button>
                {activateMsg && <p className="mt-2 text-[13px] text-[#56615A]">{activateMsg}</p>}
              </div>
            )}

            <section className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#486B46] mb-3">{t("referral.historyTitle")}</h2>
              {data.history.length === 0 ? (
                <p className="text-[14px] text-[#777]">—</p>
              ) : (
                <ul className="space-y-2">
                  {data.history.map((h, i) => (
                    <li key={i} className="flex items-center justify-between text-[14px] border-b border-border/60 pb-2 last:border-0">
                      <span className="text-foreground">{h.label}</span>
                      <span className="text-[#56615A]">{statusLabel(h.status)} · {new Date(h.createdAt).toLocaleDateString(locale)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#486B46] mb-3">{t("referral.rewardsTitle")}</h2>
              {data.rewards.length === 0 ? (
                <p className="text-[14px] text-[#777]">—</p>
              ) : (
                <ul className="space-y-2">
                  {data.rewards.map((r, i) => (
                    <li key={i} className="flex items-center justify-between text-[14px] border-b border-border/60 pb-2 last:border-0">
                      <span className="text-foreground">{r.durationDays} j · {new Date(r.grantedAt).toLocaleDateString(locale)}</span>
                      <span className="text-[#56615A]">{rewardStatusLabel(r.status)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
