import Table from "../../components/ui/Table";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Activity, Check, X, AlertCircle, CheckCircle } from "lucide-react";
import { useAdminCampaigns, useRejectCampaign, useVerifyCampaign } from "../../hooks/useCampaigns";
import { useState } from "react";

function CampaignMonitoring() {
    const headers = ["Campaign Name", "Funds Raised", "NGO Wallet", "Status", "Actions"];
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");
    const { data, isLoading, isError, error, refetch } = useAdminCampaigns({ perPage: 100 });
    const verifyMutation = useVerifyCampaign({
        onSuccess: () => {
            setActionError("");
            setActionSuccess("Campaign verified successfully.");
        },
        onError: (err) => {
            setActionSuccess("");
            setActionError(err?.message || "Failed to verify campaign");
        },
    });
    const rejectMutation = useRejectCampaign({
        onSuccess: () => {
            setActionError("");
            setActionSuccess("Campaign rejected successfully.");
        },
        onError: (err) => {
            setActionSuccess("");
            setActionError(err?.message || "Failed to reject campaign");
        },
    });

    function handleVerify(campaign) {
        setActionError("");
        setActionSuccess("");
        verifyMutation.mutate(campaign._id || campaign.id);
    }

    function handleReject(campaign) {
        const confirmed = window.confirm(`Reject campaign \"${campaign.title}\"?`);
        if (!confirmed) return;
        setActionError("");
        setActionSuccess("");
        rejectMutation.mutate(campaign._id || campaign.id);
    }

    const rows = (data?.items || []).map((item) => {
        const hasWallet = !!item.ngoWalletAddress;
        return [
            <span className="font-bold text-slate-800">{item.title}</span>,
            <span className="font-semibold text-slate-600">₹0</span>,
            <div className="flex items-center gap-2">
                {hasWallet ? (
                    <>
                        <CheckCircle size={14} className="text-green-600" />
                        <span className="text-xs font-mono text-slate-600 truncate max-w-xs" title={item.ngoWalletAddress}>
                            {item.ngoWalletAddress.substring(0, 8)}...
                        </span>
                    </>
                ) : (
                    <>
                        <AlertCircle size={14} className="text-red-600" />
                        <span className="text-xs text-red-600 font-semibold">Missing</span>
                    </>
                )}
            </div>,
            <Badge
                label={item.status}
                type={item.status === "published" ? "success" : item.status === "cancelled" ? "danger" : "warning"}
            />,
            <div className="flex gap-2">
                <Button
                    type="success"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={item.status === "published" || verifyMutation.isPending || rejectMutation.isPending}
                    onClick={() => handleVerify(item)}
                >
                    <Check size={14} /> Verify
                </Button>
                <Button
                    type="danger"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={item.status === "cancelled" || verifyMutation.isPending || rejectMutation.isPending}
                    onClick={() => handleReject(item)}
                >
                    <X size={14} /> Reject
                </Button>
            </div>,
        ];
    });

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <Activity className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Campaign Monitoring
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Track active campaigns and monitor funding progress in real-time.</p>
            </div>
            
            <Card className="p-0 overflow-hidden">
                {actionError && (
                    <div className="mx-6 mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        {actionError}
                    </div>
                )}

                {actionSuccess && (
                    <div className="mx-6 mt-5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                        {actionSuccess}
                    </div>
                )}

                {isLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading campaigns...</div>
                ) : isError ? (
                    <div className="p-8 text-center">
                        <p className="text-red-700 font-semibold">{error?.message || "Failed to load campaigns"}</p>
                        <button onClick={() => refetch()} className="mt-2 text-sm underline text-red-700">Retry</button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No campaigns found.</div>
                ) : (
                    <Table headers={headers} data={rows} />
                )}
            </Card>
        </div>
    );
}

export default CampaignMonitoring;