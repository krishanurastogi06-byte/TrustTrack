# NGO Wallet System - Complete Testing Guide

## System Status

✅ **All Components Ready**

- Hardhat Local Node: `127.0.0.1:8545` (PID 20916)
- Smart Contract: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Contract Chain ID: `31337`
- Admin Account: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (10000 ETH)

## Backend Implementation

### 1. NGO Profile Endpoints ✅
- **GET /api/ngo/profile** - Fetch NGO profile with wallet address
- **PUT /api/ngo/profile** - Update wallet address and profile info
- Validation: Ethereum address format (0x + 40 hex chars)
- Error Handling: 409 if NGO wallet not configured before campaign creation

### 2. Campaign Creation Validation ✅
- Checks if NGO has wallet address configured
- Returns `409 CONFLICT` with code `NGO_WALLET_NOT_CONFIGURED` if missing
- Automatically attaches wallet to campaign: `campaign.ngoWalletAddress`

### 3. Fund Release Flow ✅
- Backend validates NGO wallet exists
- Smart contract receives:
  - Campaign ID
  - Milestone ID
  - Milestone amount (ETH)
  - NGO wallet address
- Contract flow:
  1. `registerCampaign(campaignId, ngoAddress)`
  2. `registerMilestone(milestoneId, campaignId, amountWei)`
  3. `releaseFunds(milestoneId)` → direct transfer to NGO wallet

### 4. Smart Contract Features ✅
- Prevents duplicate releases: `milestoneReleased[milestoneId]` flag
- Validates sufficient escrow: `require(campaignFunds[campaignId] >= amount)`
- Direct transfer to NGO: Uses `.call{value: amount}("")`
- Event emission: `FundsReleased(milestoneId, campaignId, ngo, amount, timestamp)`

## Frontend Implementation

### 1. NGO Dashboard ✅
- Shows wallet status (configured or not)
- Green alert if wallet exists with address displayed
- Amber alert if wallet missing with "Add Wallet" button
- Click "Update Wallet" button to open modal

### 2. Wallet Address Modal ✅
- Form with validation: Ethereum address format
- Error handling with user-friendly messages
- Success notification with 2-second auto-close
- Disabled state during submission

### 3. Admin Panel Updates ✅
- **NGO Verification page**: Shows wallet address with icon
  - Green checkmark: Wallet configured
  - Amber alert: Wallet not configured
- **Campaign Monitoring page**: Shows NGO wallet for each campaign
  - Prevents releasing funds to campaigns without wallet

## Testing Workflow

### Step 1: Test NGO Wallet Management
```
1. Login as NGO (if not verified, admin must verify first)
2. Go to NGO Dashboard
3. See wallet status (should say "Wallet Not Configured")
4. Click "Add Wallet" button
5. Enter your Ethereum address from MetaMask: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
6. Click "Update"
7. See success message and reload page
8. Verify wallet now shows in dashboard
```

### Step 2: Test Campaign Creation (Requires Wallet)
```
1. Ensure NGO wallet is set (Step 1)
2. Go to NGO Dashboard → Create Campaign
3. Fill campaign details (title, description, funding goal)
4. Add milestones with amounts (e.g., 0.1 ETH, 0.2 ETH)
5. Submit campaign
6. Verify campaign created successfully
7. Campaign should auto-populate with NGO wallet address
```

### Step 3: Test Donation & Fund Release
```
1. Login as Donor
2. Go to Campaign Details
3. Click "Donate" button
4. Connect MetaMask (should auto-switch to Hardhat Local network)
5. Enter donation amount (e.g., 0.5 ETH)
6. Confirm transaction in MetaMask
7. Wait for transaction confirmation
8. Verify donation appears in campaign
```

### Step 4: Test Proof Submission (NGO)
```
1. Login as NGO
2. Go to Campaigns → Select campaign with milestones
3. Click "Submit Proof" for a milestone
4. Upload proof file or enter proof details
5. Submit proof
6. Verify proof appears in "Pending Verification"
```

### Step 5: Test Admin Proof Verification
```
1. Login as Admin
2. Go to Admin → Proof Verification
3. View pending proofs
4. Click "Verify" on a proof
5. Verify proof status changes to "verified"
6. Check NGO wallet is shown in system
```

### Step 6: Test Fund Release (Complete Flow)
```
1. Ensure proof is verified (Step 5)
2. Go to Admin Dashboard
3. Find campaign with verified proof
4. Click "Release Funds" for the milestone
5. Backend calls smart contract:
   - registerCampaign(campaignId, ngoAddress)
   - registerMilestone(milestoneId, campaignId, amountWei)
   - releaseFunds(milestoneId)
6. Verify transaction hash returned
7. NGO should receive ETH in wallet
```

## API Endpoints Reference

### NGO Profile Management
```bash
# Get NGO profile (with wallet)
GET /api/ngo/profile
Authorization: Bearer {token}
# Response: { _id, email, walletAddress, profile: { name, organizationName, phone }, ... }

# Update NGO wallet address
PUT /api/ngo/profile
Authorization: Bearer {token}
Content-Type: application/json
{
  "walletAddress": "0x0000000000000000000000000000000000000000"
}
# Response: { _id, email, walletAddress, ... }

# Update profile info
PUT /api/ngo/profile
Authorization: Bearer {token}
Content-Type: application/json
{
  "profile": {
    "name": "John Doe",
    "organizationName": "My NGO",
    "phone": "+91234567890"
  }
}
```

### Campaign Operations
```bash
# Create campaign (requires NGO wallet to be set)
POST /api/campaigns
Authorization: Bearer {token}
Content-Type: application/json
{
  "title": "Campaign Title",
  "slug": "campaign-title",
  "description": "...",
  "category": "education",
  "fundingGoal": 50000
}
# Response: { _id, ngoWalletAddress: "0x...", ... }
# Error if no wallet: 409 "NGO wallet address is required before campaign creation"
```

### Fund Release
```bash
# Release milestone funds (Admin only)
POST /api/admin/milestones/{milestoneId}/release
Authorization: Bearer {admin_token}
Content-Type: application/json
{
  "decision": "approve",
  "txHash": "0x...",
  "remarks": "Funds released successfully"
}
# Internally calls:
# blockchainService.releaseMilestoneFunds({
#   milestoneId, campaignId, ngoAddress, milestoneAmountEth
# })
```

## Troubleshooting

### Issue: "NGO wallet address is required before campaign creation"
**Solution:**
1. Go to NGO Dashboard
2. Click "Add Wallet" 
3. Enter Ethereum address from MetaMask
4. Verify wallet appears in dashboard
5. Retry campaign creation

### Issue: "NGO wallet address is not configured" (Admin fund release)
**Solution:**
1. Check campaign has `ngoWalletAddress` field populated
2. Verify in Admin → Campaign Monitoring
3. If missing, the campaign was created before wallet system was implemented
4. Update campaign wallet manually or recreate campaign with new NGO wallet

### Issue: Fund release says "Invalid NGO wallet address"
**Solution:**
1. Verify wallet address is valid Ethereum format (0x + 40 hex)
2. Check wallet address doesn't have typos
3. Ensure it's the same address configured in NGO profile

### Issue: MetaMask shows 0 ETH instead of 10000
**Solution:**
1. Ensure MetaMask is connected to "Hardhat Local" network
2. Check network chain ID is 31337
3. Try hard refresh: Ctrl+Shift+R
4. Reimport account if needed

## Key Files Modified

### Backend
- `backend/src/routes/ngo.js` - Added profile endpoints
- `backend/src/controllers/ngoController.js` - Added profile methods
- `backend/src/validation/ngo.js` - Added wallet validation schema
- `backend/src/services/blockchainService.js` - Enhanced releaseMilestoneFunds
- `backend/src/controllers/campaignController.js` - Validates wallet before campaign creation

### Frontend
- `frontend/src/pages/ngo/NgoDashboard.jsx` - Shows wallet status and management button
- `frontend/src/components/ui/WalletAddressModal.jsx` - Wallet update form modal
- `frontend/src/services/ngoService.js` - API calls for profile management
- `frontend/src/pages/admin/NgoVerification.jsx` - Shows wallet status in table
- `frontend/src/pages/admin/CampaignMonitoring.jsx` - Shows NGO wallet for each campaign

## Verification Checklist

- [ ] Hardhat node running on 127.0.0.1:8545
- [ ] Contract deployed to 0x5FbDB2315678afecb367f032d93F642f64180aa3
- [ ] NGO can add wallet address via dashboard
- [ ] Campaign creation fails without wallet (409 error)
- [ ] Campaign created with wallet has ngoWalletAddress field
- [ ] Admin can see wallet status in NGO verification page
- [ ] Admin can see NGO wallet in campaign monitoring
- [ ] Fund release succeeds with valid wallet
- [ ] NGO receives ETH after fund release
- [ ] Blockchain shows transaction hash in UI

## Database Models

### User (NGO) ✅
- `walletAddress: String` (required for NGO role)
- Must match Ethereum address format: `^0x[a-fA-F0-9]{40}$`

### Campaign ✅
- `ngoWalletAddress: String` (required)
- Auto-populated from NGO wallet at campaign creation
- Used in fund release flow

### Milestone ✅
- No changes needed
- `fundRequest` tracks release status
- `status: 'completed'` after funds released

## Success Indicators

1. ✅ NGO dashboard shows wallet configuration button
2. ✅ Can add/update wallet via modal
3. ✅ Campaign creation validates wallet exists
4. ✅ Admin can see wallet status for all NGOs
5. ✅ Fund release returns blockchain transaction
6. ✅ NGO receives ETH in their Ethereum wallet
7. ✅ Smart contract prevents duplicate releases
8. ✅ Error messages are clear and actionable

---
**Date**: March 27, 2026
**System**: TrustTrack - NGO Wallet System
**Status**: Ready for Testing
