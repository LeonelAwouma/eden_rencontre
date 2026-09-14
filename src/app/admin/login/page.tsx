"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Monogram } from "@/components/ornaments";

/**
 * Connexion à l'espace d'administration.
 *
 * Surface sobre : c'est une porte, pas une vitrine. Les ornements du jardin
 * restent dehors ; on garde le monogramme, le vert forêt et le crème.
 */
export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Une erreur qui apparaît sous le formulaire passe inaperçue :
  // on y amène le focus pour que lecteurs d'écran et clavier la reçoivent.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const readCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState?.("CapsLock") ?? false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Identifiants incorrects.");
        setLoading(false);
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setError("Connexion au serveur impossible. Réessayez dans un instant.");
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full h-12 pl-11 pr-4 rounded-xl border border-[#DFDCD6] bg-white text-[15px] text-[#2F2F2F] " +
    "placeholder:text-[#6B746E]/70 transition-[border-color,box-shadow] duration-200 " +
    "focus:outline-none focus:border-[#486B46] focus:ring-4 focus:ring-[#486B46]/[0.12] " +
    "disabled:bg-[#F6F5F2] disabled:text-[#6B746E] " +
    "aria-[invalid=true]:border-[#B42318] aria-[invalid=true]:ring-[#B42318]/[0.12]";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FAF9F6]">
      {/* Halos très lavés — de la profondeur, pas de décor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-25%] right-[-12%] w-[420px] h-[420px] sm:w-[640px] sm:h-[640px] rounded-full bg-[#486B46]/[0.05] blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-12%] w-[340px] h-[340px] sm:w-[520px] sm:h-[520px] rounded-full bg-[#8FB98A]/[0.07] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[440px]"
      >
        <div className="bg-white rounded-3xl border border-[#E8E5E0] shadow-[0_1px_2px_rgba(47,47,47,0.04),0_18px_48px_-20px_rgba(47,47,47,0.16)] p-7 sm:p-9">
          {/* ── En-tête ── */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#486B46]/[0.07] ring-1 ring-[#486B46]/[0.12] flex items-center justify-center mb-5">
              <Monogram className="w-9 h-8 text-[#486B46]" />
            </div>

            <p className="text-[13px] font-semibold text-[#2F2F2F] tracking-tight">
              Garden{" "}
              <span
                className="italic font-normal text-[#486B46]"
                style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
              >
                of Alliance
              </span>
            </p>

            <h1
              className="text-[26px] sm:text-[28px] font-bold tracking-tight text-[#2F2F2F] mt-2"
              style={{ fontFamily: "'Playfair Display', 'Cormorant Garamond', serif" }}
            >
              Espace administration
            </h1>

            <p className="text-[13.5px] text-[#6B746E] mt-2 leading-relaxed max-w-[300px]">
              Identifiez-vous pour accéder à la console de modération et de gestion.
            </p>
          </div>

          {/* ── Formulaire ── */}
          <form onSubmit={handleSubmit}>
            {/* Le fieldset gèle tout le formulaire pendant l'envoi, bouton compris */}
            <fieldset disabled={loading} className="border-0 p-0 m-0 space-y-5">
              <legend className="sr-only">Identifiants administrateur</legend>

              {/* Email */}
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-[12px] font-semibold text-[#2F2F2F] mb-2"
                >
                  Adresse email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#6B746E]"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@edenconnexion.com"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "admin-login-error" : undefined}
                    className={fieldClass}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-[12px] font-semibold text-[#2F2F2F] mb-2"
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#6B746E]"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={readCapsLock}
                    onKeyDown={readCapsLock}
                    onBlur={() => setCapsLock(false)}
                    placeholder="Votre mot de passe"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                      [error ? "admin-login-error" : null, capsLock ? "admin-capslock" : null]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                    className={`${fieldClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                    }
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[#6B746E] hover:text-[#2F2F2F] hover:bg-[#F1F0EC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#486B46] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" aria-hidden="true" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Verrouillage majuscules : la première cause de saisie ratée */}
                {capsLock && (
                  <p
                    id="admin-capslock"
                    className="flex items-center gap-1.5 mt-2 text-[12px] font-medium text-[#8A5A00]"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    La touche Verr. Maj est active.
                  </p>
                )}
              </div>

              {/* Erreur */}
              {error && (
                <motion.div
                  ref={errorRef}
                  tabIndex={-1}
                  id="admin-login-error"
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#B42318]/[0.06] border border-[#B42318]/25 text-[13px] text-[#B42318] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B42318]/40"
                >
                  <AlertCircle className="w-[17px] h-[17px] shrink-0 mt-px" aria-hidden="true" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Envoi */}
              <button
                type="submit"
                aria-busy={loading}
                className="w-full h-12 rounded-xl bg-[#486B46] text-white text-[14.5px] font-semibold shadow-[0_4px_14px_-4px_rgba(72,107,70,0.45)] hover:bg-[#3D5C3C] hover:shadow-[0_6px_20px_-4px_rgba(72,107,70,0.5)] active:bg-[#35502F] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#486B46]/30 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none transition-[background-color,box-shadow] duration-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Connexion en cours…
                  </span>
                ) : (
                  "Se connecter"
                )}
              </button>
            </fieldset>
          </form>

          {/* ── Pied de carte ── */}
          <div className="mt-7 pt-5 border-t border-[#EFEDE8]">
            <p className="flex items-center justify-center gap-1.5 text-[12px] text-[#6B746E]">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#486B46]" aria-hidden="true" />
              Accès réservé aux administrateurs Garden of Alliance
            </p>
          </div>
        </div>

        {/* Porte de sortie vers le site public */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B746E] hover:text-[#486B46] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#486B46] rounded-md px-2 py-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Retour au site
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
