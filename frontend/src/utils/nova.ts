import { NovaSdk } from "nova-sdk-js";
import { Buffer } from "buffer";

const NOVA_CONFIG = {
    accountId: process.env.NEXT_PUBLIC_NOVA_ACCOUNT_ID || "keepalive.nova-sdk.near",
    apiKey: process.env.NEXT_PUBLIC_NOVA_API_KEY || "",
    contractId: "nova-sdk-5.testnet",
    rpcUrl: "https://rpc.testnet.near.org",
};

const GROUP_NAME = "sentinel-hackathon-test";

/**
 * Upload encrypted data to NOVA decentralized storage.
 * Returns "NOVA:<cid>" on success.
 */
export async function uploadEncryptedData(encryptedText: string): Promise<string> {
    if (!NOVA_CONFIG.apiKey) throw new Error("NOVA API Key is missing");

    const sdk = new NovaSdk(NOVA_CONFIG.accountId, {
        apiKey: NOVA_CONFIG.apiKey,
        contractId: NOVA_CONFIG.contractId,
        rpcUrl: NOVA_CONFIG.rpcUrl,
    });

    const filename = `sentinel_${Date.now()}.enc`;

    try {
        await sdk.registerGroup(GROUP_NAME);
    } catch {
        // Group already exists
    }

    const buffer = Buffer.from(encryptedText, "utf-8");
    const result = await sdk.upload(GROUP_NAME, buffer, filename);

    if (!result?.cid) {
        throw new Error("Upload returned no CID");
    }

    return `NOVA:${result.cid}`;
}

/**
 * Retrieve data from NOVA. If payload starts with "NOVA:" prefix,
 * fetches from IPFS. Otherwise returns raw payload as-is.
 */
export async function retrieveEncryptedData(payload: string): Promise<string> {
    if (!payload.startsWith("NOVA:")) {
        return payload;
    }

    const cid = payload.replace("NOVA:", "");

    if (!NOVA_CONFIG.apiKey) throw new Error("NOVA API Key is missing");

    const sdk = new NovaSdk(NOVA_CONFIG.accountId, {
        apiKey: NOVA_CONFIG.apiKey,
        contractId: NOVA_CONFIG.contractId,
        rpcUrl: NOVA_CONFIG.rpcUrl,
    });

    const result = await sdk.retrieve(GROUP_NAME, cid);

    if (!result?.data) {
        throw new Error("Retrieved empty data from NOVA");
    }

    return result.data.toString("utf-8");
}

/**
 * Check if NOVA credentials are configured.
 */
export function isNovaConfigured(): boolean {
    return !!NOVA_CONFIG.apiKey;
}
