import { useState, useCallback } from "react";
import { ethers } from "ethers";
import useWallet from "./useWallet";
import donationService from "../services/donationService";

function normalizeChainIdValue(rawId) {
  if (typeof rawId === "bigint" || typeof rawId === "number") return rawId;
  const value = String(rawId || "").trim();
  if (!value) return 0n;
  if (/^\d+$/.test(value)) return BigInt(value);
  if (/^[a-fA-F0-9]{24}$/.test(value)) return BigInt(`0x${value}`);
  if (/^0x[a-fA-F0-9]+$/.test(value)) return BigInt(value);
  throw new Error("Invalid campaign id format for blockchain donate");
}

/**
 * useDonateWithWallet
 * - accepts contractAddress and optional ABI. If a `donate` payable method is present in ABI, it will be used.
 * - falls back to sending raw ETH to contract address (if no ABI or donate function).
 */
export function useDonateWithWallet({ contractAddress, abi = null, confirmations = 1 } = {}) {
  const { signer, account, chainId, connect, isConnected } = useWallet();
  const [status, setStatus] = useState("idle"); // idle | connecting | sending | pending | confirmed | failed
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const donate = useCallback(
    async ({ amountEth, campaignId, metadata = {} }) => {
      setError(null);
      let activeSigner = signer;
      if (!signer) {
        setStatus("connecting");
        try {
          const connection = await connect();
          activeSigner = connection?.signer;
        } catch (err) {
          setStatus("failed");
          setError(err);
          throw err;
        }
      }

      if (!activeSigner) {
        const err = new Error("Wallet not connected");
        setStatus("failed");
        setError(err);
        throw err;
      }

      const value = ethers.parseEther(String(amountEth));
      const campaignChainId = normalizeChainIdValue(campaignId ?? 0);

      try {
        setStatus("sending");

        let txResponse;

        if (abi && Array.isArray(abi)) {
          const contract = new ethers.Contract(contractAddress, abi, activeSigner);
          // prefer named function donate(uint256) if present
          if (contract.donate) {
            txResponse = await contract.donate(campaignChainId, { value });
          } else {
            // fallback: try calling a generic `contribute` or `fund` if available
            const fn = contract.contribute || contract.fund || contract.pay;
            if (fn) txResponse = await fn(campaignChainId, { value });
            else {
              // ABI present but no high-level payable method: send raw tx
              txResponse = await activeSigner.sendTransaction({ to: contractAddress, value });
            }
          }
        } else {
          // no ABI: raw transfer
          txResponse = await activeSigner.sendTransaction({ to: contractAddress, value });
        }

        setTxHash(txResponse.hash);
        setStatus("pending");

        // Wait for confirmations
        const receipt = await txResponse.wait(confirmations);

        setStatus("confirmed");

        // Persist confirmed donation with transaction hash
        try {
          await donationService.createDonation({
            campaignId,
            amount: Number(amountEth),
            currency: "ETH",
            txHash: txResponse.hash,
            status: "confirmed",
            metadata: {
              ...metadata,
              from: account,
              to: contractAddress,
              network: chainId,
              blockNumber: receipt.blockNumber,
              confirmations: receipt.confirmations,
            },
          });
        } catch (e) {
          console.warn("Failed to persist confirmed donation", e);
        }

        return { receipt };
      } catch (err) {
        setStatus("failed");
        setError(err);

        throw err;
      }
    },
    [signer, contractAddress, abi, connect, account, chainId, confirmations, txHash]
  );

  return { donate, status, txHash, error };
}

export default useDonateWithWallet;
