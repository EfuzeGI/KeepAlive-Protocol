import { NextResponse } from "next/server";
import { NovaSdk } from "nova-sdk-js";
import { Buffer } from "buffer";

const GROUP_NAME = "sentinel-hackathon-test";

function getNovaSDK() {
    const accountId = process.env.NEXT_PUBLIC_NOVA_ACCOUNT_ID || "";
    const apiKey = process.env.NEXT_PUBLIC_NOVA_API_KEY || "";

    if (!accountId || !apiKey) {
        throw new Error("NOVA Config missing");
    }

    return new NovaSdk(accountId, {
        apiKey,
        contractId: "nova-sdk-5.testnet",
        rpcUrl: "https://rpc.testnet.near.org",
    });
}

export async function POST(request: Request) {
    try {
        const { data } = await request.json();

        if (!data || typeof data !== "string") {
            return NextResponse.json({ error: "Missing data" }, { status: 400 });
        }

        const sdk = getNovaSDK();
        const filename = `sentinel_${Date.now()}.enc`;

        try {
            await sdk.registerGroup(GROUP_NAME);
        } catch {
            // Group already exists
        }

        const buffer = Buffer.from(data, "utf-8");
        const result = await sdk.upload(GROUP_NAME, buffer, filename);

        if (!result?.cid) {
            return NextResponse.json({ error: "Upload returned no CID" }, { status: 500 });
        }

        return NextResponse.json({ cid: result.cid });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("NOVA upload error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
