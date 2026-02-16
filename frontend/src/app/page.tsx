"use client";

import { useState, useEffect } from "react";
import { Header, TabId } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CreateVault } from "@/components/CreateVault";
import { BeneficiaryView } from "@/components/BeneficiaryView";
import { Dashboard } from "@/components/Dashboard";
import { ArchitecturePage } from "@/components/ArchitecturePage";
import { AboutPage } from "@/components/AboutPage";
import { useNear } from "@/contexts/NearContext";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { isConnected, vaultStatus, isSyncing, isLoading } = useNear();
  const [activeTab, setActiveTab] = useState<TabId>("protocol");

  const hasVault = vaultStatus !== null && vaultStatus.is_initialized;

  // Listen for navigation events from HeroSection
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "dashboard") {
        setActiveTab(hasVault ? "dashboard" : "create");
      } else if (detail === "architecture") {
        setActiveTab("architecture");
      }
    };
    window.addEventListener("sentinel:navigate", handler);
    return () => window.removeEventListener("sentinel:navigate", handler);
  }, [hasVault]);

  // Auto-navigate ONLY on initial connection or when on protocol page
  useEffect(() => {
    if (isConnected && activeTab === "protocol") {
      setActiveTab(hasVault ? "dashboard" : "create");
    }
  }, [isConnected, hasVault]);

  // Redirect if viewing a tab that requires auth
  useEffect(() => {
    if (!isConnected && (activeTab === "dashboard" || activeTab === "create" || activeTab === "access")) {
      setActiveTab("protocol");
    }

    // Protect Dashboard: Redirect AWAY if user is not the owner
    // If they have a vault but accountId != owner_id, they are looking at someone else's vault (e.g. as beneficiary)
    // they should generally be on Access or Create (if they want their own).
    // The contract view `get_vault` returns the vault associated with the `account_id` passed to it.
    // In `NearContext`, we call `get_vault(accountId)`. 
    // So `vaultStatus` IS the vault where `owner_id === accountId`. 
    // EXCEPT if the user has NO vault, `vaultStatus` is null.
    // If `vaultStatus` exists, by definition `owner_id === accountId` because we fetched it using `accountId`.
    // WAIT. If I am a beneficiary, `get_vault(my_account)` will return NULL (unless I also have my own vault).
    // So the check `if (activeTab === "dashboard" && !hasVault)` covers it.
    // If I am a beneficiary without a vault, `hasVault` is false -> redirect to Create.
    // If I am a beneficiary WITH a vault, `hasVault` is true -> I see MY dashboard.
    // The user wants: "Beneficiary... sees only... Access". 
    // This implies: Even if I have a vault, if I logged in as beneficiary?? No.
    // Scenario: 
    // 1. Creator (Access: Creator) -> Dashboard (shows Creator's vault).
    // 2. Beneficiary (Access: Beneficiary) -> 
    //    If Beneficiary has NO vault -> `hasVault` is false -> Redirect to Create.
    //    If Beneficiary HAS a vault -> `hasVault` is true -> They see THEIR vault. 
    //    This is correct behavior.

    if (activeTab === "dashboard" && !hasVault && isConnected) {
      setActiveTab("create");
    }

    // AUTOMATED REDIRECT AFTER CREATION
    // If the user has a vault and is currently on the 'create' tab, 
    // it means they just finished creating it (or already had one).
    // We move them to the dashboard automatically.
    if (activeTab === "create" && hasVault && isConnected) {
      setActiveTab("dashboard");
    }
  }, [isConnected, hasVault, activeTab]);

  const showLoading = isConnected && (isLoading || (isSyncing && !vaultStatus));

  const renderTab = () => {
    if (activeTab === "architecture") return <ArchitecturePage />;
    if (activeTab === "about") return <AboutPage />;

    if (showLoading) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-4 h-4 text-[var(--text-dim)] animate-spin" />
            <p className="text-[var(--text-dim)] text-[11px] font-mono">Syncing vault data...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case "protocol":
        return <HeroSection />;
      case "dashboard":
        return <Dashboard />;
      case "create":
        return (
          <div>
            <CreateVault />
            {/* Removed BeneficiaryView from here to reduce confusion. Access tab is for that. */}
          </div>
        );
      case "access":
        return <BeneficiaryView />;
      default:
        return <HeroSection />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1">{renderTab()}</main>
    </div>
  );
}
