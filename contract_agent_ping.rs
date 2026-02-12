// ADD THIS METHOD TO YOUR CONTRACT
// This allows the agent to ping on behalf of users when activity is detected

use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, AccountId, require};

#[near_bindgen]
impl Contract {
    /// Agent-only method to ping a vault on behalf of a user
    /// Called when agent detects on-chain activity (nonce increase)
    pub fn agent_ping(&mut self, account_id: AccountId) {
        // Security: Only the authorized agent can call this method
        require!(
            env::predecessor_account_id() == self.agent_account,
            "ERR_UNAUTHORIZED: Only the authorized agent can call this method"
        );

        // Get the vault
        let vault = self.vaults.get_mut(&account_id)
            .expect("ERR_VAULT_NOT_FOUND: Vault does not exist for this account");

        // Security: Cannot ping vaults in certain states
        require!(
            !vault.is_emergency && !vault.is_yielding,
            "ERR_INVALID_STATE: Cannot ping vault in emergency or yielding state"
        );

        // Reset the timer
        vault.last_alive = env::block_timestamp_ms();
        
        // Clear warning state if it was active
        if vault.warning_triggered_at.is_some() {
            vault.warning_triggered_at = None;
        }

        // Log event
        env::log_str(&format!(
            "EVENT_JSON:{{\"event\":\"agent_ping\",\"data\":{{\"account_id\":\"{}\",\"timestamp\":{}}}}}",
            account_id,
            env::block_timestamp_ms()
        ));
    }
}

// ALSO ADD agent_account FIELD TO THE Contract STRUCT:
// 
// #[near_bindgen]
// #[derive(BorshDeserialize, BorshSerialize)]
// pub struct Contract {
//     pub agent_account: AccountId,
//     pub vaults: UnorderedMap<AccountId, Vault>,
//     // ... other fields
// }
//
// And in the init method (new):
// 
// #[init]
// pub fn new(agent_account: AccountId) -> Self {
//     Self {
//         agent_account,
//         vaults: UnorderedMap::new(b"v"),
//         // ... other fields
//     }
// }
