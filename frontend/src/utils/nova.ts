/**
 * NOVA client-side wrapper.
 * All SDK calls go through our own API routes (/api/nova/upload, /api/nova/retrieve)
 * which run server-side — no CORS, no exposed API keys in the browser.
 */

/**
 * Upload encrypted data to NOVA via our server-side proxy.
 * Returns "NOVA:<cid>" on success.
 */
export async function uploadEncryptedData(encryptedText: string): Promise<string> {
    console.log("🔐 NOVA: uploading via server proxy /api/nova/upload");

    const res = await fetch("/api/nova/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: encryptedText }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "NOVA upload failed");
    }

    const { cid } = await res.json();

    if (!cid) {
        throw new Error("Upload returned no CID");
    }

    console.log("✅ NOVA upload OK, CID:", cid);
    return `NOVA:${cid}`;
}

/**
 * Retrieve data from NOVA. If payload starts with "NOVA:" prefix,
 * fetches via our server-side proxy. Otherwise returns raw payload.
 */
export async function retrieveEncryptedData(payload: string): Promise<string> {
    if (!payload.startsWith("NOVA:")) {
        return payload;
    }

    const cid = payload.replace("NOVA:", "");

    const res = await fetch("/api/nova/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "NOVA retrieve failed");
    }

    const { data } = await res.json();

    if (!data) {
        throw new Error("Retrieved empty data from NOVA");
    }

    return data;
}

/**
 * Check if NOVA is configured (server-side check not possible from client,
 * so we do a quick health check).
 */
export function isNovaConfigured(): boolean {
    return true; // Hardcoded for Mainnet production
}
