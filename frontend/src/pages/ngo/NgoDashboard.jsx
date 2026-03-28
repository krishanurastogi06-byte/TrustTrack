import Card from "../../components/ui/Card";
import Grid from "../../components/ui/Grid";
import { LayoutDashboard, Wallet, Megaphone, Inbox, Edit2, AlertCircle, CheckCircle2, DollarSign, Lock } from "lucide-react";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useAuthStore } from "../../store/useAuthStore";
import { useCampaignMilestones } from "../../hooks/useCampaigns";
import { useState, useEffect } from "react";
import WalletAddressModal from "../../components/ui/WalletAddressModal";
import ngoService from "../../services/ngoService";

function NgoDashboard() {
    const user = useAuthStore((state) => state.user);
    const { data: campaignsData, isLoading } = useCampaigns({ ngoId: user?._id, perPage: 200 }, { enabled: !!user?._id });
    const campaigns = campaignsData?.items || [];
    const active = campaigns.filter((c) => c.status === "published").length;
    const totalGoal = campaigns.reduce((sum, c) => sum + Number(c.fundingGoal || 0), 0);
    
    const [walletData, setWalletData] = useState(null);
    const [walletLoading, setWalletLoading] = useState(true);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [fundsSummary, setFundsSummary] = useState(null);
    const [fundsSummaryLoading, setFundsSummaryLoading] = useState(true);

    useEffect(() => {
        const fetchWallet = async () => {
            try {
                setWalletLoading(true);
                const profile = await ngoService.getProfile();
                setWalletData(profile);
            } catch (error) {
                console.error('Failed to fetch NGO profile:', error);
            } finally {
                setWalletLoading(false);
            }
        };

        if (user?._id) {
            fetchWallet();
        }
    }, [user?._id]);

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
        }
    }, [user?._id]);

    const handleWalletUpdate = (updatedProfile) => {
        setWalletData(updatedProfile);
    };

    const hasWallet = !!walletData?.walletAddress;

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <LayoutDashboard className="text-indigo-600" size={32} strokeWidth={2.5} />
                    NGO Overview
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Manage your active campaigns and monitor funding.</p>
            </div>

            {/* Wallet Status Alert */}
            {!walletLoading && (
                <div className="mb-6">
                    <Card className={`border-l-4 ${hasWallet ? 'border-l-green-500 bg-green-50' : 'border-l-amber-500 bg-amber-50'}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                {hasWallet ? (
                                    <>
                                        <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <h3 className="font-semibold text-green-900">Wallet Configured</h3>
                                            <p className="text-sm text-green-800 mt-1">
                                                Funds will be transferred to: <span className="font-mono font-semibold">{walletData.walletAddress}</span>
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <h3 className="font-semibold text-amber-900">Wallet Not Configured</h3>
                                            <p className="text-sm text-amber-800 mt-1">
                                                You must add a wallet address before creating campaigns or receiving funds.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={() => setShowWalletModal(true)}
                                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
                                    hasWallet
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                }`}
                            >
                                <Edit2 size={16} />
                                {hasWallet ? 'Update' : 'Add'} Wallet
                            </button>
                        </div>
                    </Card>
                </div>
            )}

            <Grid>
                {/* Received Funds Card */}
                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <DollarSign size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total Received Funds</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">
                        {fundsSummaryLoading ? "..." : `₹${(fundsSummary?.totalReceivedEth || 0).toLocaleString()}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Released by admin</p>
                    <div className="absolute -bottom-4 -right-4 text-emerald-50/50 group-hover:scale-110 transition-transform duration-500">
                        <DollarSign size={120} />
                    </div>
                </Card>

                {/* Pending Funds Card */}
                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                            <Lock size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Pending (Locked) Funds</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">
                        {fundsSummaryLoading ? "..." : `₹${(fundsSummary?.totalPendingEth || 0).toLocaleString()}`}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Awaiting admin release</p>
                    <div className="absolute -bottom-4 -right-4 text-amber-50/50 group-hover:scale-110 transition-transform duration-500">
                        <Lock size={120} />
                    </div>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Wallet size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total Possible Funds</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">{isLoading ? "..." : `₹${totalGoal.toLocaleString()}`}</p>
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
            </Grid>

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
                                        <p className="text-lg font-semibold text-green-600">₹{campaign.receivedEth.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">Pending</p>
                                        <p className="text-lg font-semibold text-amber-600">₹{campaign.pendingEth.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">Milestones</p>
                                        <p className="text-lg font-semibold text-indigo-600">{campaign.milestones.length}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Wallet Address Modal */}
            <WalletAddressModal
                isOpen={showWalletModal}
                onClose={() => setShowWalletModal(false)}
                currentAddress={walletData?.walletAddress}
                onSuccess={handleWalletUpdate}
            />
        </div>
    );
}

export default NgoDashboard;