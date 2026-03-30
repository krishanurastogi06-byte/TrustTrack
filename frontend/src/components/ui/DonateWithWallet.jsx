import React, { useState } from "react";
import useWallet from "../../hooks/useWallet";
import useDonateWithWallet from "../../hooks/useDonateWithWallet";

function toEtherscan(txHash, chainId) {
  const mapping = {
    1: "https://etherscan.io/tx/",
    5: "https://goerli.etherscan.io/tx/",
    137: "https://polygonscan.com/tx/",
  };
  return (mapping[chainId] || "https://etherscan.io/tx/") + txHash;
}

export default function DonateWithWallet({ contractAddress, abi = null, campaignId, contractCampaignId, remainingEth = null, onDonationConfirmed = null }) {
  const { account, shortAccount, connect, isConnected, chainId, isMetaMaskAvailable, isInitialized } = useWallet();
  const recipientAddress = contractAddress;
  const isTestRecipientMode = false;
  const { donate, status, txHash, error } = useDonateWithWallet({
    contractAddress: recipientAddress,
    abi,
    confirmations: 1,
    onConfirmed: onDonationConfirmed,
  });

  const [amount, setAmount] = useState("0.01");
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");

  const parsedAmount = Number(amount || 0);
  const hasRemainingLimit = Number.isFinite(Number(remainingEth));
  const safeRemaining = hasRemainingLimit ? Math.max(0, Number(remainingEth)) : null;
  const isCampaignFunded = hasRemainingLimit && safeRemaining <= 0;
  const exceedsRemaining = hasRemainingLimit && Number.isFinite(parsedAmount) && parsedAmount > safeRemaining + 1e-12;

  function validateAmount(nextAmountRaw) {
    const nextAmount = Number(nextAmountRaw || 0);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      return "Enter a valid donation amount";
    }
    if (hasRemainingLimit && nextAmount > safeRemaining + 1e-12) {
      return `Max donation allowed is ${safeRemaining.toFixed(6)} ETH`;
    }
    return "";
  }

  async function onDonate(e) {
    e.preventDefault();
    const nextError = validateAmount(amount);
    setValidationError(nextError);
    if (isCampaignFunded || nextError) return;

    setLoading(true);
    try {
      await donate({ amountEth: amount, campaignId, contractCampaignId, metadata: { ui: "donation-widget" } });
      // On success, handle UI in effect of status
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Show loading state while wallet is initializing from localStorage
  if (!isInitialized) {
    return (
      <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow">
        <div className="mb-4">
          <h3 className="text-lg font-bold">Donate with Wallet</h3>
          <p className="text-sm text-slate-500">Support this campaign by sending ETH securely from your wallet.</p>
        </div>
        <div className="text-sm text-slate-500 flex items-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></span>
          Initializing wallet...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow">
      <div className="mb-4">
        <h3 className="text-lg font-bold">Donate with Wallet</h3>
        <p className="text-sm text-slate-500">Support this campaign by sending ETH securely from your wallet.</p>
      </div>

      {!isMetaMaskAvailable && (
        <div className="text-sm text-red-600">MetaMask not detected. Please install MetaMask to donate.</div>
      )}

      {!contractAddress && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-2 mb-3">
          Smart contract address is missing. Set VITE_DONATION_CONTRACT in your environment to enable donations.
        </div>
      )}

      {!contractCampaignId && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-2 mb-3">
          Campaign is not synced on-chain yet. Donation is disabled until contractCampaignId is available.
        </div>
      )}

      <div className="mb-3">
        {isConnected ? (
          <div className="text-sm">Connected: <strong>{shortAccount}</strong> (chain {chainId})</div>
        ) : (
          <button
            onClick={connect}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {isTestRecipientMode && (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md p-2">
          Test mode recipient: {shortAccount}
        </div>
      )}

      {hasRemainingLimit && (
        <div className="mb-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-2">
          Remaining: <strong>{safeRemaining.toFixed(6)} ETH</strong>
        </div>
      )}

      {isCampaignFunded && (
        <div className="mb-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md p-2">
          Campaign goal reached
        </div>
      )}

      <form onSubmit={onDonate} className="space-y-3">
        <div>
          <label className="text-sm font-semibold">Amount (ETH)</label>
          <input
            value={amount}
            onChange={(e) => {
              const nextValue = e.target.value;
              setAmount(nextValue);
              setValidationError(validateAmount(nextValue));
            }}
            type="number"
            step="0.0001"
            min="0.0001"
            max={hasRemainingLimit ? safeRemaining : undefined}
            className="w-full border border-slate-200 rounded-md px-3 py-2 mt-1"
          />
          {validationError && (
            <p className="text-xs text-red-600 mt-1">{validationError}</p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={!isConnected || !recipientAddress || !contractCampaignId || loading || status === "pending" || exceedsRemaining || isCampaignFunded}
            className="w-full inline-flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-md disabled:opacity-60"
          >
            {isCampaignFunded
              ? "Campaign goal reached"
              : status === "pending"
                ? "Waiting for confirmation…"
                : loading
                  ? "Sending…"
                  : "Donate"}
          </button>
        </div>
      </form>

      <div className="mt-4 text-sm space-y-2">
        {status === "confirmed" && (
          <div className="text-green-600">Donation confirmed ✅ {txHash && <a href={toEtherscan(txHash, chainId)} target="_blank" rel="noreferrer" className="underline">View on explorer</a>}</div>
        )}
        {status === "failed" && <div className="text-red-600">Transaction failed: {String(error?.message || error)}</div>}
        {status === "pending" && <div className="text-slate-600">Transaction submitted, waiting for confirmation…</div>}
        {txHash && status !== "pending" && (
          <div className="text-xs text-slate-500">Tx: <a href={toEtherscan(txHash, chainId)} target="_blank" rel="noreferrer" className="underline">{txHash}</a></div>
        )}
      </div>
    </div>
  );
}
