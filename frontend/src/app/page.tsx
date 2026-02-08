"use client";

import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { SentinelCore } from "@/components/SentinelCore";
import { VaultActions } from "@/components/VaultActions";
import { CreateVault } from "@/components/CreateVault";
import { useNear } from "@/contexts/NearContext";
import { Loader2, Wallet, Clock, User, ArrowRight } from "lucide-react";

export default function Home() {
  const { isConnected, vaultStatus, isSyncing, isLoading, accountId } = useNear();

  // Determine what to show based on vault status
  const hasVault = vaultStatus !== null && vaultStatus.is_initialized;
  const showCreateVault = isConnected && !hasVault && !isLoading && !isSyncing;
  const showDashboard = isConnected && hasVault;
  const showLoading = isConnected && (isLoading || (isSyncing && !vaultStatus));

  // Format balance
  const formatBalance = (yoctoNear: string) => {
    const near = parseFloat(yoctoNear) / 1e24;
    return near.toFixed(4);
  };

  // Format interval
  const formatInterval = (ms: string) => {
    const totalMs = parseInt(ms);
    const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor(totalMs / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Truncate address
  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Scanline Overlay */}
      <div className="scanline-overlay" />

      {/* Neural Network Background - already in globals.css body */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Floating particles/nodes effect */}
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-cyan-500/30 rounded-full animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-violet-500/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-cyan-500/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-violet-500/20 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="relative flex-1">
        {!isConnected ? (
          <HeroSection />
        ) : showLoading ? (
          // Loading state - Sentinel awakening
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border border-cyan-500/30 animate-rotate-ring" />
                <div className="absolute inset-2 w-12 h-12 rounded-full border border-violet-500/30 animate-rotate-ring-reverse" />
                <div className="absolute inset-4 w-8 h-8 rounded-full bg-cyan-500/20 animate-breathe" />
              </div>
              <p className="text-cyan-400 font-mono text-sm tracking-wider">INITIALIZING SENTINEL...</p>
            </div>
          </div>
        ) : showCreateVault ? (
          // No vault - show create vault form
          <CreateVault />
        ) : showDashboard ? (
          // Has vault - show Sentinel Dashboard
          <div className="container mx-auto px-4 py-8">
            {/* Dashboard Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-light text-white/80 tracking-wide">
                SENTINEL <span className="text-cyan-400">GUARDIAN</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-mono">
                {accountId}
              </p>
            </div>

            {/* Main Layout */}
            <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-start">

              {/* Left Column - Floating Stats */}
              <div className="space-y-4 lg:pt-20">
                {/* Balance */}
                <div className="stat-card animate-float" style={{ animationDelay: '0s' }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10">
                      <Wallet className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="stat-label">Protected Balance</div>
                      <div className="stat-value text-cyan-400">
                        {formatBalance(vaultStatus?.vault_balance || "0")} <span className="text-sm text-slate-500">NEAR</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interval */}
                <div className="stat-card animate-float" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                      <Clock className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <div className="stat-label">Heartbeat Interval</div>
                      <div className="stat-value text-violet-400">
                        {formatInterval(vaultStatus?.heartbeat_interval_ms || "0")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center - The Sentinel Core */}
              <div className="glass-card rounded-3xl p-8 min-w-[400px]">
                <SentinelCore />
              </div>

              {/* Right Column - Beneficiary Info & Quick Actions */}
              <div className="space-y-4 lg:pt-20">
                {/* Beneficiary */}
                <div className="stat-card animate-float" style={{ animationDelay: '0.25s' }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <User className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="stat-label">Beneficiary</div>
                      <div className="stat-value text-amber-400 text-base">
                        {truncateAddress(vaultStatus?.beneficiary_id || "")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transfer Flow */}
                <div className="stat-card opacity-60">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">{truncateAddress(accountId || "")}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-mono">{truncateAddress(vaultStatus?.beneficiary_id || "")}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    On heartbeat failure
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="mt-12 max-w-4xl mx-auto">
              <VaultActions />
            </div>
          </div>
        ) : null}
      </main>

      {/* Minimal Footer */}
      <footer className="relative border-t border-white/5 py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
            <span className="font-mono">SENTINEL</span>
            <span>•</span>
            <span>NEAR Protocol</span>
            <span>•</span>
            <span className="font-mono">v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
