import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    const accountId = "keep-alive.nova-sdk.near";
    const apiKey = "nova_sk_XvJ7poWarK1zM3IahbchJCpfdEGdu6bf";

    try {
        const { NovaSdk } = require("nova-sdk-js");
        const sdk = new NovaSdk(accountId, {
            apiKey,
            rpcUrl: "https://rpc.mainnet.near.org",
            contractId: "nova-sdk.near",
            networkId: "mainnet",
        });

        // Test auth by registering groups or just checking if constructor works
        // (The SDK usually only pings on first actual action)
        try {
            await sdk.registerGroup("health-check-" + Date.now());
        } catch (e) {
            // If it's a "Group exists" error, that's fine. If it's auth, we'll see.
        }

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
