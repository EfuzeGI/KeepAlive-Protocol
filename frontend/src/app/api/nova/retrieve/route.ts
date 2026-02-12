import { NextResponse } from "next/server";

// Force Node.js runtime for crypto support
export const runtime = "nodejs";

const NOVA_AUTH_URL = "https://nova-sdk.com";
const NOVA_MCP_URL = "https://nova-mcp.fastmcp.app";
const GROUP_NAME = "sentinel-hackathon-test";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getSessionToken(): Promise<string> {
    const accountId = process.env.NEXT_PUBLIC_NOVA_ACCOUNT_ID;
    const apiKey = process.env.NEXT_PUBLIC_NOVA_API_KEY;

    if (!accountId || !apiKey) {
        throw new Error("NOVA Config missing");
    }

    if (tokenCache && tokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
        return tokenCache.token;
    }

    const res = await fetch(`${NOVA_AUTH_URL}/api/auth/session-token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
        },
        body: JSON.stringify({ account_id: accountId }),
    });

    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Auth failed (${res.status}): ${errBody}`);
    }

    const { token, expires_in } = await res.json();
    if (!token) throw new Error("No token in auth response");

    const match = (expires_in || "24h").match(/^(\d+)([hmd])$/);
    const expiresMs = match
        ? parseInt(match[1]) * (match[2] === "h" ? 3600000 : match[2] === "m" ? 60000 : 86400000)
        : 23 * 3600000;

    tokenCache = { token, expiresAt: Date.now() + expiresMs };
    return token;
}

async function callMcpTool(toolName: string, args: Record<string, string>) {
    const token = await getSessionToken();
    const accountId = process.env.NEXT_PUBLIC_NOVA_ACCOUNT_ID!;

    const res = await fetch(`${NOVA_MCP_URL}/tools/${toolName}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-Account-Id": accountId,
        },
        body: JSON.stringify(args),
    });

    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`MCP ${toolName} failed (${res.status}): ${errBody}`);
    }

    return res.json();
}

// AES-256-GCM decryption using Node.js crypto
async function decryptData(encryptedB64: string, keyB64: string): Promise<Buffer> {
    const crypto = await import("crypto");
    const encryptedBytes = Buffer.from(encryptedB64, "base64");
    const keyBytes = Buffer.from(keyB64, "base64");

    const iv = encryptedBytes.subarray(0, 12);
    const authTag = encryptedBytes.subarray(encryptedBytes.length - 16);
    const ciphertext = encryptedBytes.subarray(12, encryptedBytes.length - 16);

    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBytes, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export async function POST(request: Request) {
    try {
        const { cid } = await request.json();

        if (!cid || typeof cid !== "string") {
            return NextResponse.json({ error: "Missing cid" }, { status: 400 });
        }

        // Step 1: prepare_retrieve → get key + encrypted data
        const prepareResult = await callMcpTool("prepare_retrieve", {
            group_id: GROUP_NAME,
            ipfs_hash: cid,
        });

        const { key, encrypted_b64 } = prepareResult;
        if (!key || !encrypted_b64) {
            throw new Error("prepare_retrieve returned no key or data");
        }

        // Step 2: Decrypt locally
        const decrypted = await decryptData(encrypted_b64, key);

        return NextResponse.json({ data: decrypted.toString("utf-8") });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("NOVA retrieve error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
