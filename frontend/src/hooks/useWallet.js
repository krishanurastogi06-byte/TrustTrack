import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useAuthStore } from "../store/useAuthStore";

const WALLET_STORAGE_KEY = "trusttrack_wallet_state";
const WALLET_ACCOUNT_KEY = "trusttrack_wallet_account";
const WALLET_CHAIN_KEY = "trusttrack_wallet_chain";

function requireClientEnv(name) {
  const value = import.meta.env[name];
  if (value == null || String(value).trim() === "") {
    throw new Error(`[config] Missing required frontend environment variable: ${name}`);
  }
  return String(value).trim();
}

const TARGET_CHAIN_ID = Number(requireClientEnv("VITE_CHAIN_ID"));
if (!Number.isInteger(TARGET_CHAIN_ID) || TARGET_CHAIN_ID !== 80002) {
  throw new Error(`[config] Invalid VITE_CHAIN_ID="${import.meta.env.VITE_CHAIN_ID}". Only 80002 (Polygon Amoy) is allowed at runtime.`);
}

const TARGET_CHAIN_NAME = requireClientEnv("VITE_CHAIN_NAME");
const TARGET_RPC_URL = requireClientEnv("VITE_CHAIN_RPC_URL");
const TARGET_CURRENCY_SYMBOL = requireClientEnv("VITE_CHAIN_SYMBOL");
const TARGET_EXPLORER_URL = requireClientEnv("VITE_CHAIN_EXPLORER_URL");

if (TARGET_RPC_URL.toLowerCase().includes("localhost") || TARGET_RPC_URL.includes("127.0.0.1")) {
  throw new Error(`[config] Invalid VITE_CHAIN_RPC_URL="${TARGET_RPC_URL}". Localhost RPC is not allowed at runtime.`);
}

function getWalletStorageKeys(roleScope) {
  const suffix = roleScope ? `_${roleScope}` : "";
  return {
    WALLET_STORAGE_KEY: `${WALLET_STORAGE_KEY}${suffix}`,
    WALLET_ACCOUNT_KEY: `${WALLET_ACCOUNT_KEY}${suffix}`,
    WALLET_CHAIN_KEY: `${WALLET_CHAIN_KEY}${suffix}`,
  };
}

function getPreferredAccountIndex(roleScope) {
  if (roleScope === "ngo") return 0;
  if (roleScope === "donor") return 0;
  return 0;
}

function shortAddress(address = "") {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Persist wallet state to localStorage
 */
function persistWalletState(account, chainId, roleScope) {
  const keys = getWalletStorageKeys(roleScope);
  try {
    if (account && chainId) {
      localStorage.setItem(keys.WALLET_ACCOUNT_KEY, account);
      localStorage.setItem(keys.WALLET_CHAIN_KEY, String(chainId));
      localStorage.setItem(keys.WALLET_STORAGE_KEY, JSON.stringify({ account, chainId }));
    }
  } catch (e) {
    console.warn("Failed to persist wallet state to localStorage:", e);
  }
}

/**
 * Retrieve wallet state from localStorage
 */
function retrieveWalletState(roleScope) {
  const keys = getWalletStorageKeys(roleScope);
  try {
    const stored = localStorage.getItem(keys.WALLET_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Fallback to individual keys for backward compatibility
    const account = localStorage.getItem(keys.WALLET_ACCOUNT_KEY);
    const chainId = localStorage.getItem(keys.WALLET_CHAIN_KEY);
    if (account && chainId) {
      return { account, chainId: parseInt(chainId, 10) };
    }
  } catch (e) {
    console.warn("Failed to retrieve wallet state from localStorage:", e);
  }
  return null;
}

/**
 * Clear wallet state from localStorage
 */
function clearWalletState(roleScope) {
  const keys = getWalletStorageKeys(roleScope);
  try {
    localStorage.removeItem(keys.WALLET_STORAGE_KEY);
    localStorage.removeItem(keys.WALLET_ACCOUNT_KEY);
    localStorage.removeItem(keys.WALLET_CHAIN_KEY);
  } catch (e) {
    console.warn("Failed to clear wallet state from localStorage:", e);
  }
}

export function useWallet(options = {}) {
  const roleFromStore = useAuthStore((state) => state.role);
  const roleScope = options.role || roleFromStore || "shared";
  const preferredAccountIndex = getPreferredAccountIndex(roleScope);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const isMetaMaskAvailable = typeof window !== "undefined" && !!window.ethereum;

  const ensureTargetNetwork = useCallback(async () => {
    if (!isMetaMaskAvailable) return;

    const currentHex = await window.ethereum.request({ method: "eth_chainId" });
    const currentId = parseInt(currentHex, 16);
    if (currentId === TARGET_CHAIN_ID) return;

    const targetHex = `0x${TARGET_CHAIN_ID.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetHex }],
      });
    } catch (err) {
      // 4902 means chain is not added in MetaMask yet.
      if (err?.code === 4902) {
        const addChainParams = {
          chainId: targetHex,
          chainName: TARGET_CHAIN_NAME,
          nativeCurrency: { name: TARGET_CURRENCY_SYMBOL, symbol: TARGET_CURRENCY_SYMBOL, decimals: 18 },
          rpcUrls: [TARGET_RPC_URL],
        };
        if (TARGET_EXPLORER_URL) {
          addChainParams.blockExplorerUrls = [TARGET_EXPLORER_URL];
        }

        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [addChainParams],
        });
        return;
      }
      throw err;
    }
  }, [isMetaMaskAvailable]);

  /**
   * Internal function to establish provider and signer from window.ethereum
   */
  const initializeProvider = useCallback(async (targetAccount) => {
    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum, "any");
      const nextSigner = targetAccount
        ? await web3Provider.getSigner(targetAccount)
        : await web3Provider.getSigner();
      const network = await web3Provider.getNetwork();
      const id = Number(network.chainId);

      setProvider(web3Provider);
      setSigner(nextSigner);
      setChainId(id);

      // Verify the target account is still available
      if (targetAccount) {
        const accounts = await web3Provider.send("eth_accounts", []);
        if (accounts.length === 0 || !accounts.some((a) => a.toLowerCase() === targetAccount.toLowerCase())) {
          // Target account not available, clear state
          return null;
        }
        setAccount(targetAccount);
        return targetAccount;
      }

      return null;
    } catch (err) {
      console.warn("Failed to initialize provider:", err);
      return null;
    }
  }, []);

  /**
   * Explicit user-triggered connection (shows MetaMask popup)
   */
  const connect = useCallback(async () => {
    setError(null);
    if (!isMetaMaskAvailable) {
      const err = new Error("MetaMask not installed");
      setError(err);
      throw err;
    }

    try {
      await ensureTargetNetwork();
      const web3Provider = new ethers.BrowserProvider(window.ethereum, "any");
      // Request accounts - this shows the MetaMask popup
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from MetaMask");
      }

      const connectedAccount = accounts[preferredAccountIndex] || accounts[0];
      if (!connectedAccount) {
        throw new Error("No eligible account found for this role");
      }
      const signer = await web3Provider.getSigner(connectedAccount);
      const network = await web3Provider.getNetwork();
      const id = Number(network.chainId);

      setProvider(web3Provider);
      setSigner(signer);
      setAccount(connectedAccount);
      setChainId(id);
      setError(null);

      // Persist to localStorage
      persistWalletState(connectedAccount, id, roleScope);

      return { provider: web3Provider, signer, account: connectedAccount, chainId: id };
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [isMetaMaskAvailable, ensureTargetNetwork, preferredAccountIndex, roleScope]);

  /**
   * Disconnect wallet and clear all state
   */
  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setError(null);
    clearWalletState(roleScope);
  }, [roleScope]);

  /**
   * Effect 1: Auto-reconnect on app load from localStorage
   * Runs once on mount to restore wallet state if available
   */
  useEffect(() => {
    if (!isMetaMaskAvailable) {
      setIsInitialized(true);
      return;
    }

    let isMounted = true;

    async function autoReconnect() {
      const stored = retrieveWalletState(roleScope);
      if (!stored) {
        try {
          const web3Provider = new ethers.BrowserProvider(window.ethereum, "any");
          const accounts = await web3Provider.send("eth_accounts", []);
          const preferredAccount = accounts[preferredAccountIndex] || null;
          if (preferredAccount) {
            const signer = await web3Provider.getSigner(preferredAccount);
            const network = await web3Provider.getNetwork();
            const id = Number(network.chainId);
            if (isMounted) {
              setProvider(web3Provider);
              setSigner(signer);
              setAccount(preferredAccount);
              setChainId(id);
              persistWalletState(preferredAccount, id, roleScope);
            }
          }
        } catch (_e) {
          // Ignore silent auto-reconnect failures.
        }
        isMounted && setIsInitialized(true);
        return;
      }

      const { account: storedAccount, chainId: storedChainId } = stored;

      try {
        await ensureTargetNetwork();
        // Try to initialize provider with stored account
        const initializedAccount = await initializeProvider(storedAccount);

        if (isMounted) {
          if (initializedAccount) {
            // Account is still available, update chainId and persist
            persistWalletState(initializedAccount, storedChainId, roleScope);
            console.debug("Wallet auto-restored from localStorage:", initializedAccount);
          } else {
            // Stored account is no longer available
            clearWalletState(roleScope);
            console.debug("Stored wallet no longer available, cleared local state");
          }
          setIsInitialized(true);
        }
      } catch (err) {
        // Error during auto-reconnection, clear state but don't throw
        if (isMounted) {
          clearWalletState(roleScope);
          console.warn("Auto-reconnection failed:", err);
          setIsInitialized(true);
        }
      }
    }

    autoReconnect();

    return () => {
      isMounted = false;
    };
  }, [isMetaMaskAvailable, initializeProvider, ensureTargetNetwork, preferredAccountIndex, roleScope]);

  /**
   * Effect 2: Listen for account and chain changes from MetaMask
   */
  useEffect(() => {
    if (!isMetaMaskAvailable) return;

    const handleAccountsChanged = async (accounts) => {
      if (!accounts || accounts.length === 0) {
        // User disconnected from MetaMask
        disconnect();
        return;
      }

      const newAccount = accounts[preferredAccountIndex] || accounts[0];
      if (!newAccount) {
        disconnect();
        return;
      }
      setAccount(newAccount);

      // Update provider and signer
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum, "any");
        const nextSigner = await web3Provider.getSigner();
        const network = await web3Provider.getNetwork();
        const id = Number(network.chainId);

        setProvider(web3Provider);
        setSigner(nextSigner);
        setChainId(id);

        // Persist the new account
        persistWalletState(newAccount, id, roleScope);
      } catch (err) {
        console.warn("Failed to update provider after account change:", err);
        // Preserve current signer state
      }
    };

    const handleChainChanged = (chainHex) => {
      const id = parseInt(chainHex, 16);
      setChainId(id);

      // Persist updated chainId with current account
      if (account) {
        persistWalletState(account, id, roleScope);
      }
    };

    const handleDisconnect = () => {
      console.debug("MetaMask disconnect event fired");
      disconnect();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("disconnect", handleDisconnect);

    return () => {
      try {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
        window.ethereum.removeListener("disconnect", handleDisconnect);
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [isMetaMaskAvailable, account, disconnect, roleScope, preferredAccountIndex]);

  return {
    provider,
    signer,
    account,
    shortAccount: account ? shortAddress(account) : null,
    chainId,
    connect,
    disconnect,
    isConnected: !!account,
    isMetaMaskAvailable,
    isInitialized,
    error,
  };
}

export default useWallet;
