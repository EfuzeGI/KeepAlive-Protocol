import { NextResponse } from "next/server";
import { NovaSdk } from "nova-sdk-js";

export const runtime = "nodejs";

export async function GET() {
    const accountId = "keep-alive.nova-sdk.near";
    const apiKey = "nova_sk_XvJ7poWarK1zM3IahbchJCpfdEGdu6bf";

    console.log("🔍 NOVA Diagnostic: testing auth for", accountId);

    try {
        const sdk = new NovaSdk(accountId, {
            apiKey,
            rpcUrl: "https://rpc.mainnet.near.org",
            contractId: "nova-sdk.near",
        });

        // Test auth by registering groups
        // This is critical: if it fails, we need to know WHY.
        await sdk.registerGroup("health-check-" + Date.now());

        return NextResponse.json({
            status: "ok",
            message: "NOVA Authenticated successfully on Mainnet",
            debug: {
                account: accountId,
                keyPrefix: apiKey.substring(0, 10) + "..."
            }
        });
    } catch (err) {
        return NextResponse.json({
            status: "error",
            error: err instanceof Error ? err.message : "Auth failed",
            debug: {
                account: accountId,
                keyPrefix: apiKey.substring(0, 10) + "..."
            }
        }, { status: 500 });
    }
}
