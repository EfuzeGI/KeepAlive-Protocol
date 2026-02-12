"use client";

import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CreateVault } from "@/components/CreateVault";
import { BeneficiaryView } from "@/components/BeneficiaryView";
import { Dashboard } from "@/components/Dashboard";
import { useNear } from "@/contexts/NearContext";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { isConnected, vaultStatus, isSyncing, isLoading } = useNear();

  const hasVault = vaultStatus !== null && vaultStatus.is_initialized;
  const showCreateVault = isConnected && !hasVault && !isLoading && !isSyncing;
  const showDashboard = isConnected && hasVault;
  const showLoading = isConnected && (isLoading || (isSyncing && !vaultStatus));

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      <Header />

      <main className="flex-1">
        {!isConnected ? (
          <HeroSection />
        ) : showLoading ? (
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-gray-500 text-sm">Loading vault...</p>
            </div>
          </div>
        ) : showCreateVault ? (
          <div>
            <CreateVault />
            {/* Divider */}
            <div className="max-w-lg mx-auto px-4 py-2">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-700/50" />
                <span className="text-slate-500 text-sm font-medium">or check inherited vault</span>
                <div className="flex-1 h-px bg-slate-700/50" />
              </div>
            </div>
            <BeneficiaryView />
          </div>
        ) : showDashboard ? (
          <Dashboard />
        ) : null}
      </main>
    </div>
  );
}
