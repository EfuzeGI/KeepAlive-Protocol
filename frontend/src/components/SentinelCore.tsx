"use client";

import { useEffect, useState } from "react";
import { useNear } from "@/contexts/NearContext";

export function SentinelCore() {
    const { vaultStatus, isConnected } = useNear();
    const [timeDisplay, setTimeDisplay] = useState({ value: "--", unit: "STANDBY" });
    const [status, setStatus] = useState<"standby" | "alive" | "warning" | "emergency" | "completed">("standby");

    // Determine status based on vault state
    useEffect(() => {
        if (!isConnected || !vaultStatus?.is_initialized) {
            setStatus("standby");
            return;
        }

        if (vaultStatus.is_completed) {
            setStatus("completed");
        } else if (vaultStatus.is_emergency || vaultStatus.is_execution_ready) {
            setStatus("emergency");
        } else if (vaultStatus.is_warning_active || vaultStatus.is_expired) {
            setStatus("warning");
        } else {
            setStatus("alive");
        }
    }, [vaultStatus, isConnected]);

    // Format and update countdown timer
    useEffect(() => {
        if (!vaultStatus?.time_remaining_ms) {
            setTimeDisplay({ value: "--", unit: "STANDBY" });
            return;
        }

        const updateTimer = () => {
            const ms = parseInt(vaultStatus.time_remaining_ms);

            if (ms <= 0) {
                setTimeDisplay({ value: "00:00", unit: "EXPIRED" });
                return;
            }

            const days = Math.floor(ms / (1000 * 60 * 60 * 24));
            const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((ms % (1000 * 60)) / 1000);

            if (days > 0) {
                setTimeDisplay({ value: `${days}d ${hours}h`, unit: "REMAINING" });
            } else if (hours > 0) {
                setTimeDisplay({ value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, unit: "HOURS" });
            } else {
                setTimeDisplay({ value: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`, unit: "MINUTES" });
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [vaultStatus?.time_remaining_ms]);

    // Status label
    const getStatusLabel = () => {
        switch (status) {
            case "alive": return "SENTINEL ACTIVE";
            case "warning": return "⚠ WARNING PHASE";
            case "emergency": return "🚨 CRITICAL";
            case "completed": return "✓ COMPLETED";
            default: return "AWAITING LINK";
        }
    };

    // Dynamic classes based on status
    const coreClasses = {
        standby: "",
        alive: "",
        warning: "warning",
        emergency: "emergency",
        completed: ""
    };

    const orbGradient = {
        standby: "from-slate-600/30 to-slate-800/20",
        alive: "from-cyan-400/30 via-teal-500/20 to-cyan-600/10",
        warning: "from-amber-400/40 via-orange-500/25 to-amber-600/15",
        emergency: "from-red-500/50 via-red-600/30 to-red-700/20",
        completed: "from-slate-500/30 to-slate-600/20"
    };

    const glowColor = {
        standby: "rgba(100, 116, 139, 0.2)",
        alive: "rgba(6, 182, 212, 0.4)",
        warning: "rgba(245, 158, 11, 0.5)",
        emergency: "rgba(239, 68, 68, 0.6)",
        completed: "rgba(100, 116, 139, 0.3)"
    };

    const ringColor = {
        standby: "border-slate-700/30",
        alive: "border-cyan-500/30",
        warning: "border-amber-500/40",
        emergency: "border-red-500/50",
        completed: "border-slate-600/30"
    };

    const textColor = {
        standby: "text-slate-400",
        alive: "text-cyan-400",
        warning: "text-amber-400",
        emergency: "text-red-400",
        completed: "text-slate-400"
    };

    return (
        <div className="relative flex flex-col items-center justify-center py-8">
            {/* Status Label */}
            <div className={`absolute top-0 text-xs font-medium tracking-[0.2em] uppercase ${textColor[status]}`}>
                {getStatusLabel()}
            </div>

            {/* The Core Visualization */}
            <div className={`sentinel-core ${coreClasses[status]} relative`}>
                {/* Outer Ring */}
                <div
                    className={`absolute w-[280px] h-[280px] rounded-full border ${ringColor[status]} animate-rotate-ring`}
                    style={{
                        boxShadow: `0 0 30px ${glowColor[status]}`,
                    }}
                >
                    {/* Ring markers */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-current opacity-50" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-current opacity-50" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-current opacity-50" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-current opacity-50" />
                </div>

                {/* Middle Ring */}
                <div
                    className={`absolute w-[220px] h-[220px] rounded-full border ${ringColor[status]} animate-rotate-ring-reverse opacity-60`}
                />

                {/* Inner Ring */}
                <div
                    className={`absolute w-[160px] h-[160px] rounded-full border-2 ${ringColor[status]} animate-rotate-ring`}
                    style={{ animationDuration: '10s' }}
                />

                {/* The Orb */}
                <div
                    className={`
                        relative w-[120px] h-[120px] rounded-full 
                        bg-gradient-radial ${orbGradient[status]}
                        ${status === "alive" ? "animate-breathe animate-glow-pulse" : ""}
                        ${status === "warning" ? "animate-breathe-fast animate-glow-warning" : ""}
                        ${status === "emergency" ? "animate-breathe-fast animate-glow-emergency" : ""}
                        flex items-center justify-center
                    `}
                    style={{
                        background: `radial-gradient(circle at 30% 30%, ${glowColor[status]}, transparent 60%)`,
                        boxShadow: `
                            0 0 60px ${glowColor[status]},
                            0 0 120px ${glowColor[status].replace(')', ', 0.3)')},
                            inset 0 0 40px ${glowColor[status].replace(')', ', 0.5)')}
                        `
                    }}
                >
                    {/* Inner glow */}
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/10 to-transparent" />
                </div>
            </div>

            {/* Countdown Timer */}
            <div className="mt-8 text-center">
                <div
                    className={`font-mono text-5xl font-semibold tracking-wider ${textColor[status]}`}
                    style={{ textShadow: `0 0 30px ${glowColor[status]}` }}
                >
                    {timeDisplay.value}
                </div>
                <div className="mt-2 text-xs text-slate-500 tracking-[0.3em] uppercase">
                    {timeDisplay.unit}
                </div>
            </div>

            {/* Decorative corner elements */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l border-t border-white/10" />
            <div className="absolute top-4 right-4 w-8 h-8 border-r border-t border-white/10" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l border-b border-white/10" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r border-b border-white/10" />
        </div>
    );
}
