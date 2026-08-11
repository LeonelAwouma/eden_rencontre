"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { Monogram } from "@/components/ornaments";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        setError(data.error || "Identifiants incorrects");
        setLoading(false);
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setError("Erreur de connexion au serveur");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background:
          "linear-gradient(135deg, #FAF9F6 0%, #F8F5F2 40%, rgba(134, 239, 172, 0.04) 70%, #FAF9F6 100%)",
      }}
    >
      {/* Subtle background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] rounded-full bg-[#486B46]/[0.03] blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full bg-[#86EFAC]/[0.04] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-[420px]"
      >
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-[#E8E5E0]/60 shadow-[0_8px_40px_rgba(0,0,0,0.04)] p-6 sm:p-8 md:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-3 sm:mb-4"
            >
              <Monogram className="w-12 h-10 sm:w-14 sm:h-12 text-[#486B46]" />
            </motion.div>
            <h1
              className="text-xl sm:text-[22px] font-bold tracking-tight"
              style={{
                fontFamily: "'Playfair Display', 'Plus Jakarta Sans', serif",
                color: "#2F2F2F",
              }}
            >
              Eden{" "}
              <span className="italic font-normal" style={{ color: "#486B46" }}>
                Connexion
              </span>
            </h1>
            <p className="text-[12px] sm:text-[13px] text-[#9CA3AF] mt-1 font-medium text-center">
              Connectez-vous à votre espace d'administration
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] sm:text-[12px] font-semibold text-[#2F2F2F] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eden.fr"
                required
                className="w-full px-4 py-3 rounded-xl border border-[#E8E5E0] bg-white text-[13px] sm:text-[14px] text-[#2F2F2F] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#486B46]/20 focus:border-[#486B46] transition-all font-medium"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] sm:text-[12px] font-semibold text-[#2F2F2F] uppercase tracking-wider mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-[#E8E5E0] bg-white text-[13px] sm:text-[14px] text-[#2F2F2F] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#486B46]/20 focus:border-[#486B46] transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#777777] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px]" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 rounded-xl bg-[#F56565]/5 border border-[#F56565]/20 text-[12px] sm:text-[13px] text-[#F56565] font-medium"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#486B46] to-[#6E8B63] text-white text-[13px] sm:text-[14px] font-semibold shadow-[0_4px_16px_rgba(72,107,70,0.3)] hover:shadow-[0_6px_24px_rgba(72,107,70,0.4)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion…
                </span>
              ) : (
                "Se connecter"
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-[#F3F4F6] text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3 text-[#D1D5DB]" />
              <p className="text-[10px] sm:text-[11px] text-[#D1D5DB] font-medium">
                Accès réservé aux administrateurs EDEN
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}