"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Eye, EyeOff, Loader2 } from "lucide-react";

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
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #FCFCFC 0%, #F8F5F2 40%, #86EFAC10 70%, #FCFCFC 100%)",
      }}
    >
      {/* Subtle background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#38C172]/[0.03] blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#86EFAC]/[0.04] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-[420px]"
      >
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-[#E5E7EB]/60 shadow-[0_8px_40px_rgba(0,0,0,0.04)] p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#38C172] to-[#86EFAC] flex items-center justify-center shadow-[0_4px_16px_rgba(56,193,114,0.3)] mb-4"
            >
              <Heart className="w-7 h-7 text-white" fill="white" />
            </motion.div>
            <h1
              className="text-[22px] font-bold text-[#1a1a1a] tracking-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
            >
              EDEN Admin
            </h1>
            <p className="text-[13px] text-[#9CA3AF] mt-1 font-medium">
              Connectez-vous à votre espace d'administration
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@eden.fr"
                required
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white text-[14px] text-[#1a1a1a] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all font-medium"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12px] font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-[#E5E7EB] bg-white text-[14px] text-[#1a1a1a] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
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
                className="px-4 py-3 rounded-xl bg-[#F56565]/5 border border-[#F56565]/20 text-[13px] text-[#F56565] font-medium"
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
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#38C172] to-[#22C55E] text-white text-[14px] font-semibold shadow-[0_4px_16px_rgba(56,193,114,0.3)] hover:shadow-[0_6px_24px_rgba(56,193,114,0.4)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
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
          <div className="mt-6 pt-5 border-t border-[#F3F4F6] text-center">
            <p className="text-[11px] text-[#D1D5DB] font-medium">
              Accès réservé aux administrateurs EDEN
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}