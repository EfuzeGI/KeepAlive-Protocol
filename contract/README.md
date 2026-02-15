# KeepAlive Contract

NEAR smart contract for Automated Inheritance.

## Build

```bash
npm install
npm run build
```

Output: `build/keepalive_vault.wasm`

## Deploy

```bash
near deploy <account> build/keepalive_vault.wasm
near call <contract> setup_vault '{"beneficiary":"bob.testnet","interval":120000}' --accountId <owner>
```

## Methods

| Method | Access |
|--------|--------|
| setup_vault | owner |
| ping | owner |
| check_pulse | anyone |
| deposit | anyone |
| withdraw | owner |
| update_beneficiary | owner |
| update_interval | owner |
| reset_vault | owner |
| get_status | view |
