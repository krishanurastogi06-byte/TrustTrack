TrustTrack Backend

This folder contains the backend API for TrustTrack (auth, campaigns, milestones, proofs, donations, transactions, admin verification, audit logs, and blockchain reconciliation).

Quick start:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Core env values:
- `MONGO_URI`
- `JWT_SECRET`
- `ETHEREUM_RPC_URL`
- `WEBHOOK_SECRET`
- `ENABLE_RECONCILIATION`
- `RECONCILE_INTERVAL_MS`
- `RECONCILE_BATCH_SIZE`

Important API routes:
- `GET /api/health`
- `POST /api/register`
- `POST /api/login`
- `GET /api/campaigns`
- `POST /api/milestones/:milestoneId/proofs`
- `POST /api/uploads`
- `GET /api/admin/proofs`
- `POST /api/admin/proofs/:id/verify`
- `POST /api/admin/proofs/:id/reject`
- `GET /api/donations`
- `POST /api/donations`
- `POST /api/transactions`
- `PATCH /api/transactions/:txHash`
- `POST /api/webhooks/transactions`

Blockchain reconciliation:
- When `ENABLE_RECONCILIATION=true`, the server starts a background job.
- The job polls pending transactions from MongoDB and checks on-chain status via `ethers` + `ETHEREUM_RPC_URL`.
- Confirmed transactions automatically mirror into confirmed donations.

## Local Hardhat Setup (Full TrustTrack Flow)

This project is configured to run fully local with Hardhat escrow.

### 1) Install dependencies

```bash
cd backend
npm install
```

### 2) Start local blockchain

```bash
npm run hh:node
```

Network details:
- RPC: `http://127.0.0.1:8545`
- Chain ID: `31337`

### 3) Deploy Donation contract to localhost

```bash
npm run hh:deploy:local
```

The script updates:
- `backend/deployments/localhost.donation.json`
- `frontend/src/lib/contracts/donationAbi.json`

### 4) Backend env for local chain

Ensure these values exist in `backend/.env`:

```env
ETHEREUM_RPC_URL=http://127.0.0.1:8545
DONATION_NETWORK=localhost
DONATION_CONTRACT_ADDRESS=<deployed_address>
DEPLOYER_PRIVATE_KEY=<hardhat_account_private_key>
DONATION_ADMIN_ADDRESS=<matching_hardhat_account_address>
```

### 5) Start API

```bash
npm run dev
```

### 6) End-to-end local flow

1. Donor sends ETH to `donate(campaignId)` from MetaMask.
2. Funds stay inside Donation contract escrow (`campaignFunds`).
3. Admin verifies milestone proof in backend.
4. Admin triggers release API.
5. Contract executes `releaseFunds(milestoneId)` and transfers directly to NGO wallet.

No backend or admin custody of donor funds is used.
