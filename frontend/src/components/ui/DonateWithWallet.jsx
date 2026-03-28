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

export default function DonateWithWallet({ contractAddress, abi = null, campaignId }) {
  const { account, shortAccount, connect, isConnected, chainId, isMetaMaskAvailable, isInitialized } = useWallet();
  const recipientAddress = contractAddress || account;
  const isTestRecipientMode = !contractAddress && Boolean(account);
  const { donate, status, txHash, error } = useDonateWithWallet({ contractAddress: recipientAddress, abi, confirmations: 1 });

  const [amount, setAmount] = useState("0.01");
  const [loading, setLoading] = useState(false);

  async function onDonate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await donate({ amountEth: amount, campaignId, metadata: { ui: "donation-widget" } });
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
          Smart contract address is missing. Set VITE_DONATION_CONTRACT in your environment. Until then, this widget uses test mode and sends to your connected wallet.
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

      <form onSubmit={onDonate} className="space-y-3">
        <div>
          <label className="text-sm font-semibold">Amount (ETH)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="0.0001"
            min="0.0001"
            className="w-full border border-slate-200 rounded-md px-3 py-2 mt-1"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={!isConnected || !recipientAddress || loading || status === "pending"}
            className="w-full inline-flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-md disabled:opacity-60"
          >
            {status === "pending" ? "Waiting for confirmation…" : loading ? "Sending…" : "Donate"}
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
