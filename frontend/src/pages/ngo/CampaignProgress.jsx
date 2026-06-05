import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
    ArrowLeft, 
    Activity, 
    TrendingUp, 
    Wallet, 
    Lock, 
    Layers, 
    Globe, 
    ShieldCheck, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    XCircle,
    ExternalLink,
    DollarSign
} from "lucide-react";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useCampaign, useCampaignMilestones } from "../../hooks/useCampaigns";

const INR_PER_ETH = 250000;

function CampaignProgress() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { 
        data: campaignData, 
        isLoading: campaignLoading, 
        isError: campaignIsError, 
        error: campaignError,
        refetch: refetchCampaign
    } = useCampaign(id);

    const { 
        data: milestonesData, 
        isLoading: milestonesLoading,
        isError: milestonesIsError,
        error: milestonesError,
        refetch: refetchMilestones
    } = useCampaignMilestones(id);

    const campaign = campaignData?.campaign;
    const milestones = milestonesData?.items || [];
    const contractAddress = campaignData?.contractAddress || import.meta.env.VITE_DONATION_CONTRACT;

    if (campaignLoading || milestonesLoading) {
        return (
            <div className="max-w-7xl mx-auto w-full py-16 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-4"></div>
                <p className="text-slate-500 font-semibold">Loading campaign progress details...</p>
            </div>
        );
    }

    if (campaignIsError || !campaign) {
        return (
            <div className="max-w-3xl mx-auto w-full py-16 text-center px-4">
                <div className="bg-red-50 border border-red-200 rounded-3xl p-8 shadow-sm">
                    <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
                    <h2 className="text-xl font-bold text-red-800 mb-2">Failed to Load Campaign</h2>
                    <p className="text-red-600 mb-6 font-medium">
                        {campaignError?.message || "We couldn't retrieve this campaign's details. It may not exist or you don't have access."}
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Button type="secondary" onClick={() => navigate("/ngo/campaigns")}>
                            <ArrowLeft size={16} /> Back to Campaigns
                        </Button>
                        <Button type="primary" onClick={() => refetchCampaign()}>
                            Retry Connection
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Calculations
    const fundingGoalEth = Number(campaign.fundingGoalETH || 0);
    const raisedEth = Number(campaign.raisedETH || 0);
    const remainingEth = Math.max(0, fundingGoalEth - raisedEth);
    const fundedPercentage = fundingGoalEth > 0 ? Math.min((raisedEth / fundingGoalEth) * 100, 100) : 0;

    // Released funds calculation: Sum up milestone amounts that are marked as paid/released
    const releasedEth = milestones
        .filter((m) => m.isPaid || m.status === "released" || m.status === "completed")
        .reduce((sum, m) => sum + Number(m.amountETH || m.amount || 0), 0);

    // Locked funds: raisedEth - releasedEth
    const lockedEth = Math.max(0, raisedEth - releasedEth);

    const formatEth = (val) => `${Number(val || 0).toFixed(4)} ETH`;
    const formatInr = (val) => `₹${Math.round(Number(val || 0)).toLocaleString("en-IN")}`;

    // Campaign status mapping
    const getStatusLabel = (status) => {
        switch (status) {
            case "published": return "Published / Active";
            case "draft": return "Pending Verification";
            case "cancelled": return "Rejected";
            case "completed": return "Completed";
            default: return status;
        }
    };

    const getStatusBadgeType = (status) => {
        switch (status) {
            case "published": return "success";
            case "draft": return "warning";
            case "cancelled": return "danger";
            case "completed": return "indigo";
            default: return "default";
        }
    };

    // Milestone status mapping
    const getMilestoneStatusBadge = (m) => {
        const status = String(m.status || "pending").toLowerCase();
        if (m.isPaid) {
            return <Badge label="Funds Released" type="success" />;
        }
        switch (status) {
            case "pending": return <Badge label="Pending" type="default" />;
            case "submitted": return <Badge label="Submitted (Review)" type="warning" />;
            case "approved": return <Badge label="Approved (Release Ready)" type="indigo" />;
            case "rejected": return <Badge label="Rejected" type="danger" />;
            case "completed":
            case "verified":
            case "released": return <Badge label="Funds Released" type="success" />;
            default: return <Badge label={status} type="default" />;
        }
    };

    const coverImage = campaign.coverImage || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1200";

    return (
        <div className="max-w-7xl mx-auto w-full space-y-8 pb-12">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate("/ngo/campaigns")}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold mb-3 transition-colors"
                    >
                        <ArrowLeft size={16} /> Back to Campaigns
                    </button>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Campaign Progress Panel</h1>
                        <Badge label={getStatusLabel(campaign.status)} type={getStatusBadgeType(campaign.status)} />
                    </div>
                    <p className="text-slate-500 mt-2 font-medium">Detailed financial and milestone timeline monitoring.</p>
                </div>
            </div>

            {/* Campaign Details Hero Banner Card */}
            <Card className="p-0 overflow-hidden border border-slate-200/60 bg-white shadow-sm">
                {/* Hero Banner */}
                <div className="h-64 sm:h-80 relative w-full overflow-hidden">
                    <img 
                        src={coverImage} 
                        alt={campaign.title} 
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700 ease-out" 
                    />
                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent"></div>
                    
                    <div className="absolute bottom-0 left-0 p-6 sm:p-8 w-full flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div className="space-y-2 max-w-3xl">
                            <Badge 
                                label={campaign.category || "General"} 
                                className="bg-white/20 text-white border border-white/25 backdrop-blur-md font-bold px-3 py-1 rounded-full text-xs uppercase" 
                            />
                            <h2 className="text-2xl sm:text-3xl md:text-4xl text-white font-black tracking-tight leading-tight drop-shadow-sm">
                                {campaign.title}
                            </h2>
                        </div>
                        <div className="flex-shrink-0">
                            <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-3.5 py-1.5 rounded-full uppercase backdrop-blur-md">
                                ID: {campaign._id?.substring(0, 12)}...
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sub-content Section */}
                <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left 2/3: About the cause */}
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Globe className="text-indigo-600" size={20} />
                            About the Campaign
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                            {campaign.description || campaign.summary || "No description provided for this campaign."}
                        </p>
                    </div>

                    {/* Right 1/3: Campaign quick metadata details */}
                    <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-5 space-y-4">
                        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight border-b border-slate-200/50 pb-2">
                            Quick Info
                        </h3>
                        
                        <div className="space-y-3.5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Created On</p>
                                    <p className="text-xs font-bold text-slate-700">
                                        {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <Wallet size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">NGO Wallet Address</p>
                                    <p className="text-xs font-mono font-bold text-slate-700 truncate" title={campaign.ngoWalletAddress}>
                                        {campaign.ngoWalletAddress}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                    <Activity size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">System Status</p>
                                    <div className="mt-0.5">
                                        <Badge label={getStatusLabel(campaign.status)} type={getStatusBadgeType(campaign.status)} className="!px-2 !py-0.5 !text-[9px]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Target */}
                <Card className="relative overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Activity size={18} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Target Goal</h3>
                    <p className="text-xl font-black mt-1 text-slate-800 tracking-tight">{formatEth(fundingGoalEth)}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-1">{formatInr(fundingGoalEth * INR_PER_ETH)}</p>
                </Card>

                {/* 2. Raised */}
                <Card className="relative overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Total Raised</h3>
                    <p className="text-xl font-black mt-1 text-slate-800 tracking-tight">{formatEth(raisedEth)}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-1">{formatInr(raisedEth * INR_PER_ETH)}</p>
                </Card>

                {/* 3. Remaining */}
                <Card className="relative overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                            <Clock size={18} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Remaining to Raise</h3>
                    <p className="text-xl font-black mt-1 text-slate-800 tracking-tight">{formatEth(remainingEth)}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-1">{formatInr(remainingEth * INR_PER_ETH)}</p>
                </Card>

                {/* 4. Released */}
                <Card className="relative overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                            <Wallet size={18} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Released to NGO</h3>
                    <p className="text-xl font-black mt-1 text-slate-800 tracking-tight">{formatEth(releasedEth)}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-1">{formatInr(releasedEth * INR_PER_ETH)}</p>
                </Card>

                {/* 5. Locked */}
                <Card className="relative overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                            <Lock size={18} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Locked in Contract</h3>
                    <p className="text-xl font-black mt-1 text-slate-800 tracking-tight">{formatEth(lockedEth)}</p>
                    <p className="text-xs font-semibold text-slate-400 mt-1">{formatInr(lockedEth * INR_PER_ETH)}</p>
                </Card>
            </div>

            {/* Progress Bar Card */}
            <Card className="border border-slate-200/60 shadow-sm bg-white p-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-800">Funding Progress</h3>
                    <span className="text-sm font-extrabold text-indigo-600">{fundedPercentage.toFixed(2)}% Completed</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                    <div 
                        className="bg-indigo-600 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${fundedPercentage}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                    <span>Raised: {formatEth(raisedEth)}</span>
                    <span>Goal: {formatEth(fundingGoalEth)}</span>
                </div>
            </Card>

            {/* Main Content: Milestones & Metadata split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Milestones timeline */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                            <Layers className="text-indigo-600" size={22} />
                            Milestones Timeline
                        </h2>
                        {milestonesIsError && (
                            <button onClick={() => refetchMilestones()} className="text-xs font-bold text-red-600 underline hover:text-red-700">
                                Reload Milestones
                            </button>
                        )}
                    </div>

                    {milestones.length === 0 ? (
                        <Card className="border border-dashed border-slate-200 bg-white p-8 text-center">
                            <Layers className="mx-auto text-slate-300 mb-3" size={36} />
                            <p className="text-slate-500 font-medium">No milestones defined for this campaign.</p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {milestones.map((m, index) => {
                                const status = String(m.status || "pending").toLowerCase();
                                const isCompleted = m.isPaid || status === "released" || status === "completed";
                                
                                return (
                                    <div 
                                        key={m._id || m.id} 
                                        className={`flex gap-4 p-5 rounded-2xl border bg-white shadow-sm transition-all hover:shadow ${
                                            isCompleted 
                                                ? "border-emerald-100 bg-emerald-50/10" 
                                                : "border-slate-200/60"
                                        }`}
                                    >
                                        {/* Left order circle */}
                                        <div className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                                isCompleted 
                                                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20" 
                                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                            }`}>
                                                {m.order || index + 1}
                                            </div>
                                            <div className="w-0.5 flex-1 bg-slate-100 mt-2"></div>
                                        </div>

                                        {/* Milestone Body */}
                                        <div className="flex-1 space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div>
                                                    <h3 className="font-extrabold text-slate-800 text-base leading-snug">{m.title}</h3>
                                                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                                        Phase Amount: <span className="text-slate-700 font-bold">{formatEth(m.milestoneAmountETH || m.amountETH || m.amount)}</span> ({formatInr((m.milestoneAmountETH || m.amountETH || m.amount) * INR_PER_ETH)})
                                                    </p>
                                                </div>
                                                <div className="self-start sm:self-center">
                                                    {getMilestoneStatusBadge(m)}
                                                </div>
                                            </div>

                                            {m.description && (
                                                <p className="text-slate-600 text-sm leading-relaxed">{m.description}</p>
                                            )}

                                            {/* Action logic */}
                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                                                {/* Status hint text */}
                                                <span className="text-slate-500 font-semibold">
                                                    {status === "pending" && "Ready to submit milestone documents."}
                                                    {status === "submitted" && "Platform admin is reviewing the submitted proof."}
                                                    {status === "approved" && "Verification approved! Funds awaiting admin distribution."}
                                                    {status === "rejected" && "Proof was rejected. Please upload correct documentation."}
                                                    {isCompleted && "Milestone fully completed and funding disbursed."}
                                                </span>

                                                {/* Action buttons */}
                                                {(status === "pending" || status === "rejected") && (
                                                    <Button 
                                                        type="primary" 
                                                        className="!py-1.5 !px-3.5 !rounded-lg text-xs"
                                                        onClick={() => navigate("/ngo/proof", { 
                                                            state: { 
                                                                campaignId: campaign._id, 
                                                                milestoneId: m._id || m.id 
                                                            } 
                                                        })}
                                                    >
                                                        Submit Proof
                                                    </Button>
                                                )}

                                                {status === "submitted" && (
                                                    <span className="flex items-center gap-1.5 font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">
                                                        <Clock size={12} /> Under Review
                                                    </span>
                                                )}

                                                {status === "approved" && (
                                                    <span className="flex items-center gap-1.5 font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                                                        <Clock size={12} /> Awaiting Disbursal
                                                    </span>
                                                )}

                                                {isCompleted && (
                                                    <span className="flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                                                        <CheckCircle2 size={12} /> Disbursed
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar: Metadata */}
                <div className="space-y-6">
                    <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="text-indigo-600" size={22} />
                        Blockchain Details
                    </h2>

                    <Card className="border border-slate-200/60 shadow-sm bg-white p-5 space-y-4">
                        <div>
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Contract Address</p>
                            <div className="flex items-center justify-between gap-2 mt-1">
                                <span className="font-mono text-xs text-slate-600 truncate flex-1" title={contractAddress}>
                                    {contractAddress || "Not deployed"}
                                </span>
                                {contractAddress && (
                                    <a 
                                        href={`https://sepolia.etherscan.io/address/${contractAddress}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-indigo-600 hover:text-indigo-700 flex-shrink-0"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3">
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Contract Campaign ID</p>
                            <p className="font-mono text-sm font-bold text-slate-700 mt-1">
                                {campaign.contractCampaignId !== undefined && campaign.contractCampaignId !== null 
                                    ? campaign.contractCampaignId 
                                    : "Not Sync'd On-Chain"
                                }
                            </p>
                        </div>

                        <div className="border-t border-slate-100 pt-3">
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">NGO Beneficiary Wallet</p>
                            <div className="flex items-center justify-between gap-2 mt-1">
                                <span className="font-mono text-xs text-slate-600 truncate flex-1" title={campaign.ngoWalletAddress}>
                                    {campaign.ngoWalletAddress || "Not configured"}
                                </span>
                                {campaign.ngoWalletAddress && (
                                    <a 
                                        href={`https://sepolia.etherscan.io/address/${campaign.ngoWalletAddress}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-indigo-600 hover:text-indigo-700 flex-shrink-0"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default CampaignProgress;
