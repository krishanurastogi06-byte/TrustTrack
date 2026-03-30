import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { FileSearch, Check, X, ExternalLink, Trash2, Coins } from "lucide-react";
import { useAdminProofs, useDeleteMilestone, useRejectProof, useReleaseMilestoneFunds, useVerifyProof } from "../../hooks/useProofs";
import { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";

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

    const proofs = data?.data || [];
    const rows = proofs.map((p) => {
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
            <a href={`https://ipfs.io/ipfs/${p.cid}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors">
                <ExternalLink size={16} /> View Document
            </a>,
            <Badge label={status} type={statusType} />,
            canReview ? (
                <div className="flex gap-2">
                    <Button
                        label="Approve"
                        type="success"
                        className="!px-3 !py-1.5 text-xs"
                        onClick={() => verifyMutation.mutate({ proofId: p._id, payload: { remarks: "Approved" } })}
                    >
                        <Check size={16} /> Approve
                    </Button>
                    <Button
                        label="Reject"
                        type="danger"
                        className="!px-3 !py-1.5 text-xs"
                        onClick={() => rejectMutation.mutate({ proofId: p._id, payload: { remarks: "Rejected" } })}
                    >
                        <X size={16} /> Reject
                    </Button>
                    <Button
                        label="Delete Milestone"
                        type="danger"
                        className="!px-3 !py-1.5 text-xs"
                        disabled={deleteMilestoneMutation.isPending}
                        onClick={() => handleDeleteMilestone(p)}
                    >
                        <Trash2 size={16} /> Delete Milestone
                    </Button>
                    {canRelease && (
                        <Button
                            label="Release Funds"
                            type="success"
                            className="!px-3 !py-1.5 text-xs"
                            disabled={releaseMutation.isPending}
                            onClick={() => handleReleaseFunds(p)}
                        >
                            <Coins size={16} /> Release Funds
                        </Button>
                    )}
                </div>
            ) : (
                <div className="flex gap-2 items-center">
                    <span className="text-xs text-slate-500 font-semibold">Reviewed</span>
                    {canRelease && (
                        <Button
                            label="Release Funds"
                            type="success"
                            className="!px-3 !py-1.5 text-xs"
                            disabled={releaseMutation.isPending}
                            onClick={() => handleReleaseFunds(p)}
                        >
                            <Coins size={16} /> Release Funds
                        </Button>
                    )}
                    <Button
                        label="Delete Milestone"
                        type="danger"
                        className="!px-3 !py-1.5 text-xs"
                        disabled={deleteMilestoneMutation.isPending}
                        onClick={() => handleDeleteMilestone(p)}
                    >
                        <Trash2 size={16} /> Delete Milestone
                    </Button>
                </div>
            ),
        ];
    });

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <FileSearch className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Proof Verification
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Review submitted proofs before unlocking subsequent milestone funds.</p>
            </div>
            
            <Card className="p-0 overflow-hidden">
                {actionError && (
                    <div className="mx-6 mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        {actionError}
                    </div>
                )}

                {actionSuccess && (
                    <div className="mx-6 mt-5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                        <p>{actionSuccess}</p>
                        {releaseInfo?.txHash && (
                            <p className="mt-1 text-xs font-semibold break-all">
                                Tx Hash: {releaseInfo.txHash}
                                {releaseExplorerUrl && (
                                    <>
                                        {" "}
                                        <a
                                            href={releaseExplorerUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-emerald-800 underline"
                                        >
                                            View on explorer
                                        </a>
                                    </>
                                )}
                            </p>
                        )}
                        {releaseInfo?.warning && (
                            <p className="mt-1 text-xs text-amber-700">{releaseInfo.warning}</p>
                        )}
                    </div>
                )}

                {isLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading proofs...</div>
                ) : isError ? (
                    <div className="p-8 text-center">
                        <p className="text-red-700 font-semibold">{error?.message || "Failed to load proofs"}</p>
                        <button onClick={() => refetch()} className="mt-2 text-sm underline text-red-700">Retry</button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No proofs found.</div>
                ) : (
                    <Table headers={headers} data={rows} />
                )}
            </Card>
        </div>
    );
}

export default ProofVerification;