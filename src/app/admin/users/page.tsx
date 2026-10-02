"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  ShieldCheck,
  Crown,
  CreditCard,
  MessageCircle,
  X,
  User,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { isProfileFullyComplete } from "@/lib/profile-completion";
import { checkQuestionnaireCompletion } from "@/lib/onboarding";
import { PageHeader } from "@/components/admin/page-header";
import { EMAIL_NOT_SENT } from "@/lib/admin-email-warning";

/** Mêmes conditions que la fiche membre et que l'API /verify : profil ET questionnaire complets. */
function canGrantBadge(user: { status?: string; onboarding_completed?: boolean; verification_status?: string; questionnaire?: Record<string, unknown> | null } & Record<string, any>) {
  return user.status === "approved"
    && !!user.onboarding_completed
    && user.verification_status !== "verified"
    && isProfileFullyComplete(user)
    && checkQuestionnaireCompletion(user.questionnaire || {}, { excludeOptional: true }).percentage === 100;
}

interface CharterAcceptance {
  authorize_verification: boolean;
  commit_respectful_conversations: boolean;
  accept_full_charter: boolean;
  all_accepted: boolean;
  accepted_at: string | null;
  charter_version: string;
}

interface UserProfile {
  id: string;
  name: string;
  pseudo?: string | null;
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
  charter_accepted?: boolean;
  charter_accepted_at?: string | null;
  charter_acceptances?: CharterAcceptance | CharterAcceptance[] | null;
  onboarding_completed?: boolean;
  verification_status?: string;
  questionnaire?: Record<string, unknown> | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Tous", icon: Users },
  { value: "pending", label: "En attente", icon: Clock },
  { value: "approved", label: "Approuvés", icon: CheckCircle2 },
  { value: "rejected", label: "Rejetés", icon: XCircle },
  { value: "suspended", label: "Suspendus", icon: Ban },
  { value: "verification_pending", label: "Vérification", icon: ShieldCheck },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
  suspended: "Suspendu",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "eden-badge-pending",
  approved: "eden-badge-approved",
  rejected: "eden-badge-rejected",
  suspended: "eden-badge-suspended",
};

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [planFilter, setPlanFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (planFilter !== "all") params.set("plan", planFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, planFilter, searchQuery, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleQuickAction = async (
    userId: string,
    action: "approve" | "reject" | "suspend"
  ) => {
    try {
      setActionError(null);
      const res = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        fetchUsers();
        // Action enregistrée, mais le membre n'a pas été prévenu : l'admin doit le savoir.
        if (data.emailSent === false) {
          setEmailWarning(`${EMAIL_NOT_SENT[action as keyof typeof EMAIL_NOT_SENT]}${data.emailError ? ` Cause : ${data.emailError}` : ""}`);
          setTimeout(() => setEmailWarning(null), 20000);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || `Erreur lors de l'action "${action}".`);
        setTimeout(() => setActionError(null), 5000);
      }
    } catch (err) {
      console.error(`Error ${action}ing user:`, err);
      setActionError("Erreur réseau. Veuillez réessayer.");
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleVerifyBadge = async (userId: string) => {
    try {
      setActionError(null);
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || "Erreur lors de l'attribution du badge.");
        setTimeout(() => setActionError(null), 5000);
      }
    } catch (err) {
      console.error("Error granting verification badge:", err);
      setActionError("Erreur réseau. Veuillez réessayer.");
      setTimeout(() => setActionError(null), 5000);
    }
  };

  return (
    <>
      

      <PageHeader
        title="Utilisateurs"
        subtitle={`${total} utilisateur${total !== 1 ? "s" : ""} au total`}
      />

      {/* Error banner */}
      {emailWarning && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-[13px] font-medium text-amber-800"
        >
          {emailWarning}
        </motion.div>
      )}
      {actionError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-[13px] font-medium text-destructive"
        >
          {actionError}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6"
      >
        {/* Status filter tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 border border-border overflow-x-auto">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all duration-200",
                statusFilter === opt.value
                  ? "bg-white text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-muted-foreground"
              )}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Plan filter */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 border border-border overflow-x-auto">
          {[
            { value: "all", label: "Tous plans", icon: CreditCard },
            { value: "free", label: "Gratuit", icon: Users },
            { value: "essentiel", label: "Essentiel", icon: Crown },
            { value: "premium", label: "Premium", icon: Crown },
            { value: "elite", label: "Élite", icon: Crown },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setPlanFilter(opt.value);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all duration-200",
                planFilter === opt.value
                  ? "bg-white text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-muted-foreground"
              )}
            >
              <opt.icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Rechercher nom, email, ville…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-success/20 focus:border-success transition-all font-medium"
            />
          </div>
        </form>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-[20px] border border-border overflow-hidden"
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-[3px] border-success/20 border-t-[#38C172] rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-muted-foreground mt-3 font-medium">Chargement…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
              <UserCheck className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-[15px] font-semibold text-muted-foreground">Aucun utilisateur trouvé</p>
            <p className="text-[13px] text-muted-foreground mt-1">Modifiez vos filtres pour voir plus de résultats</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-4 py-4">
                      Utilisateur
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-4 py-4">
                      Localisation
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-4 py-4">
                      Statut
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-4 py-4">
                      Charte
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-4 py-4">
                      Vérification
                    </th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-4 py-4">
                      Inscrit le
                    </th>
                    <th className="text-right text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground px-4 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {users.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className="hover:bg-muted transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 group/name">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-success/20 to-success/30 flex items-center justify-center text-[13px] font-bold text-success shrink-0">
                            {(user.pseudo || user.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-foreground group-hover/name:text-success transition-colors">
                              {user.name || user.pseudo || "Sans nom"}
                              {user.name && user.pseudo && (
                                <span className="text-muted-foreground font-normal"> · {user.pseudo}</span>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium">{user.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[13px] text-muted-foreground font-medium">
                          {[user.city, user.country].filter(Boolean).join(", ") || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            // inline-flex + nowrap : en inline simple, « EN ATTENTE »
                            // se coupait entre ses deux mots, et la pastille avec.
                            "inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                            STATUS_CLASSES[user.status] || "bg-muted text-muted-foreground"
                          )}
                        >
                          {STATUS_LABELS[user.status] || user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {(() => {
                          const ca = Array.isArray(user.charter_acceptances)
                            ? user.charter_acceptances[0]
                            : user.charter_acceptances;
                          const accepted = ca?.all_accepted || user.charter_accepted;
                          if (accepted) {
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success/10 text-success">
                                  <ShieldCheck className="w-3 h-3 inline mr-1" /> Acceptée
                                </span>
                                {ca?.accepted_at && (
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {formatDate(ca.accepted_at)}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return (
                            <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-warning/10 text-warning">
                              En attente
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3.5">
                        {user.verification_status === "verified" && isProfileFullyComplete(user) && (
                          <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success/10 text-success">
                            ✅ Vérifié
                          </span>
                        )}
                        {user.verification_status === "verified" && !isProfileFullyComplete(user) && (
                          <span title="Le profil est passé sous 100% de complétion depuis l'attribution du badge."
                            className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-warning/10 text-warning">
                            ⚠️ Profil incomplet
                          </span>
                        )}
                        {user.verification_status === "under_review" && (
                          <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-warning/10 text-warning">
                            🔍 En révision
                          </span>
                        )}
                        {user.verification_status === "rejected" && (
                          <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
                            ❌ Rejeté
                          </span>
                        )}
                        {(!user.verification_status || user.verification_status === "none") && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">—</span>
                        )}
                      </td>
                       <td className="px-4 py-3.5">
                        <p className="text-[13px] text-muted-foreground font-medium">
                          {formatDate(user.created_at)}
                        </p>
                      </td>
                       <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingUser(user)}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground shadow-sm border border-border hover:bg-success/10 hover:text-primary hover:border-border hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#486B46] transition-all duration-200"
                            title="Voir la photo"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/admin/chat-monitoring?user=${user.id}`}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10 text-primary shadow-sm border border-primary/20 hover:bg-primary/20 hover:text-primary hover:border-primary/35 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#486B46] transition-all duration-200"
                            title="Surveiller les conversations"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Link>
                          {user.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleQuickAction(user.id, "approve")}
                                className="w-9 h-9 rounded-full flex items-center justify-center bg-warning/10 text-warning shadow-sm border border-warning/20 hover:bg-warning/20 hover:text-warning hover:border-warning/35 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C27D30] transition-all duration-200"
                                title="Approuver"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleQuickAction(user.id, "reject")}
                                className="w-9 h-9 rounded-full flex items-center justify-center bg-destructive/10 text-destructive shadow-sm border border-destructive/20 hover:bg-destructive/20 hover:text-destructive hover:border-destructive/35 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E53E3E] transition-all duration-200"
                                title="Rejeter"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {canGrantBadge(user) && (
                            <button
                              onClick={() => handleVerifyBadge(user.id)}
                              className="w-9 h-9 rounded-full flex items-center justify-center bg-deep-eden/10 text-deep-eden shadow-sm border border-deep-eden/20 hover:bg-deep-eden/20 hover:text-deep-eden hover:border-deep-eden/35 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED] transition-all duration-200"
                              title="Attribuer le badge « Profil Vérifié »"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-muted">
              {users.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-success/20 to-success/30 flex items-center justify-center text-[13px] font-bold text-success">
                      {(user.pseudo || user.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {user.name || user.pseudo || "Sans nom"}
                        {user.name && user.pseudo && (
                          <span className="text-muted-foreground font-normal"> · {user.pseudo}</span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate font-medium">{user.email}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                        STATUS_CLASSES[user.status] || "bg-gray-100 text-gray-500"
                      )}
                    >
                      {STATUS_LABELS[user.status]}
                    </span>
                  </div>
                  {/* Charter acceptance badge — mobile */}
                  <div className="mb-3">
                    {(() => {
                      const ca = Array.isArray(user.charter_acceptances)
                        ? user.charter_acceptances[0]
                        : user.charter_acceptances;
                      const accepted = ca?.all_accepted || user.charter_accepted;
                      if (accepted) {
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success/10 text-success">
                              <ShieldCheck className="w-3 h-3 inline mr-1" /> Charte acceptée
                            </span>
                            {ca?.accepted_at && (
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {formatDate(ca.accepted_at)}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-warning/10 text-warning">
                          Charte en attente
                        </span>
                      );
                    })()}
                  </div>
                  {/* Verification badge — mobile */}
                  <div className="mb-3">
                    {user.verification_status === "verified" && isProfileFullyComplete(user) && (
                      <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-success/10 text-success">
                        ✅ Profil Vérifié
                      </span>
                    )}
                    {user.verification_status === "verified" && !isProfileFullyComplete(user) && (
                      <span title="Le profil est passé sous 100% de complétion depuis l'attribution du badge."
                        className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-warning/10 text-warning">
                        ⚠️ Profil incomplet
                      </span>
                    )}
                    {user.verification_status === "under_review" && (
                      <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-warning/10 text-warning">
                        🔍 Vérification en cours
                      </span>
                    )}
                    {user.verification_status === "rejected" && (
                      <span className="inline-flex items-center whitespace-nowrap text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
                        ❌ Vérification rejetée
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingUser(user)}
                      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-muted-foreground bg-muted border border-border hover:bg-success/10 hover:text-primary transition-colors"
                      title="Voir la photo"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="flex-1 text-center text-[12px] font-semibold text-success bg-success/5 py-2.5 rounded-xl hover:bg-success/10 transition-colors"
                    >
                      Voir le profil
                    </Link>
                    <Link
                      href={`/admin/chat-monitoring?user=${user.id}`}
                      className="flex-1 text-center text-[12px] font-semibold text-primary bg-primary/5 py-2.5 rounded-xl hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Conversations
                    </Link>
                    {user.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleQuickAction(user.id, "approve")}
                          className="flex-1 text-center text-[12px] font-semibold text-success bg-success/5 py-2.5 rounded-xl hover:bg-success/10 transition-colors"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => handleQuickAction(user.id, "reject")}
                          className="flex-1 text-center text-[12px] font-semibold text-destructive bg-destructive/5 py-2.5 rounded-xl hover:bg-destructive/10 transition-colors"
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                    {canGrantBadge(user) && (
                      <button
                        onClick={() => handleVerifyBadge(user.id)}
                        className="flex-1 text-center text-[12px] font-semibold text-deep-eden bg-deep-eden/5 py-2.5 rounded-xl hover:bg-deep-eden/10 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Badge Vérifié
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                <p className="text-[12px] text-muted-foreground font-medium">
                  Page {page} sur {totalPages}
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted border border-border disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted border border-border disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Photo lightbox */}
      {viewingUser && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewingUser(null)}
        >
          <button
            onClick={() => setViewingUser(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full aspect-square bg-muted flex items-center justify-center">
              {viewingUser.avatar_url ? (
                <img
                  src={viewingUser.avatar_url}
                  alt={viewingUser.name || "Photo de profil"}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <User className="w-16 h-16" />
                  <p className="text-[12px] font-medium">Aucune photo</p>
                </div>
              )}
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground truncate">
                  {viewingUser.name || viewingUser.pseudo || "Sans nom"}
                  {viewingUser.name && viewingUser.pseudo && (
                    <span className="text-muted-foreground font-normal"> · {viewingUser.pseudo}</span>
                  )}
                </p>
                <p className="text-[12px] text-muted-foreground truncate">{viewingUser.email}</p>
              </div>
              <Link
                href={`/admin/users/${viewingUser.id}`}
                className="shrink-0 text-[12px] font-semibold text-success bg-success/10 px-3.5 py-2 rounded-xl hover:bg-success/20 transition-colors"
              >
                Voir le profil
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}