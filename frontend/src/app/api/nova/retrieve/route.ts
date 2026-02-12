import { NextResponse } from "next/server";
import { NovaSdk } from "nova-sdk-js";

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
        const { cid } = await request.json();

        if (!cid || typeof cid !== "string") {
            return NextResponse.json({ error: "Missing cid" }, { status: 400 });
        }

        const sdk = getNovaSDK();
        const result = await sdk.retrieve(GROUP_NAME, cid);

        if (!result?.data) {
            return NextResponse.json({ error: "Retrieved empty data" }, { status: 500 });
        }

        return NextResponse.json({ data: result.data.toString("utf-8") });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("NOVA retrieve error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
