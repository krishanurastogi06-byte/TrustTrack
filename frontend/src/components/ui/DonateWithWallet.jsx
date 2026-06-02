import React, { useState } from "react";
import useWallet from "../../hooks/useWallet";
import useDonateWithWallet from "../../hooks/useDonateWithWallet";
import { Wallet, ExternalLink, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

function toEtherscan(txHash, chainId) {
  const mapping = {
    1: "https://etherscan.io/tx/",
    11155111: "https://sepolia.etherscan.io/tx/",
    5: "https://goerli.etherscan.io/tx/",
    137: "https://polygonscan.com/tx/",
    80002: "https://amoy.polygonscan.com/tx/",
    31337: null
  };
  const base = mapping[chainId];
  if (!base) return "";
  return base + txHash;
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const presetAmounts = ["0.01", "0.05", "0.1", "0.5"];

  if (!isInitialized) {
    return (
      <div className="max-w-md w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Initializing wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] transition-all duration-300">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <Wallet size={20} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Donate with Wallet</h3>
      </div>
      <p className="text-sm text-slate-500 mb-5 leading-relaxed">
        Support this campaign by sending ETH securely from your connected Web3 wallet.
      </p>

      {!isMetaMaskAvailable && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50/60 border border-red-100 rounded-2xl text-xs text-red-600 mb-4">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>MetaMask not detected. Please install MetaMask browser extension to make on-chain donations.</span>
        </div>
      )}

      {!contractAddress && (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/60 border border-amber-100 rounded-2xl text-xs text-amber-700 mb-4">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>Smart contract address is missing. Please check VITE_DONATION_CONTRACT env configuration.</span>
        </div>
      )}

      {!contractCampaignId && (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/60 border border-amber-100 rounded-2xl text-xs text-amber-700 mb-4">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>Campaign is not synced on-chain yet. Donations will be enabled once registered on the smart contract.</span>
        </div>
      )}

      {/* Wallet Connection Status */}
      <div className="mb-5">
        {isConnected ? (
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-slate-800">{shortAccount}</span>
            </div>
            <span className="text-xs text-slate-400 font-medium bg-slate-200/50 px-2 py-0.5 rounded-full">
              Chain {chainId}
            </span>
          </div>
        ) : (
          <button
            onClick={connect}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-[0.98] transition-all"
          >
            <Wallet size={18} />
            Connect Wallet
          </button>
        )}
      </div>

      {hasRemainingLimit && !isCampaignFunded && (
        <div className="flex justify-between items-center px-4 py-3 bg-indigo-50/50 border border-indigo-100/60 rounded-2xl text-sm mb-4">
          <span className="text-indigo-600 font-medium">Remaining limit:</span>
          <strong className="text-indigo-900">{safeRemaining.toFixed(4)} ETH</strong>
        </div>
      )}

      {isCampaignFunded && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-xs text-emerald-700 mb-4 font-semibold">
          <CheckCircle2 size={16} />
          <span>This campaign has successfully reached its funding goal!</span>
        </div>
      )}

      {isConnected && !isCampaignFunded && (
        <form onSubmit={onDonate} className="space-y-4">
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Amount (ETH)</label>
              {validationError && (
                <span className="text-xs text-red-600 font-medium">{validationError}</span>
              )}
            </div>
            <div className="relative">
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
                disabled={loading || status === "pending"}
                className={`w-full border rounded-2xl pl-4 pr-16 py-3 font-bold text-slate-800 outline-none transition-all ${
                  validationError 
                    ? "border-red-300 focus:border-red-400 bg-red-50/10" 
                    : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                }`}
                placeholder="0.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-sm">
                ETH
              </span>
            </div>
          </div>

          {/* Preset amount buttons */}
          <div className="grid grid-cols-4 gap-2">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(preset);
                  setValidationError(validateAmount(preset));
                }}
                disabled={loading || status === "pending" || (hasRemainingLimit && Number(preset) > safeRemaining)}
                className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                  amount === preset
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {preset}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!isConnected || !recipientAddress || !contractCampaignId || loading || status === "pending" || exceedsRemaining || isCampaignFunded}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {status === "pending" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Confirming Transaction...
              </span>
            ) : loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              "Donate Now"
            )}
          </button>
        </form>
      )}

      {/* Transaction status alerts */}
      <div className="mt-4 space-y-2.5">
        {status === "confirmed" && (
          <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-800">
            <CheckCircle2 size={16} className="mt-0.5 text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Thank you for your donation!</p>
              <p className="text-emerald-700/90 mt-0.5">Donation confirmed on-chain.</p>
              {txHash && (
                <a
                  href={toEtherscan(txHash, chainId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold underline mt-1 text-emerald-800 hover:text-emerald-950"
                >
                  View Transaction
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-800">
            <AlertTriangle size={16} className="mt-0.5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Transaction Failed</p>
              <p className="text-red-700/90 mt-0.5">{String(error?.message || error)}</p>
            </div>
          </div>
        )}

        {status === "pending" && (
          <div className="flex items-start gap-2.5 p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-800 animate-pulse">
            <Loader2 size={16} className="mt-0.5 text-indigo-600 flex-shrink-0 animate-spin" />
            <div className="flex-1">
              <p className="font-bold">Transaction Pending</p>
              <p className="text-indigo-700/90 mt-0.5">Waiting for block confirmation on the network...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
