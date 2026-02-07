// Sentinel - Multi-Vault Dead Man's Switch with Yield/Resume + Warning Protocol

import { NearBindgen, near, call, view, UnorderedMap, NearPromise } from "near-sdk-js";

const MS = 1_000_000n;
const MIN_INTERVAL_MS = 60_000; // 1 minute
const DEFAULT_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEFAULT_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_GRACE_PERIOD_MS = 60_000; // 1 minute

// Vault class - stores all state for a single user's vault
class Vault {
  owner_id: string;
  beneficiary_id: string;
  vault_balance: string; // stored as string for JSON serialization
  heartbeat_interval_ms: string;
  grace_period_ms: string;
  last_active_ns: string; // nanoseconds as string
  warning_triggered_at_ns: string;
  is_yielding: boolean;
  is_emergency: boolean;

  constructor() {
    this.owner_id = "";
    this.beneficiary_id = "";
    this.vault_balance = "0";
    this.heartbeat_interval_ms = "0";
    this.grace_period_ms = String(DEFAULT_GRACE_PERIOD_MS);
    this.last_active_ns = "0";
    this.warning_triggered_at_ns = "0";
    this.is_yielding = false;
    this.is_emergency = false;
  }
}

@NearBindgen({})
export class SentinelRegistry {
  vaults: UnorderedMap<Vault> = new UnorderedMap("v");

  // ═══════════════════════════════════════════════════════════════════
  //  Vault Setup
  // ═══════════════════════════════════════════════════════════════════

  @call({})
  setup_vault({ beneficiary, interval_ms, grace_period_ms }: {
    beneficiary: string;
    interval_ms?: number;
    grace_period_ms?: number;
  }): { success: boolean; owner: string } {
    const caller = near.predecessorAccountId();

    // Check if vault already exists
    const existing = this.vaults.get(caller);
    if (existing) {
      throw new Error("Vault already exists. Use reset_vault to delete first.");
    }

    if (!beneficiary?.length) throw new Error("Beneficiary required");

    const actualInterval = interval_ms && interval_ms >= MIN_INTERVAL_MS
      ? interval_ms
      : DEFAULT_INTERVAL_MS;

    const actualGracePeriod = grace_period_ms && grace_period_ms >= MIN_GRACE_PERIOD_MS
      ? grace_period_ms
      : DEFAULT_GRACE_PERIOD_MS;

    const vault = new Vault();
    vault.owner_id = caller;
    vault.beneficiary_id = beneficiary;
    vault.heartbeat_interval_ms = String(actualInterval);
    vault.grace_period_ms = String(actualGracePeriod);
    vault.last_active_ns = near.blockTimestamp().toString();
    vault.warning_triggered_at_ns = "0";
    vault.is_yielding = false;
    vault.is_emergency = false;
    vault.vault_balance = "0";

    this.vaults.set(caller, vault);

    near.log(`Vault created: ${caller} -> ${beneficiary}, interval: ${actualInterval}ms, grace: ${actualGracePeriod}ms`);

    return { success: true, owner: caller };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Owner Actions (caller = owner)
  // ═══════════════════════════════════════════════════════════════════

  @call({})
  ping(): { success: boolean; message: string } {
    const caller = near.predecessorAccountId();
    const vault = this._getVaultOrThrow(caller);

    vault.last_active_ns = near.blockTimestamp().toString();
    vault.warning_triggered_at_ns = "0"; // Reset warning on ping

    if (vault.is_yielding) {
      vault.is_yielding = false;
      near.log("Yield cancelled - owner is alive");
    }
    if (vault.is_emergency) {
      vault.is_emergency = false;
      near.log("Emergency cancelled");
    }

    this.vaults.set(caller, vault);
    near.log(`Heartbeat confirmed for ${caller}`);

    return { success: true, message: "Heartbeat confirmed" };
  }

  @call({ payableFunction: true })
  deposit(): { new_balance: string } {
    const caller = near.predecessorAccountId();
    const vault = this._getVaultOrThrow(caller);

    const amount = near.attachedDeposit();
    if (amount <= 0n) throw new Error("Deposit amount required");

    const currentBalance = BigInt(vault.vault_balance);
    vault.vault_balance = (currentBalance + amount).toString();

    this.vaults.set(caller, vault);
    near.log(`Deposit: ${amount} yoctoNEAR. New balance: ${vault.vault_balance}`);

    return { new_balance: vault.vault_balance };
  }

  @call({})
  withdraw({ amount }: { amount?: string }): { withdrawn: string; remaining: string } {
    const caller = near.predecessorAccountId();
    const vault = this._getVaultOrThrow(caller);

    if (vault.is_emergency || vault.is_yielding) {
      throw new Error("Vault is locked during emergency/yield state");
    }

    const currentBalance = BigInt(vault.vault_balance);
    const withdrawAmount = amount ? BigInt(amount) : currentBalance;

    if (withdrawAmount <= 0n) throw new Error("Invalid amount");
    if (withdrawAmount > currentBalance) throw new Error("Insufficient balance");

    vault.vault_balance = (currentBalance - withdrawAmount).toString();
    this.vaults.set(caller, vault);

    // Transfer
    const promise = near.promiseBatchCreate(caller);
    near.promiseBatchActionTransfer(promise, withdrawAmount);

    near.log(`Withdraw: ${withdrawAmount} yoctoNEAR to ${caller}`);

    return { withdrawn: withdrawAmount.toString(), remaining: vault.vault_balance };
  }

  @call({})
  update_beneficiary({ new_beneficiary }: { new_beneficiary: string }): { success: boolean } {
    const caller = near.predecessorAccountId();
    const vault = this._getVaultOrThrow(caller);

    if (!new_beneficiary?.length) throw new Error("Beneficiary required");

    vault.beneficiary_id = new_beneficiary;
    this.vaults.set(caller, vault);

    near.log(`Beneficiary updated to ${new_beneficiary} for vault ${caller}`);
    return { success: true };
  }

  @call({})
  update_interval({ new_interval_ms }: { new_interval_ms: number }): { success: boolean } {
    const caller = near.predecessorAccountId();
    const vault = this._getVaultOrThrow(caller);

    if (new_interval_ms < MIN_INTERVAL_MS) {
      throw new Error(`Interval must be >= ${MIN_INTERVAL_MS}ms`);
    }

    vault.heartbeat_interval_ms = String(new_interval_ms);
    this.vaults.set(caller, vault);

    near.log(`Interval updated to ${new_interval_ms}ms for vault ${caller}`);
    return { success: true };
  }

  @call({})
  update_grace_period({ new_grace_period_ms }: { new_grace_period_ms: number }): { success: boolean } {
    const caller = near.predecessorAccountId();
    const vault = this._getVaultOrThrow(caller);

    if (new_grace_period_ms < MIN_GRACE_PERIOD_MS) {
      throw new Error(`Grace period must be >= ${MIN_GRACE_PERIOD_MS}ms`);
    }

    vault.grace_period_ms = String(new_grace_period_ms);
    this.vaults.set(caller, vault);

    near.log(`Grace period updated to ${new_grace_period_ms}ms for vault ${caller}`);
    return { success: true };
  }

  @call({})
  reset_vault(): { returned_balance: string } {
    const caller = near.predecessorAccountId();
    const vault = this._getVaultOrThrow(caller);

    const balance = BigInt(vault.vault_balance);

    // Return funds if any
    if (balance > 0n) {
      const promise = near.promiseBatchCreate(caller);
      near.promiseBatchActionTransfer(promise, balance);
    }

    // Remove vault from registry
    this.vaults.remove(caller);

    near.log(`Vault ${caller} deleted. Returned ${balance} yoctoNEAR`);
    return { returned_balance: balance.toString() };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Agent Actions (anyone can call, but operates on specific account)
  // ═══════════════════════════════════════════════════════════════════

  @call({})
  trigger_warning({ account_id }: { account_id: string }): {
    status: string;
    warning_sent: boolean;
    owner: string;
  } {
    const vault = this.vaults.get(account_id);
    if (!vault) {
      return { status: "VAULT_NOT_FOUND", warning_sent: false, owner: account_id };
    }

    const now = near.blockTimestamp();
    const lastActive = BigInt(vault.last_active_ns);
    const interval = BigInt(vault.heartbeat_interval_ms) * MS;
    const deadline = lastActive + interval;

    if (now <= deadline) {
      return { status: "NOT_EXPIRED", warning_sent: false, owner: account_id };
    }

    if (vault.warning_triggered_at_ns !== "0") {
      return { status: "WARNING_ALREADY_SENT", warning_sent: false, owner: account_id };
    }

    vault.warning_triggered_at_ns = now.toString();
    this.vaults.set(account_id, vault);

    // Emit event for indexer
    near.log(`EVENT_JSON:{"event": "warning_sent", "data": {"owner": "${account_id}", "timestamp": "${now.toString()}"}}`);
    near.log(`WARNING: Heartbeat expired for ${account_id}. Grace period started.`);

    return { status: "WARNING_TRIGGERED", warning_sent: true, owner: account_id };
  }

  @call({})
  check_pulse({ account_id }: { account_id: string }): {
    status: string;
    is_yielding: boolean;
    owner: string;
  } {
    const vault = this.vaults.get(account_id);
    if (!vault) {
      return { status: "VAULT_NOT_FOUND", is_yielding: false, owner: account_id };
    }

    const now = near.blockTimestamp();
    const lastActive = BigInt(vault.last_active_ns);
    const interval = BigInt(vault.heartbeat_interval_ms) * MS;
    const deadline = lastActive + interval;

    // Still alive
    if (now <= deadline) {
      return { status: "ALIVE", is_yielding: false, owner: account_id };
    }

    // Expired but no warning sent yet
    if (vault.warning_triggered_at_ns === "0") {
      return { status: "WARNING_REQUIRED", is_yielding: false, owner: account_id };
    }

    // Check grace period
    const warningTriggered = BigInt(vault.warning_triggered_at_ns);
    const gracePeriod = BigInt(vault.grace_period_ms) * MS;
    const warningDeadline = warningTriggered + gracePeriod;

    if (now < warningDeadline) {
      const remaining = (warningDeadline - now) / MS;
      near.log(`Warning active for ${account_id}. ${remaining}ms until execution eligible.`);
      return { status: "WARNING_GRACE_PERIOD", is_yielding: false, owner: account_id };
    }

    // Already yielding
    if (vault.is_yielding) {
      return { status: "YIELD_PENDING", is_yielding: true, owner: account_id };
    }

    // Initiate yield
    vault.is_yielding = true;
    this.vaults.set(account_id, vault);

    near.log(`YIELD: Grace period expired for ${account_id}. Waiting for agent verification.`);
    return { status: "YIELD_INITIATED", is_yielding: true, owner: account_id };
  }

  @call({})
  resume_pulse({ account_id, confirm_death }: { account_id: string; confirm_death: boolean }): {
    status: string;
    transferred: string;
    owner: string;
  } {
    const vault = this.vaults.get(account_id);
    if (!vault) {
      return { status: "VAULT_NOT_FOUND", transferred: "0", owner: account_id };
    }

    if (!vault.is_yielding) {
      throw new Error("Vault not in yield state");
    }

    vault.is_yielding = false;

    if (!confirm_death) {
      vault.warning_triggered_at_ns = "0";
      this.vaults.set(account_id, vault);
      near.log(`RESUME: Owner ${account_id} verified alive. Yield cancelled.`);
      return { status: "RESUMED_ALIVE", transferred: "0", owner: account_id };
    }

    // Confirm death - transfer to beneficiary
    vault.is_emergency = true;
    const balance = BigInt(vault.vault_balance);

    if (balance > 0n) {
      const promise = near.promiseBatchCreate(vault.beneficiary_id);
      near.promiseBatchActionTransfer(promise, balance);
      vault.vault_balance = "0";

      near.log(`EVENT_JSON:{"event": "transfer_complete", "data": {"owner": "${account_id}", "beneficiary": "${vault.beneficiary_id}", "amount": "${balance.toString()}"}}`);
      near.log(`TRANSFER: ${balance} yoctoNEAR -> ${vault.beneficiary_id}`);
    }

    this.vaults.set(account_id, vault);
    return { status: "TRANSFER_COMPLETE", transferred: balance.toString(), owner: account_id };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  View Methods
  // ═══════════════════════════════════════════════════════════════════

  @view({})
  get_vault({ account_id }: { account_id: string }): {
    owner_id: string;
    beneficiary_id: string;
    vault_balance: string;
    heartbeat_interval_ms: string;
    grace_period_ms: string;
    time_remaining_ms: string;
    warning_triggered_at: string;
    warning_grace_remaining_ms: string;
    is_initialized: boolean;
    is_expired: boolean;
    is_warning_active: boolean;
    is_execution_ready: boolean;
    is_yielding: boolean;
    is_emergency: boolean;
  } | null {
    const vault = this.vaults.get(account_id);

    if (!vault) {
      return null;
    }

    const now = near.blockTimestamp();
    const lastActive = BigInt(vault.last_active_ns);
    const interval = BigInt(vault.heartbeat_interval_ms) * MS;
    const deadline = lastActive + interval;

    const remaining = deadline > now ? (deadline - now) / MS : 0n;
    const isExpired = now > deadline;

    let warningGraceRemaining = 0n;
    let isWarningActive = false;
    let isExecutionReady = false;

    if (vault.warning_triggered_at_ns !== "0") {
      isWarningActive = true;
      const warningTriggered = BigInt(vault.warning_triggered_at_ns);
      const gracePeriod = BigInt(vault.grace_period_ms) * MS;
      const warningDeadline = warningTriggered + gracePeriod;
      warningGraceRemaining = warningDeadline > now ? (warningDeadline - now) / MS : 0n;
      isExecutionReady = now >= warningDeadline && isExpired;
    }

    return {
      owner_id: vault.owner_id,
      beneficiary_id: vault.beneficiary_id,
      vault_balance: vault.vault_balance,
      heartbeat_interval_ms: vault.heartbeat_interval_ms,
      grace_period_ms: vault.grace_period_ms,
      time_remaining_ms: remaining.toString(),
      warning_triggered_at: vault.warning_triggered_at_ns,
      warning_grace_remaining_ms: warningGraceRemaining.toString(),
      is_initialized: true,
      is_expired: isExpired,
      is_warning_active: isWarningActive,
      is_execution_ready: isExecutionReady,
      is_yielding: vault.is_yielding,
      is_emergency: vault.is_emergency,
    };
  }

  @view({})
  get_all_vaults(): string[] {
    return this.vaults.toArray().map(([key, _]) => key);
  }

  @view({})
  get_vault_count(): number {
    return this.vaults.length;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Private Helpers
  // ═══════════════════════════════════════════════════════════════════

  private _getVaultOrThrow(owner: string): Vault {
    const vault = this.vaults.get(owner);
    if (!vault) {
      throw new Error(`Vault not found for ${owner}. Call setup_vault first.`);
    }
    return vault;
  }
}
