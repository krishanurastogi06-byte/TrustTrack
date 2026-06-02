import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { FileSearch, Check, X, ExternalLink, Trash2, Coins } from "lucide-react";
import { useAdminProofs, useDeleteMilestone, useRejectProof, useReleaseMilestoneFunds, useVerifyProof } from "../../hooks/useProofs";
import { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";


function proofUrlFromCid(cid) {
    if (!cid) return null;
    if (cid.startsWith("http://") || cid.startsWith("https://")) {
        return cid;
    }
    if (cid.startsWith("local://")) {
        const normalized = cid.replace("local://", "");
        return `/api/uploads/local/${normalized}`;
    }
    return `https://ipfs.io/ipfs/${cid}`;
}

function ProofVerification() {
    const headers = ["Campaign Name", "NGO Name", "NGO Wallet Address", "Tx Hash", "Milestone", "Amount (ETH)", "Proof Document", "Status", "Action"];
    const initialized = useAuthStore((state) => state.initialized);
    const role = useAuthStore((state) => state.role);
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");
    const [releaseInfo, setReleaseInfo] = useState(null);
    const { data, isLoading, isError, error, refetch } = useAdminProofs({}, { enabled: initialized && role === "admin" });
    const verifyMutation = useVerifyProof();
    const rejectMutation = useRejectProof();
    const releaseMutation = useReleaseMilestoneFunds({
        onSuccess: (result) => {
            setActionError("");
            setActionSuccess("Funds released successfully.");
            setReleaseInfo({
                txHash: result?.txHash || result?.blockchain?.txHash || "",
                network: result?.blockchain?.network,
                warning: result?.warning || "",
            });
        },
        onError: (err) => {
            setReleaseInfo(null);
            setActionSuccess("");
            setActionError(err?.message || "Failed to release funds");
        },
    });
    const deleteMilestoneMutation = useDeleteMilestone({
        onSuccess: () => {
            setActionError("");
            setActionSuccess("Milestone deleted successfully.");
        },
        onError: (err) => {
            setActionSuccess("");
            setActionError(err?.message || "Failed to delete milestone");
        },
    });

    function handleDeleteMilestone(proof) {
        const milestoneId = proof?.milestone?._id;
        if (!milestoneId) return;
        const milestoneTitle = proof?.milestone?.title || "this milestone";
        const confirmed = window.confirm(`Delete \"${milestoneTitle}\" milestone? This will remove associated proofs.`);
        if (!confirmed) return;
        setActionError("");
        setActionSuccess("");
        deleteMilestoneMutation.mutate(milestoneId);
    }

    function handleReleaseFunds(proof) {
        const milestoneId = proof?.milestone?._id;
        const expectedNgoWalletAddress = proof?.ngoWalletAddress;
        if (!milestoneId) return;

        setActionError("");
        setActionSuccess("");
        setReleaseInfo(null);
        releaseMutation.mutate({ milestoneId, expectedNgoWalletAddress });
    }

    function getExplorerTxUrl(txHash, network) {
        if (!txHash) return "";
        if (network === 1) return `https://etherscan.io/tx/${txHash}`;
        if (network === 11155111) return `https://sepolia.etherscan.io/tx/${txHash}`;
        if (network === 137) return `https://polygonscan.com/tx/${txHash}`;
        if (network === 80002) return `https://amoy.polygonscan.com/tx/${txHash}`;
        if (network === 31337) return "";
        return "";
    }

    const releaseExplorerUrl = getExplorerTxUrl(releaseInfo?.txHash, releaseInfo?.network);

    const [filter, setFilter] = useState("all");

    const filterOptions = [
        { id: "all", label: "All Proofs" },
        { id: "pending", label: "Pending" },
        { id: "verified", label: "Verified" },
        { id: "released_fund", label: "Funds Released" },
        { id: "rejected", label: "Rejected" },
    ];

    const allProofs = data?.data || [];

    const filteredProofs = allProofs.filter((p) => {
        const proofStatus = String(p?.status || "pending").toLowerCase();
        const isPaid = !!p?.milestone?.isPaid;

        if (filter === "all") return true;
        if (filter === "pending") return proofStatus === "pending";
        if (filter === "verified") return proofStatus === "verified" && !isPaid;
        if (filter === "released_fund") return isPaid;
        if (filter === "rejected") return proofStatus === "rejected";
        return true;
    });

    const rows = filteredProofs.map((p) => {
        const status = String(p?.status || "pending").toLowerCase();
        const statusType = status === "verified" ? "success" : status === "rejected" ? "danger" : "warning";
        const canReview = status === "pending";
        const milestoneStatus = String(p?.milestone?.status || "").toLowerCase();
        const canRelease = (milestoneStatus === "approved" || milestoneStatus === "verified") && !p?.milestone?.isPaid;

        const rowTxUrl = getExplorerTxUrl(p?.txHash, p?.releaseNetwork);

        return [
            <span className="font-semibold text-slate-700">{p?.campaignName || "-"}</span>,
            <span className="font-bold text-slate-800">{p?.ngoName || p?.uploader?.profile?.organizationName || p?.uploader?.email || "NGO"}</span>,
            <span className="font-mono text-xs text-slate-600 break-all max-w-[240px] inline-block">{p?.ngoWalletAddress || "-"}</span>,
            p?.txHash ? (
                rowTxUrl ? (
                    <a
                        href={rowTxUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 font-semibold hover:underline break-all"
                    >
                        {`${String(p.txHash).slice(0, 10)}...${String(p.txHash).slice(-8)}`}
                    </a>
                ) : (
                    <span className="font-mono text-xs text-slate-700 break-all">{p.txHash}</span>
                )
            ) : (
                <span className="text-xs text-slate-400">-</span>
            ),
            <span className="text-slate-600 font-medium bg-slate-100 px-3 py-1 rounded-lg text-sm">{p?.milestone?.title || "Milestone"}</span>,
            <span className="text-slate-700 font-semibold">{Number(p?.amountETH ?? p?.milestone?.amount ?? 0).toFixed(6)}</span>,
            <a href={proofUrlFromCid(p.cid)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors">
                <ExternalLink size={16} /> View Document
            </a>,
            <Badge label={p?.milestone?.isPaid ? "funds released" : status} type={p?.milestone?.isPaid ? "indigo" : statusType} />,
            canReview ? (
                <div className="flex gap-2 border-l border-slate-100 pl-4 py-2">
                    <Button
                        label="Approve"
                        type="success"
                        className="!px-3 !py-1.5 text-xs shadow-sm shadow-emerald-600/20"
                        onClick={() => verifyMutation.mutate({ proofId: p._id, payload: { remarks: "Approved" } })}
                    >
                        <Check size={16} /> Approve
                    </Button>
                    <Button
                        label="Reject"
                        type="danger"
                        className="!px-3 !py-1.5 text-xs shadow-sm shadow-red-600/20"
                        onClick={() => rejectMutation.mutate({ proofId: p._id, payload: { remarks: "Rejected" } })}
                    >
                        <X size={16} /> Reject
                    </Button>
                    <Button
                        label="Delete Milestone"
                        type="secondary"
                        className="!px-3 !py-1.5 text-xs !bg-red-50 !text-red-600 hover:!bg-red-100 border-none"
                        disabled={deleteMilestoneMutation.isPending}
                        onClick={() => handleDeleteMilestone(p)}
                    >
                        <Trash2 size={16} className="text-red-500" />
                    </Button>
                </div>
            ) : (
                <div className="flex gap-2 items-center border-l border-slate-100 pl-4 py-2">
                    {canRelease ? (
                        <Button
                            label="Release Funds"
                            type="primary"
                            className="!px-3 !py-1.5 text-xs shadow-sm shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={releaseMutation.isPending}
                            onClick={() => handleReleaseFunds(p)}
                        >
                            <Coins size={16} /> Release Funds
                        </Button>
                    ) : p?.milestone?.isPaid ? (
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 border border-indigo-100">
                            <Check size={14} /> Completed
                        </span>
                    ) : (
                        <span className="text-xs text-slate-500 font-semibold px-2">Reviewed</span>
                    )}
                    <Button
                        label="Delete Milestone"
                        type="secondary"
                        className="!px-3 !py-1.5 text-xs !bg-red-50 !text-red-700 hover:!bg-red-100 border-none"
                        disabled={deleteMilestoneMutation.isPending}
                        onClick={() => handleDeleteMilestone(p)}
                    >
                        <Trash2 size={16} className="text-red-500" />
                    </Button>
                </div>
            ),
        ];
    });

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-6 pb-6 border-b border-slate-200">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <FileSearch className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Proof Verification
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Review submitted proofs before unlocking subsequent milestone funds.</p>
            </div>

            <div className="mb-8 -mx-1 px-1">
                <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide md:pb-0 md:flex-wrap">
                    {filterOptions.map((opt) => {
                        const count = opt.id === "all"
                            ? allProofs.length
                            : allProofs.filter(p => {
                                if (opt.id === "pending") return String(p?.status).toLowerCase() === "pending";
                                if (opt.id === "verified") return String(p?.status).toLowerCase() === "verified" && !p?.milestone?.isPaid;
                                if (opt.id === "released_fund") return !!p?.milestone?.isPaid;
                                if (opt.id === "rejected") return String(p?.status).toLowerCase() === "rejected";
                                return true;
                            }).length;

                        return (
                            <button
                                key={opt.id}
                                onClick={() => setFilter(opt.id)}
                                className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border ${filter === opt.id
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                            >
                                {opt.label}
                                <span className={`flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] min-w-[20px] ${filter === opt.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                    }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <Card className="p-0 overflow-hidden shadow-sm border border-slate-200">
                {actionError && (
                    <div className="mx-6 mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
                        <X size={16} /> {actionError}
                    </div>
                )}

                {actionSuccess && (
                    <div className="mx-6 mt-5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4">
                        <p className="font-bold flex items-center gap-2"><Check size={16} /> {actionSuccess}</p>
                        {releaseInfo?.txHash && (
                            <div className="mt-3 bg-white/60 p-3 rounded-lg border border-emerald-100">
                                <p className="text-xs font-semibold text-slate-700 break-all flex items-center gap-2">
                                    <span className="bg-slate-200 px-2 py-1 rounded text-[10px] uppercase tracking-wider">Tx Hash</span>
                                    {releaseInfo.txHash}
                                </p>
                                {releaseExplorerUrl && (
                                    <a
                                        href={releaseExplorerUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 border border-emerald-200 bg-white px-3 py-1.5 rounded-lg shadow-sm"
                                    >
                                        <ExternalLink size={12} /> View on explorer
                                    </a>
                                )}
                            </div>
                        )}
                        {releaseInfo?.warning && (
                            <p className="mt-3 text-xs font-semibold text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2">
                                <span>⚠️</span> {releaseInfo.warning}
                            </p>
                        )}
                    </div>
                )}

                {isLoading ? (
                    <div className="p-16 text-center text-slate-500 font-medium animate-pulse">Loading proofs securely...</div>
                ) : isError ? (
                    <div className="p-16 text-center">
                        <p className="text-red-700 font-bold bg-red-50 px-4 py-3 rounded-xl border border-red-100 inline-block">{error?.message || "Failed to load proofs"}</p>
                        <br />
                        <button onClick={() => refetch()} className="mt-4 text-sm font-semibold underline text-red-700 hover:text-red-800">Retry Connection</button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
                        <FileSearch size={48} className="text-slate-300" strokeWidth={1} />
                        <p className="font-medium">No {filter !== "all" ? filter.replace("_", " ") : ""} proofs found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table headers={headers} data={rows} />
                    </div>
                )}
            </Card>
        </div>
    );
}

export default ProofVerification;