"use client";

import { useNear } from "@/contexts/NearContext";
import { Heart, Wallet, Users, Clock, Send, Loader2, Settings, AlertTriangle, Zap } from "lucide-react";
import { useState, useMemo } from "react";

export function Dashboard() {
    const {
        vaultStatus,
        ping,
        deposit,
        updateBeneficiary,
        updateInterval,
        resetVault,
        isTransactionPending,
        accountId
    } = useNear();

    const [activeTab, setActiveTab] = useState<"deposit" | "settings">("deposit");
    const [depositAmount, setDepositAmount] = useState("");
    const [newBeneficiary, setNewBeneficiary] = useState("");
    const [newInterval, setNewInterval] = useState("");

    // Status calculation
    const status = useMemo(() => {
        if (!vaultStatus) return "standby";
        if (vaultStatus.is_completed) return "completed";
        if (vaultStatus.is_emergency || vaultStatus.is_execution_ready) return "emergency";
        if (vaultStatus.is_yielding) return "yielding";
        if (vaultStatus.is_expired) return "expired";
        if (vaultStatus.is_warning_active) return "warning";
        return "active";
    }, [vaultStatus]);

    // Format functions
    const formatNear = (yocto: string) => (parseFloat(yocto) / 1e24).toFixed(2);

    const formatTime = (ns: string) => {
        const totalMinutes = Math.floor(parseInt(ns) / 60_000_000_000);
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const formatDays = (ns: string) => Math.floor(parseInt(ns) / (24 * 60 * 60 * 1_000_000_000));
    const getTelegramLink = () => accountId ? `https://t.me/sentinel_near_bot?start=${accountId}` : "#";

    // Handlers
    const handlePing = async () => { try { await ping(); } catch (e) { console.error(e); } };
    const handleDeposit = async () => { if (!depositAmount) return; try { await deposit(depositAmount); setDepositAmount(""); } catch (e) { console.error(e); } };
    const handleUpdateBeneficiary = async () => { if (!newBeneficiary) return; try { await updateBeneficiary(newBeneficiary); setNewBeneficiary(""); } catch (e) { console.error(e); } };
    const handleUpdateInterval = async () => { const d = parseInt(newInterval); if (!d) return; try { await updateInterval(d * 86400000); setNewInterval(""); } catch (e) { console.error(e); } };
    const handleResetVault = async () => { if (!confirm("Reset vault? All funds will be withdrawn.")) return; try { await resetVault(); } catch (e) { console.error(e); } };

    const statusColors: Record<string, { badge: string; dot: string; timer: string }> = {
        active: { badge: "text-cyan-400", dot: "bg-cyan-400", timer: "text-cyan-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]" },
        warning: { badge: "text-amber-400", dot: "bg-amber-400 animate-pulse", timer: "text-amber-400 drop-shadow-[0_0_25px_rgba(245,158,11,0.6)]" },
        expired: { badge: "text-red-400", dot: "bg-red-400 animate-pulse", timer: "text-red-400 drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]" },
        emergency: { badge: "text-red-400", dot: "bg-red-400 animate-pulse", timer: "text-red-400 drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]" },
        yielding: { badge: "text-purple-400", dot: "bg-purple-400", timer: "text-purple-400 drop-shadow-[0_0_25px_rgba(168,85,247,0.6)]" },
        standby: { badge: "text-gray-400", dot: "bg-gray-400", timer: "text-white/60" },
        completed: { badge: "text-emerald-400", dot: "bg-emerald-400", timer: "text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]" },
    };

    const statusLabels: Record<string, string> = {
        active: "Active",
        warning: "Warning",
        expired: "Expired",
        emergency: "Emergency",
        yielding: "Verifying",
        standby: "Standby",
        completed: "Completed",
    };

    const sc = statusColors[status];

    return (
        // ═══ ATMOSPHERIC BACKGROUND ═══
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black">
            <div className="w-full max-w-4xl">

                {/* ═══ THE VAULT — GLASSMORPHISM CARD ═══ */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-[0_0_80px_-15px_rgba(6,182,212,0.2)]">

                    {/* Header: Timer + Status + Button */}
                    <div className="flex items-start justify-between mb-10">
                        {/* Left: Glowing Timer */}
                        <div>
                            <div className={`text-8xl font-bold font-mono tracking-tighter mb-2 ${sc.timer}`}>
                                {vaultStatus ? formatTime(vaultStatus.time_remaining_ms) : "—"}
                            </div>
                            <div className="text-white/40 text-lg">Time remaining until expiry</div>
                        </div>

                        {/* Right: Status + Button */}
                        <div className="text-right flex flex-col items-end gap-4">
                            <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm uppercase tracking-wider ${sc.badge} bg-white/5 border border-white/10 backdrop-blur-sm`}>
                                <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
                                {statusLabels[status]}
                            </div>
                            {/* LIQUID BUTTON */}
                            <button
                                onClick={handlePing}
                                disabled={isTransactionPending || status === "expired" || status === "yielding"}
                                className="flex items-center gap-3 h-16 px-10 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-40 text-black font-semibold text-xl transition-all shadow-lg shadow-cyan-500/25 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
                            >
                                {isTransactionPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Heart className="w-6 h-6" /> I'M ALIVE</>}
                            </button>
                        </div>
                    </div>

                    {/* Stats Row — Inset Cards */}
                    <div className="grid grid-cols-4 gap-6 mb-10 pb-10 border-b border-white/10">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:border-cyan-500/20 transition-colors">
                            <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                                <Wallet className="w-4 h-4" /> Balance
                            </div>
                            <div className="text-white text-xl font-semibold">
                                {vaultStatus ? formatNear(vaultStatus.vault_balance) : "0"} <span className="text-white/40 font-normal">NEAR</span>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:border-cyan-500/20 transition-colors">
                            <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                                <Users className="w-4 h-4" /> Beneficiary
                            </div>
                            <div className="text-white text-lg font-medium truncate">
                                {vaultStatus?.beneficiary_id || "—"}
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:border-cyan-500/20 transition-colors">
                            <div className="flex items-center gap-2 text-white/40 text-sm mb-2">
                                <Clock className="w-4 h-4" /> Interval
                            </div>
                            <div className="text-white text-xl font-semibold">
                                {vaultStatus ? `${formatDays(vaultStatus.heartbeat_interval_ms)} days` : "—"}
                            </div>
                        </div>
                        <a href={getTelegramLink()} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.08] rounded-2xl p-5 transition-all group">
                            <div className="flex items-center gap-2 text-white/40 group-hover:text-cyan-400 text-sm mb-2 transition-colors">
                                <Send className="w-4 h-4" /> Telegram
                            </div>
                            <div className="text-white group-hover:text-cyan-400 text-lg font-medium transition-colors">
                                Connect Bot →
                            </div>
                        </a>
                    </div>

                    {/* Actions Section */}
                    <div>
                        {/* Tabs */}
                        <div className="flex gap-3 mb-8">
                            <button
                                onClick={() => setActiveTab("deposit")}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium transition-all ${activeTab === "deposit"
                                        ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-black shadow-lg shadow-cyan-500/20"
                                        : "text-white/50 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <Wallet className="w-5 h-5" /> Deposit
                            </button>
                            <button
                                onClick={() => setActiveTab("settings")}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium transition-all ${activeTab === "settings"
                                        ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-black shadow-lg shadow-cyan-500/20"
                                        : "text-white/50 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <Settings className="w-5 h-5" /> Settings
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === "deposit" && (
                            <div className="flex gap-4">
                                <input
                                    type="number"
                                    placeholder="Amount in NEAR"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="flex-1 h-14 px-6 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none focus:bg-white/[0.08] transition-all"
                                />
                                <button
                                    onClick={handleDeposit}
                                    disabled={isTransactionPending || !depositAmount}
                                    className="h-14 px-8 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-40 text-black font-semibold text-lg transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                                >
                                    {isTransactionPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5" /> Deposit</>}
                                </button>
                            </div>
                        )}

                        {activeTab === "settings" && (
                            <div className="space-y-5">
                                {/* Beneficiary */}
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        placeholder="New beneficiary (account.near)"
                                        value={newBeneficiary}
                                        onChange={(e) => setNewBeneficiary(e.target.value)}
                                        className="flex-1 h-12 px-5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none focus:bg-white/[0.08] transition-all"
                                    />
                                    <button onClick={handleUpdateBeneficiary} disabled={isTransactionPending || !newBeneficiary} className="h-12 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-40 text-black font-semibold transition-all shadow-lg shadow-cyan-500/20">
                                        Update
                                    </button>
                                </div>

                                {/* Interval */}
                                <div className="flex gap-4">
                                    <input
                                        type="number"
                                        placeholder="New interval (days)"
                                        value={newInterval}
                                        onChange={(e) => setNewInterval(e.target.value)}
                                        className="flex-1 h-12 px-5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none focus:bg-white/[0.08] transition-all"
                                    />
                                    <button onClick={handleUpdateInterval} disabled={isTransactionPending || !newInterval} className="h-12 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 disabled:opacity-40 text-black font-semibold transition-all shadow-lg shadow-cyan-500/20">
                                        Update
                                    </button>
                                </div>

                                {/* Reset */}
                                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                    <div className="text-red-400/70 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" /> Danger zone
                                    </div>
                                    <button onClick={handleResetVault} disabled={isTransactionPending} className="h-11 px-5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 disabled:opacity-40 font-medium transition-all">
                                        Reset Vault
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    );
}
