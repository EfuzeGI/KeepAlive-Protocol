import { NextResponse } from "next/server";

// Force Node.js runtime for crypto support
export const runtime = "nodejs";

const NOVA_AUTH_URL = "https://nova-sdk.com";
const NOVA_MCP_URL = "https://nova-mcp.fastmcp.app";
const GROUP_NAME = "sentinel-hackathon-test";

// Token cache (in-memory, per serverless invocation)
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getSessionToken(): Promise<string> {
    const accountId = process.env.NEXT_PUBLIC_NOVA_ACCOUNT_ID;
    const apiKey = process.env.NEXT_PUBLIC_NOVA_API_KEY;

    if (!accountId || !apiKey) {
        throw new Error("NOVA Config missing: NEXT_PUBLIC_NOVA_ACCOUNT_ID or NEXT_PUBLIC_NOVA_API_KEY");
    }

    // Return cached token if still valid (5 min buffer)
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

    // Parse expiry (e.g., "24h")
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

async function callMcpEndpoint(endpoint: string, body: Record<string, string>) {
    const token = await getSessionToken();
    const accountId = process.env.NEXT_PUBLIC_NOVA_ACCOUNT_ID!;

    const res = await fetch(`${NOVA_MCP_URL}${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-Account-Id": accountId,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`MCP endpoint ${endpoint} failed (${res.status}): ${errBody}`);
    }

    return res.json();
}

// AES-256-GCM encryption using Node.js crypto
async function encryptData(data: Buffer, keyB64: string): Promise<string> {
    const crypto = await import("crypto");
    const keyBytes = Buffer.from(keyB64, "base64");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", keyBytes, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, encrypted, authTag]).toString("base64");
}

// SHA-256 hash
async function computeSha256(data: Buffer): Promise<string> {
    const crypto = await import("crypto");
    return crypto.createHash("sha256").update(data).digest("hex");
}

export async function POST(request: Request) {
    try {
        const { data } = await request.json();

        if (!data || typeof data !== "string") {
            return NextResponse.json({ error: "Missing data" }, { status: 400 });
        }

        const rawBuffer = Buffer.from(data, "utf-8");

        // Step 1: Register group (ignore if exists)
        try {
            await callMcpTool("register_group", { group_id: GROUP_NAME });
        } catch {
            // Group already exists
        }

        // Step 2: prepare_upload → get encryption key
        const prepareResult = await callMcpTool("prepare_upload", {
            group_id: GROUP_NAME,
            filename: `sentinel_${Date.now()}.enc`,
        });

        const { upload_id, key } = prepareResult;
        if (!upload_id || !key) {
            throw new Error("prepare_upload returned no upload_id or key");
        }

        // Step 3: Encrypt data locally (AES-256-GCM)
        const encryptedB64 = await encryptData(rawBuffer, key);

        // Step 4: Compute SHA-256 hash of plaintext
        const fileHash = await computeSha256(rawBuffer);

        // Step 5: finalize_upload → upload to IPFS
        const finalizeResult = await callMcpEndpoint("/api/finalize-upload", {
            upload_id,
            encrypted_data: encryptedB64,
            file_hash: fileHash,
        });

        if (!finalizeResult?.cid) {
            throw new Error("finalize_upload returned no CID");
        }

        return NextResponse.json({ cid: finalizeResult.cid });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("NOVA upload error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
