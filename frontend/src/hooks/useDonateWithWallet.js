import { useState, useCallback } from "react";
import { ethers } from "ethers";
import useWallet from "./useWallet";
import donationService from "../services/donationService";

/**
 * useDonateWithWallet
 * - enforces donation via smart contract donate(contractCampaignId) only.
 * - contractCampaignId must be a numeric contract-generated ID (not Mongo _id).
 * - no direct sendTransaction fallback is allowed.
 */
export function useDonateWithWallet({ contractAddress, abi = null, confirmations = 1, onConfirmed = null } = {}) {
  const { signer, account, chainId, connect, isConnected } = useWallet();
  const [status, setStatus] = useState("idle"); // idle | connecting | sending | pending | confirmed | failed
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const donate = useCallback(
    async ({ amountEth, campaignId, contractCampaignId, metadata = {} }) => {
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
      const campaignChainId = BigInt(String(contractCampaignId || 0));
      
      if (campaignChainId <= 0n) {
        throw new Error("Invalid contractCampaignId: must be a positive numeric ID from smart contract");
      }

      try {
        setStatus("sending");

        if (!contractAddress || !ethers.isAddress(contractAddress)) {
          throw new Error("Invalid donation contract address");
        }

        if (!Array.isArray(abi) || !abi.length) {
          throw new Error("Donation contract ABI is required");
        }

        console.log("Contract Address:", contractAddress);

        const contract = new ethers.Contract(contractAddress, abi, activeSigner);
        if (!contract.donate) {
          throw new Error("donate(campaignId) function not found in contract ABI");
        }

        const txResponse = await contract.donate(campaignChainId, { value });

        setTxHash(txResponse.hash);
        setStatus("pending");

        // Wait for confirmations
        const receipt = await txResponse.wait(confirmations);

        const provider = activeSigner.provider;
        if (provider) {
          const contractBalance = await provider.getBalance(contractAddress);
          console.log("Contract Balance:", ethers.formatEther(contractBalance));
        }

        setStatus("confirmed");

        // Persist confirmed donation with transaction hash
        await donationService.confirmDonation({
          campaignId,
          contractCampaignId: String(contractCampaignId),
          amount: Number(amountEth),
          amountETH: Number(amountEth),
          currency: "ETH",
          txHash: txResponse.hash,
          metadata: {
            ...metadata,
            from: account,
            to: contractAddress,
            network: chainId,
            blockNumber: receipt.blockNumber,
            confirmations: receipt.confirmations,
          },
        });

        if (typeof onConfirmed === "function") {
          await onConfirmed({ campaignId, txHash: txResponse.hash, amountETH: Number(amountEth) });
        }

        return { receipt };
      } catch (err) {
        setStatus("failed");
        setError(err);

        throw err;
      }
    },
    [signer, contractAddress, abi, connect, account, chainId, confirmations, txHash, onConfirmed]
  );

  return { donate, status, txHash, error };
}

export default useDonateWithWallet;
