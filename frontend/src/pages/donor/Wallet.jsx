import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { Wallet as WalletIcon, Copy, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import useWallet from "../../hooks/useWallet";
import { formatEther } from "ethers";
import { useEffect, useState } from "react";
import authService from "../../services/authService";

function Wallet() {
    const { account, connect, disconnect, provider, isConnected, chainId, isMetaMaskAvailable, error, isInitialized } = useWallet({ role: "donor" });
    const [balance, setBalance] = useState("0");
    const [isConnecting, setIsConnecting] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [saveSuccess, setSaveSuccess] = useState("");

    useEffect(() => {
        async function loadBalance() {
            if (!provider || !account) return;
            const value = await provider.getBalance(account);
            setBalance(Number(formatEther(value)).toFixed(4));
        }
        loadBalance();
    }, [provider, account]);

    const short = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "-";

    async function handleConnect() {
        setSaveError("");
        setSaveSuccess("");
        setIsConnecting(true);
        try {
            const connected = await connect();
            if (connected?.account) {
                await authService.updateWallet(connected.account);
                setSaveSuccess("Wallet connected and saved successfully.");
            }
        } catch (err) {
            setSaveError(err?.message || "Failed to connect wallet");
        } finally {
            setIsConnecting(false);
        }
    }

    async function handleDisconnect() {
        setSaveError("");
        setSaveSuccess("");
        try {
            disconnect();
            setBalance("0");
            setSaveSuccess("Wallet disconnected successfully.");
        } catch (err) {
            setSaveError(err?.message || "Failed to disconnect wallet");
        }
    }

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <WalletIcon className="text-indigo-600" size={32} strokeWidth={2.5} />
                    My Wallet
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Manage your balance and cryptocurrency connections.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] gap-6 items-start">
                <Card className="w-full relative overflow-hidden group border-none shadow-[0_8px_30px_-4px_rgba(79,70,229,0.15)] bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 text-white">
                    {/* Decorative background circle */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                    <div className="absolute -bottom-8 -left-8 w-64 h-64 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest mb-1">Available Balance</p>
                                {isConnected ? (
                                    <>
                                        <h2 className="text-5xl font-extrabold tracking-tight">{balance} <span className="text-2xl text-indigo-300">ETH</span></h2>
                                        <p className="text-indigo-200 font-medium mt-2">Network: {chainId || "-"}</p>
                                    </>
                                ) : (
                                    <p className="text-xl text-indigo-300 font-semibold">Not Connected</p>
                                )}
                            </div>
                        </div>

                        {isConnected && (
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/10 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-indigo-200 font-semibold uppercase tracking-wider mb-1">Connected Address</p>
                                    <p className="font-mono text-sm">{short}</p>
                                </div>
                                <button
                                    onClick={() => account && navigator.clipboard.writeText(account)}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-colors text-indigo-200 hover:text-white"
                                >
                                    <Copy size={18} />
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Button 
                                label={isConnecting ? "Connecting..." : (isConnected ? "Disconnect Wallet" : "Connect Wallet")}
                                onClick={isConnected ? handleDisconnect : handleConnect}
                                disabled={isConnecting || !isInitialized}
                                className={`w-full font-bold shadow-none !py-3 border ${
                                  isConnected
                                    ? "bg-red-600 text-white hover:bg-red-700 border-red-600 cursor-pointer"
                                    : "bg-indigo-700 text-indigo-900 hover:bg-indigo-50 hover:text-indigo-900 cursor-pointer border-indigo-600"
                                }`}
                            >
                                {isConnected ? (
                                    <>
                                        <ArrowUpRight size={18} className="mr-1" /> Disconnect
                                    </>
                                ) : (
                                    <>
                                        <ArrowDownLeft size={18} className="mr-1" /> Connect Wallet
                                    </>
                                )}
                            </Button>
                            <Button 
                                label="Receive" 
                                className="bg-indigo-700 text-indigo-900 hover:bg-indigo-50 hover:text-indigo-900 w-full font-bold shadow-none !py-3 cursor-pointer border border-indigo-600"
                                disabled={!isConnected}
                            >
                                <ArrowUpRight size={18} className="mr-1" /> Share Address
                            </Button>
                        </div>

                        {!isMetaMaskAvailable && (
                            <p className="mt-4 text-xs text-amber-200">MetaMask not detected. Install it to connect your wallet.</p>
                        )}
                        {error && <p className="mt-2 text-xs text-red-200">{String(error.message || error)}</p>}
                        {saveError && (
                            <p className="mt-2 text-xs text-red-200">{saveError}</p>
                        )}
                        {saveSuccess && (
                            <p className="mt-2 text-xs text-emerald-200 flex items-center gap-1">
                                <CheckCircle2 size={14} /> {saveSuccess}
                            </p>
                        )}
                        {!isConnected && !error && !saveError && isInitialized && (
                            <p className="mt-4 text-xs text-slate-400 text-center">Click "Connect Wallet" to get started</p>
                        )}
                    </div>
                </Card>

                <Card className="w-full border border-slate-200 bg-white">
                    <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">How to install MetaMask</h3>
                    <p className="text-sm text-slate-500 mt-2">
                        Follow these steps to securely install MetaMask and connect your wallet to TrustTrack.
                    </p>

                    <ol className="mt-5 space-y-3 text-sm text-slate-700 list-decimal list-inside">
                        <li>Open the official MetaMask website or click on <span className="font-semibold">Open MetaMask Download</span>.</li>
                        <li>Choose your browser extension (Chrome, Edge, Firefox, or Brave).</li>
                        <li>Install the extension and pin MetaMask from your browser toolbar.</li>
                        <li>Create a new wallet or import an existing wallet using your secret recovery phrase.</li>
                        <li>Set a strong password and securely store your recovery phrase offline.</li>
                        <li>Return to this page and click <span className="font-semibold">Connect Wallet</span>.</li>
                    </ol>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <a
                            href="https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-700 text-white hover:bg-indigo-800 transition-colors"
                        >
                            Install from Chrome Web Store
                        </a>
                        <a
                            href="https://metamask.io/download/"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                        >
                            Open MetaMask Download
                        </a>
                        <a
                            href="https://support.metamask.io/start/getting-started-with-metamask/"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Setup Guide
                        </a>
                    </div>

                    <p className="mt-4 text-xs text-slate-500">
                        Security tip: Never share your 12/24-word secret recovery phrase with anyone.
                    </p>
                </Card>
            </div>
        </div>
    );
}

export default Wallet;