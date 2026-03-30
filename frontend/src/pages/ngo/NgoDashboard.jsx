import Card from "../../components/ui/Card";
import { LayoutDashboard, Wallet, Megaphone, Inbox, DollarSign, FileCheck } from "lucide-react";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useAuthStore } from "../../store/useAuthStore";
import { useState, useEffect } from "react";
import ngoService from "../../services/ngoService";
import { useNavigate } from "react-router-dom";

function NgoDashboard() {
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();
    const { data: campaignsData, isLoading } = useCampaigns({ ngoId: user?._id, perPage: 200 }, { enabled: !!user?._id });
    const campaigns = campaignsData?.items || [];
    const active = campaigns.filter((c) => c.status === "published").length;
    const totalGoalEth = campaigns.reduce((sum, c) => sum + Number(c.fundingGoalETH || 0), 0);

    const [fundsSummary, setFundsSummary] = useState(null);
    const [fundsSummaryLoading, setFundsSummaryLoading] = useState(true);

    const formatEth = (value) => {
        const amount = Number(value || 0);
        if (!Number.isFinite(amount)) return "0.0000 ETH";
        return `${amount.toFixed(4)} ETH`;
    };

    useEffect(() => {
        const fetchFundsSummary = async () => {
            try {
                setFundsSummaryLoading(true);
                const summary = await ngoService.getFundsSummary();
                setFundsSummary(summary);
            } catch (error) {
                console.error('Failed to fetch funds summary:', error);
            } finally {
                setFundsSummaryLoading(false);
            }
        };

        if (user?._id) {
            fetchFundsSummary();
            const intervalId = setInterval(fetchFundsSummary, 15000);
            return () => clearInterval(intervalId);
        }
    }, [user?._id]);

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <LayoutDashboard className="text-indigo-600" size={32} strokeWidth={2.5} />
                    NGO Overview
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Manage your active campaigns and monitor funding.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Received Funds Card */}
                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <DollarSign size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total Received Funds</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">
                        {fundsSummaryLoading ? "..." : formatEth(fundsSummary?.totalReceivedEth)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Released by admin</p>
                    <div className="absolute -bottom-4 -right-4 text-emerald-50/50 group-hover:scale-110 transition-transform duration-500">
                        <DollarSign size={120} />
                    </div>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Wallet size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total Possible Funds</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">
                        {isLoading || fundsSummaryLoading
                            ? "..."
                            : formatEth(fundsSummary?.totalPossibleEth ?? totalGoalEth)}
                    </p>
                    <div className="absolute -bottom-4 -right-4 text-emerald-50/50 group-hover:scale-110 transition-transform duration-500">
                        <Wallet size={120} />
                    </div>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(79,70,229,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Megaphone size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Active Campaigns</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">{isLoading ? "..." : active}</p>
                    <div className="absolute -bottom-4 -right-4 text-indigo-50/50 group-hover:scale-110 transition-transform duration-500">
                        <Megaphone size={120} />
                    </div>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                            <Inbox size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Pending Requests</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">{isLoading ? "..." : campaigns.filter((c) => c.status === "draft").length}</p>
                    <div className="absolute -bottom-4 -right-4 text-amber-50/50 group-hover:scale-110 transition-transform duration-500">
                        <Inbox size={120} />
                    </div>
                </Card>
            </div>

            {/* Campaign Breakdown */}
            {!fundsSummaryLoading && fundsSummary?.campaign_milestones && fundsSummary.campaign_milestones.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-2xl font-extrabold text-slate-800 mb-4">Campaign Breakdown</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {fundsSummary.campaign_milestones.map((campaign) => (
                            <Card key={campaign.campaignId} className="border-l-4 border-l-indigo-500">
                                <h3 className="font-semibold text-slate-800 mb-3">{campaign.title}</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">Received</p>
                                        <p className="text-lg font-semibold text-green-600">{formatEth(campaign.receivedEth)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">Pending</p>
                                        <p className="text-lg font-semibold text-amber-600">{formatEth(campaign.pendingEth)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">Milestones Total</p>
                                        <p className="text-lg font-semibold text-indigo-600">{formatEth(campaign.milestoneTotalEth)}</p>
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => navigate('/ngo/proof')}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors duration-200"
                                        >
                                            <FileCheck size={20} strokeWidth={2} />
                                            Proof Submission
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NgoDashboard;