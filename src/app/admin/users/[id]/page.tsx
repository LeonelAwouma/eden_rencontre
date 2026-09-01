"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  User,
  MapPin,
  Briefcase,
  Heart,
  Calendar,
  Mail,
  Globe,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkQuestionnaireCompletion } from "@/lib/onboarding";
import { isProfileFullyComplete } from "@/lib/profile-completion";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  gender: string;
  status: string;
  city: string;
  country: string;
  region: string;
  civil_status: string;
  profession: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  birth_date: string;
  marriage_vision: string[];
  rejection_reason: string | null;
  reviewed_at: string | null;
  questionnaire: Record<string, unknown>;
  onboarding_completed: boolean;
  selfie_verified: boolean;
  selfie_verification_score: number;
  verification_status: string;
  verification_rejection_reason: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
  suspended: "Suspendu",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  suspended: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showVerifyRejectModal, setShowVerifyRejectModal] = useState(false);
  const [verifyRejectReason, setVerifyRejectReason] = useState("");

  // Compute questionnaire completion status
  const questionnaireCompletion = useMemo(() => {
    if (!user?.questionnaire) return { answered: 0, total: 0, percentage: 0, unansweredIds: [] as string[] };
    return checkQuestionnaireCompletion(
      (user.questionnaire as Record<string, unknown>) || {},
      { excludeOptional: true }
    );
  }, [user?.questionnaire]);

  // Can admin grant verification badge? User must have completed onboarding + all required questions answered + profile 100%
  const canGrantBadge = user?.onboarding_completed && questionnaireCompletion.percentage === 100 && isProfileFullyComplete(user || {}) && user?.verification_status !== "verified";

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  const handleAction = async (action: "approve" | "reject" | "suspend", reason?: string) => {
    setActionLoading(action);
    try {
      const body: Record<string, string> = {};
      if (reason) body.reason = reason;

      const res = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Refresh user data
        const data = await res.json();
        const userRes = await fetch(`/api/admin/users/${userId}`);
        const userData = await userRes.json();
        if (userData.user) setUser(userData.user);
        setShowRejectModal(false);
        setShowSuspendModal(false);
        setRejectReason("");
        setSuspendReason("");
      }
    } catch (err) {
      console.error(`Error ${action}ing user:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyAction = async (action: "approve" | "reject", reason?: string) => {
    setActionLoading(action === "approve" ? "verify_approve" : "verify_reject");
    try {
      const body: Record<string, string> = { action };
      if (reason) body.reason = reason;

      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const userRes = await fetch(`/api/admin/users/${userId}`);
        const userData = await userRes.json();
        if (userData.user) setUser(userData.user);
        setShowVerifyRejectModal(false);
        setVerifyRejectReason("");
      }
    } catch (err) {
      console.error(`Error ${action}ing verification:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-500">Utilisateur introuvable</p>
        <Link href="/admin/users" className="text-[#2D5016] text-sm font-medium hover:underline mt-2 inline-block">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const age = user.birth_date
    ? Math.floor((Date.now() - new Date(user.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {user.name || "Sans nom"}
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <span
          className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
            STATUS_COLORS[user.status] || "bg-gray-100 text-gray-500"
          }`}
        >
          {STATUS_LABELS[user.status] || user.status}
        </span>
      </div>

      {/* Action Buttons */}
      {user.status === "pending" && (
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => handleAction("approve")}
            disabled={!!actionLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {actionLoading === "approve" ? "Approbation…" : "Approuver"}
          </Button>
          <Button
            onClick={() => setShowRejectModal(true)}
            disabled={!!actionLoading}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 rounded-lg gap-2"
          >
            <XCircle className="w-4 h-4" />
            Rejeter
          </Button>
          <Button
            onClick={() => setShowSuspendModal(true)}
            disabled={!!actionLoading}
            variant="outline"
            className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg gap-2"
          >
            <Ban className="w-4 h-4" />
            Suspendre
          </Button>
        </div>
      )}

      {user.status === "approved" && (
        <div className="flex gap-3">
          <Button
            onClick={() => setShowSuspendModal(true)}
            disabled={!!actionLoading}
            variant="outline"
            className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg gap-2"
          >
            <Ban className="w-4 h-4" />
            Suspendre le compte
          </Button>
        </div>
      )}

      {user.status === "rejected" && (
        <div className="flex gap-3">
          <Button
            onClick={() => handleAction("approve")}
            disabled={!!actionLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approuver finalement
          </Button>
        </div>
      )}

      {user.status === "suspended" && (
        <div className="flex gap-3">
          <Button
            onClick={() => handleAction("approve")}
            disabled={!!actionLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Réactiver le compte
          </Button>
        </div>
      )}

      {/* User Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-5">
              Informations personnelles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoItem icon={User} label="Nom" value={user.name} />
              <InfoItem icon={Mail} label="Email" value={user.email} />
              <InfoItem icon={Calendar} label="Âge" value={age ? `${age} ans` : null} />
              <InfoItem
                icon={User}
                label="Genre"
                value={user.gender === "homme" ? "Homme" : user.gender === "femme" ? "Femme" : user.gender}
              />
              <InfoItem icon={FileText} label="Situation" value={user.civil_status} />
              <InfoItem icon={Briefcase} label="Profession" value={user.profession} />
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-5">
              Localisation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <InfoItem icon={Globe} label="Région" value={user.region} />
              <InfoItem icon={MapPin} label="Pays" value={user.country} />
              <InfoItem icon={MapPin} label="Ville" value={user.city} />
            </div>
          </div>

          {/* Values */}
          {user.marriage_vision && user.marriage_vision.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-5">
                Valeurs matrimoniales
              </h2>
              <div className="flex flex-wrap gap-2">
                {user.marriage_vision.map((v) => (
                  <span
                    key={v}
                    className="px-3 py-1.5 bg-[#2D5016]/10 text-[#2D5016] text-sm font-medium rounded-lg"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {user.bio && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-5">
                Biographie
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* Rejection reason */}
          {user.rejection_reason && (
            <div className="bg-red-50 rounded-xl border border-red-100 p-6">
              <h2 className="text-sm font-bold text-red-700 uppercase tracking-widest mb-3">
                Motif de rejet
              </h2>
              <p className="text-sm text-red-600">{user.rejection_reason}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account info */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-5">
              Compte
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">ID</p>
                <p className="text-xs text-gray-600 font-mono mt-0.5 break-all">{user.id}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Inscrit le</p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {new Date(user.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              {user.reviewed_at && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Examiné le</p>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {new Date(user.reviewed_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Onboarding</p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {user.onboarding_completed ? "✅ Terminé" : "⏳ En cours"}
                </p>
              </div>
              {/* Questionnaire Completion */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Questionnaire</p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {questionnaireCompletion.percentage === 100 ? (
                    <span className="text-emerald-600 font-medium">
                      ✅ Complet ({questionnaireCompletion.answered}/{questionnaireCompletion.total} réponses)
                    </span>
                  ) : (
                    <span className="text-amber-600">
                      ⏳ {questionnaireCompletion.answered}/{questionnaireCompletion.total} réponses ({questionnaireCompletion.percentage}%)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Vérification selfie</p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {user.selfie_verified
                    ? `✅ Vérifié (Score : ${user.selfie_verification_score || 0}%)`
                    : "⏳ Non vérifié"}
                </p>
              </div>
              {/* Verification Status */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Badge « Profil Vérifié »</p>
                <p className="text-sm mt-0.5">
                  {(!user.verification_status || user.verification_status === "none") && (
                    <span className="text-gray-500">⏳ Non demandé</span>
                  )}
                  {user.verification_status === "under_review" && (
                    <span className="text-amber-600 font-medium">🔍 En cours de révision</span>
                  )}
                  {user.verification_status === "verified" && isProfileFullyComplete(user) && (
                    <span className="text-emerald-600 font-medium">✅ Profil Vérifié</span>
                  )}
                  {user.verification_status === "verified" && !isProfileFullyComplete(user) && (
                    <span className="text-amber-600 font-medium" title="Le profil est passé sous 100% de complétion depuis l'attribution du badge.">
                      ⚠️ Vérifié, mais profil incomplet
                    </span>
                  )}
                  {user.verification_status === "rejected" && (
                    <span className="text-red-600 font-medium">❌ Non approuvé</span>
                  )}
                </p>
                {user.verification_status === "rejected" && user.verification_rejection_reason && (
                  <p className="text-xs text-gray-500 mt-1">Raison : {user.verification_rejection_reason}</p>
                )}
              </div>
            </div>

            {/* Verification Actions */}
            {canGrantBadge && (
              <div className="mt-4 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">
                  {user.verification_status === "under_review"
                    ? "Action requise — Vérification du profil"
                    : "Accorder le badge « Profil Vérifié »"}
                </p>
                {user.verification_status !== "under_review" && (
                  <p className="text-xs text-emerald-600 mb-3">
                    Ce profil est complet. Vous pouvez accorder le badge de vérification directement.
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleVerifyAction("approve")}
                    disabled={!!actionLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                  >
                    {actionLoading === "verify_approve" ? "Validation…" : "✅ Approuver le badge"}
                  </Button>
                  <Button
                    onClick={() => setShowVerifyRejectModal(true)}
                    disabled={!!actionLoading}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    ❌ Rejeter
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Rejeter l'inscription</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              L'utilisateur recevra un email l'informant du rejet.
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Motif (optionnel)
              </Label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Indiquez la raison du rejet…"
                className="w-full h-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:border-[#2D5016]"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowRejectModal(false)}
                variant="outline"
                className="flex-1 rounded-lg"
              >
                Annuler
              </Button>
              <Button
                onClick={() => handleAction("reject", rejectReason)}
                disabled={!!actionLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                {actionLoading === "reject" ? "Rejet…" : "Confirmer le rejet"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Suspendre le compte</h3>
              <button onClick={() => setShowSuspendModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              L'utilisateur sera notifié par email et perdra l'accès à la plateforme.
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Motif (optionnel)
              </Label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Indiquez la raison de la suspension…"
                className="w-full h-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:border-[#2D5016]"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowSuspendModal(false)}
                variant="outline"
                className="flex-1 rounded-lg"
              >
                Annuler
              </Button>
              <Button
                onClick={() => handleAction("suspend", suspendReason)}
                disabled={!!actionLoading}
                className="flex-1 bg-gray-800 hover:bg-gray-900 text-white rounded-lg"
              >
                {actionLoading === "suspend" ? "Suspension…" : "Confirmer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Reject Modal */}
      {showVerifyRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Rejeter la vérification</h3>
              <button onClick={() => setShowVerifyRejectModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              L'utilisateur sera notifié que sa demande de badge « Profil Vérifié » n'a pas été approuvée.
            </p>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Motif (recommandé)
              </Label>
              <textarea
                value={verifyRejectReason}
                onChange={(e) => setVerifyRejectReason(e.target.value)}
                placeholder="Indiquez la raison du rejet de la vérification…"
                className="w-full h-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:border-[#2D5016]"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowVerifyRejectModal(false)}
                variant="outline"
                className="flex-1 rounded-lg"
              >
                Annuler
              </Button>
              <Button
                onClick={() => handleVerifyAction("reject", verifyRejectReason)}
                disabled={!!actionLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                {actionLoading === "verify_reject" ? "Rejet…" : "Confirmer le rejet"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-sm text-gray-700 mt-0.5">{value || "—"}</p>
      </div>
    </div>
  );
}