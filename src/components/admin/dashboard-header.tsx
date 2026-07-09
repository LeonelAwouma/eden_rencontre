"use client";

import { motion } from "framer-motion";
import { Search, Bell, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  adminName: string;
  onMenuClick: () => void;
}

export function DashboardHeader({ adminName, onMenuClick }: DashboardHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center justify-between gap-4 mb-8"
    >
      {/* Left: Greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:text-[#374151] hover:border-[#D1D5DB] transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1
            className="text-[28px] sm:text-[32px] font-bold text-[#1a1a1a] tracking-tight leading-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
          >
            Hello, {adminName} 👋
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-0.5 font-medium">
            Welcome back to EDEN — Here's an overview of your platform's activity.
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="hidden sm:flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 w-56 hover:border-[#D1D5DB] transition-all">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Rechercher…"
            className="bg-transparent text-sm text-[#374151] placeholder:text-[#D1D5DB] outline-none w-full font-medium"
          />
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-1.5 py-0.5 text-[10px] font-medium text-[#9CA3AF]">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:text-[#374151] hover:border-[#D1D5DB] transition-all">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F56565] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            3
          </span>
        </button>

        {/* Settings */}
        <button className="w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:text-[#374151] hover:border-[#D1D5DB] transition-all">
          <Settings className="w-[18px] h-[18px]" />
        </button>

        {/* Avatar */}
        <div className="ml-1 w-10 h-10 rounded-full bg-gradient-to-br from-[#38C172] to-[#86EFAC] flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer hover:shadow-md transition-shadow">
          {adminName.charAt(0).toUpperCase()}
        </div>
      </div>
    </motion.header>
  );
}