"use client";

import { useState } from "react";
import { useNear } from "@/contexts/NearContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Eye,
    Search,
    Lock,
    Unlock,
    Loader2,
    AlertCircle,
    Copy,
    Check,
    X,
    Shield,
    Cloud
} from "lucide-react";
import { retrieveEncryptedData } from "@/utils/nova";
import { decryptSecret, unpackE2EPayload } from "@/utils/encryption";

export function BeneficiaryView() {
    const { revealPayload, isTransactionPending } = useNear();

    const [ownerAccountId, setOwnerAccountId] = useState("");
    const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRevealing, setIsRevealing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [novaStatus, setNovaStatus] = useState<string | null>(null);

    const handleReveal = async () => {
        if (!ownerAccountId.trim()) {
            setError("Please enter the vault owner's account ID");
            return;
        }

        if (!ownerAccountId.endsWith(".testnet") && !ownerAccountId.endsWith(".near")) {
            setError("Invalid NEAR address (must end with .testnet or .near)");
            return;
        }

        setError(null);
        setRevealedSecret(null);
        setNovaStatus(null);
        setIsRevealing(true);

        try {
            const rawPayload = await revealPayload(ownerAccountId.trim());
            if (rawPayload) {
                // Check for E2E encrypted payload (new format)
                const e2e = unpackE2EPayload(rawPayload);
                if (e2e) {
                    setNovaStatus("🔐 E2E payload detected. Fetching from NOVA...");
                    const ciphertext = await retrieveEncryptedData(`NOVA:${e2e.cid}`);
                    setNovaStatus("🔓 Decrypting locally (AES-256-GCM)...");
                    const plaintext = await decryptSecret(ciphertext, e2e.key, e2e.iv);
                    setRevealedSecret(plaintext);
                    setNovaStatus("✅ Decrypted (Zero-Knowledge E2EE)");
                }
                // Legacy NOVA payload (no client-side encryption)
                else if (rawPayload.startsWith("NOVA:")) {
                    setNovaStatus("Retrieving from NOVA Decentralized Storage...");
                    try {
                        const decrypted = await retrieveEncryptedData(rawPayload);
                        setRevealedSecret(decrypted);
                        setNovaStatus("✅ Retrieved from NOVA (IPFS)");
                    } catch (novaErr) {
                        setError(`Failed to retrieve from NOVA: ${novaErr instanceof Error ? novaErr.message : String(novaErr)}`);
                        setNovaStatus(null);
                    }
                } else {
                    // Raw payload (no NOVA)
                    setRevealedSecret(rawPayload);
                }
            } else {
                setError("No secret stored in this vault, or vault not found.");
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("Access denied") || msg.includes("still active")) {
                setError("🔒 Vault is still active. You'll get access after the Dead Man's Switch triggers.");
            } else if (msg.includes("Unauthorized")) {
                setError("🚫 You are not the beneficiary of this vault.");
            } else if (msg.includes("not found") || msg.includes("Vault not found")) {
                setError("❌ No vault found for this account.");
            } else {
                setError(msg);
            }
        } finally {
            setIsRevealing(false);
        }
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                        <Eye className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl text-white">Beneficiary Access</CardTitle>
                        <CardDescription className="text-slate-400 mt-2">
                            Enter the vault owner&apos;s account to reveal their secret message
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Owner Account Input */}
                    <div className="space-y-2">
                        <Label htmlFor="ownerAccount" className="text-slate-300 flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            Vault Owner Account
                        </Label>
                        <Input
                            id="ownerAccount"
                            type="text"
                            placeholder="owner-account.testnet"
                            value={ownerAccountId}
                            onChange={(e) => {
                                setOwnerAccountId(e.target.value);
                                setError(null);
                                setRevealedSecret(null);
                            }}
                            className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                            disabled={isRevealing || isTransactionPending}
                            onKeyDown={(e) => e.key === "Enter" && handleReveal()}
                        />
                        <p className="text-xs text-slate-500">
                            The account that created the vault with you as beneficiary
                        </p>
                    </div>

                    {/* Reveal Button */}
                    <Button
                        onClick={handleReveal}
                        disabled={isRevealing || isTransactionPending || !ownerAccountId.trim()}
                        className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold"
                    >
                        {isRevealing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Requesting Access...
                            </>
                        ) : (
                            <>
                                <Lock className="w-4 h-4 mr-2" />
                                Reveal Secret
                            </>
                        )}
                    </Button>

                    {/* NOVA Status */}
                    {novaStatus && (
                        <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-300 text-sm">
                            {novaStatus.startsWith("✅") ? (
                                <Cloud className="w-4 h-4 flex-shrink-0" />
                            ) : (
                                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                            )}
                            {novaStatus}
                        </div>
                    )}

                    {/* Success: Revealed Secret */}
                    {revealedSecret && (
                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                                    <Unlock className="w-4 h-4" />
                                    Secret Revealed
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(revealedSecret);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                        title="Copy"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        onClick={() => { setRevealedSecret(null); setCopied(false); }}
                                        className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                        title="Hide"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-black/40 font-mono text-sm text-white break-all select-all">
                                {revealedSecret}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                        <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            How Beneficiary Access Works:
                        </h4>
                        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                            <li>The vault owner stored a secret message for you</li>
                            <li>While the owner is alive (pinging), access is <strong className="text-red-400">denied</strong></li>
                            <li>After the Dead Man&apos;s Switch triggers, access is <strong className="text-emerald-400">granted</strong></li>
                            <li>Only you (the beneficiary) can reveal the message</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
