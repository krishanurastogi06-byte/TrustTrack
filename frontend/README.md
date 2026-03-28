# TrustTrack Frontend (React + Vite)

This frontend connects donor/admin wallets to the Donation smart contract and backend APIs.

## Local setup

### 1) Install dependencies

```bash
cd frontend
npm install
```

### 2) Configure local env

Set `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_API_BASE_URL=http://localhost:4000/api
VITE_DONATION_CONTRACT=<localhost_deployed_contract_address>
```

### 3) Start frontend

```bash
npm run dev
```

## MetaMask local chain

Add network:
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Symbol: `ETH`

Import one Hardhat account private key from `npx hardhat node` output.

## Wallet flow used by TrustTrack

1. Donor connects MetaMask.
2. Donor donates ETH directly to contract.
3. Contract keeps escrow per campaign.
4. Admin verifies proofs, then triggers release.
5. Contract pays NGO wallet directly.

No admin or backend wallet receives custody of donor funds.