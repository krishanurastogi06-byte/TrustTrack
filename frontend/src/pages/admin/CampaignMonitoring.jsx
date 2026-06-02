import Table from "../../components/ui/Table";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Activity, Check, X, AlertCircle, CheckCircle, Search } from "lucide-react";
import { useAdminCampaigns, useRejectCampaign, useVerifyCampaign } from "../../hooks/useCampaigns";
import { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";

function CampaignMonitoring() {
    const initialized = useAuthStore((state) => state.initialized);
    const role = useAuthStore((state) => state.role);
    const headers = ["Campaign Name", "NGO Name", "Funds Required", "NGO Wallet", "Status", "Actions"];
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");
    const { data, isLoading, isError, error, refetch } = useAdminCampaigns(
        { perPage: 100 },
        { enabled: initialized && role === "admin" }
    );
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

    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    const filterOptions = [
        { id: "all", label: "All Campaigns" },
        { id: "draft", label: "Pending Verification" },
        { id: "published", label: "Published" },
        { id: "completed", label: "Completed" },
        { id: "cancelled", label: "Cancelled" },
    ];

    const allCampaigns = data?.items || [];

    const filteredCampaigns = allCampaigns.filter((item) => {
        // Status filter
        const matchesStatus = filter === "all" || String(item?.status || "").toLowerCase() === filter;
        
        // NGO Search filter
        const ngoName = (item.ngo?.profile?.organizationName || item.ngo?.profile?.name || "").toLowerCase();
        const matchesSearch = !searchTerm || ngoName.includes(searchTerm.toLowerCase());
        
        return matchesStatus && matchesSearch;
    });

    const rows = filteredCampaigns.map((item) => {
        const hasWallet = !!item.ngoWalletAddress;

        // Calculate goal in ETH using same logic as Donor explore
        const goalEth = item.fundingGoalETH || (Number(item.fundingGoalINR || item.fundingGoal || 0) / 250000);

        return [
            <span className="font-bold text-slate-800">{item.title}</span>,
            <span className="text-slate-600 font-medium">{item.ngo?.profile?.organizationName || item.ngo?.profile?.name || "Unknown NGO"}</span>,
            <span className="font-semibold text-slate-600">{Number(goalEth || 0).toFixed(4)} ETH</span>,
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
                type={item.status === "published" ? "success" : item.status === "cancelled" ? "danger" : item.status === "completed" ? "indigo" : "warning"}
            />,
            <div className="flex gap-2">
                <Button
                    type="success"
                    className="!px-3 !py-1.5 text-xs shadow-sm shadow-emerald-600/20"
                    disabled={item.status === "published" || item.status === "completed" || verifyMutation.isPending || rejectMutation.isPending}
                    onClick={() => handleVerify(item)}
                >
                    <Check size={14} /> Verify
                </Button>
                <Button
                    type="danger"
                    className="!px-3 !py-1.5 text-xs shadow-sm shadow-red-600/20"
                    disabled={item.status === "cancelled" || item.status === "completed" || verifyMutation.isPending || rejectMutation.isPending}
                    onClick={() => handleReject(item)}
                >
                    <X size={14} /> Reject
                </Button>
            </div>,
        ];
    });

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-6 pb-6 border-b border-slate-200">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <Activity className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Campaign Monitoring
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Track active campaigns and monitor funding progress in real-time.</p>
            </div>

            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide md:pb-0 md:flex-wrap flex-1">
                    {filterOptions.map((opt) => {
                        const count = opt.id === "all"
                            ? allCampaigns.length
                            : allCampaigns.filter(c => String(c?.status || "").toLowerCase() === opt.id).length;

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

                <div className="relative w-full md:w-72 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by NGO Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all placeholder:text-slate-400"
                    />
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
                    </div>
                )}

                {isLoading ? (
                    <div className="p-16 text-center text-slate-500 font-medium animate-pulse">Loading campaigns...</div>
                ) : isError ? (
                    <div className="p-16 text-center">
                        <p className="text-red-700 font-bold bg-red-50 px-4 py-3 rounded-xl border border-red-100 inline-block">{error?.message || "Failed to load campaigns"}</p>
                        <br />
                        <button onClick={() => refetch()} className="mt-4 text-sm font-semibold underline text-red-700 hover:text-red-800">Retry Connection</button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
                        <Activity size={48} className="text-slate-300" strokeWidth={1} />
                        <p className="font-medium">No {filter !== "all" ? filter.replace("_", " ") : ""} campaigns found.</p>
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

export default CampaignMonitoring;