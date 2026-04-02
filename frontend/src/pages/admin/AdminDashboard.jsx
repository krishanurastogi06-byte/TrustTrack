import Card from "../../components/ui/Card";
import Grid from "../../components/ui/Grid";
import Badge from "../../components/ui/Badge";
import { LayoutDashboard, Target, Users, Coins, CheckSquare, Clock, ChevronRight } from "lucide-react";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useAdminProofs } from "../../hooks/useProofs";
import { useState, useEffect } from "react";
import adminFundsService from "../../services/adminFundsService";

function AdminDashboard() {
    const { data: campaignsData, isLoading: campaignsLoading } = useCampaigns({ perPage: 200 });
    const { data: proofsData, isLoading: proofsLoading } = useAdminProofs({ status: "pending" });

    const [contractBalance, setContractBalance] = useState(null);
    const [balanceLoading, setBalanceLoading] = useState(true);
    const [campaignFunds, setCampaignFunds] = useState([]);
    const [campaignFundsLoading, setCampaignFundsLoading] = useState(true);

    const campaigns = campaignsData?.items || [];
    const proofs = proofsData?.data || [];

    const activeCampaigns = campaigns.filter((c) => c.status === "published").length;

    const onchainBalanceEth = Number(contractBalance?.balanceEth || 0);

    function formatEthBalance(value) {
        const amount = Number(value || 0);
        if (!Number.isFinite(amount)) return "0.0000";
        if (amount === 0) return "0.0000";
        if (amount < 0.0001) return amount.toFixed(8);
        if (amount < 1) return amount.toFixed(4);
        return amount.toFixed(2);
    }

    useEffect(() => {
        const fetchContractBalance = async () => {
            try {
                setBalanceLoading(true);
                const balance = await adminFundsService.getContractBalance();
                setContractBalance(balance);
            } catch (error) {
                console.error('Failed to fetch contract balance:', error);
            } finally {
                setBalanceLoading(false);
            }
        };

        fetchContractBalance();
        // Refresh balance every 10 seconds
        const interval = setInterval(fetchContractBalance, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchCampaignFunds = async () => {
            try {
                setCampaignFundsLoading(true);
                const funds = await adminFundsService.getCampaignFunds();
                setCampaignFunds(funds);
            } catch (error) {
                console.error('Failed to fetch campaign funds:', error);
            } finally {
                setCampaignFundsLoading(false);
            }
        };

        fetchCampaignFunds();
    }, []);

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <LayoutDashboard className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Admin Overview
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Welcome back. Here is what's happening today.</p>
            </div>

            <Grid>
                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(79,70,229,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Target size={24} strokeWidth={2.5} />
                        </div>
                        <Badge label="Active" type="success" />
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total Campaigns</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">{campaignsLoading ? "..." : campaigns.length}</p>
                    <div className="absolute -bottom-4 -right-4 text-indigo-50/50 group-hover:scale-110 transition-transform duration-500">
                        <Target size={120} />
                    </div>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                            <Users size={24} strokeWidth={2.5} />
                        </div>
                        <Badge label="Urgent" type="warning" />
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Pending Approvals</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">{proofsLoading ? "..." : proofs.length}</p>
                    <div className="absolute -bottom-4 -right-4 text-amber-50/50 group-hover:scale-110 transition-transform duration-500">
                        <Users size={120} />
                    </div>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Coins size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Smart Contract Balance</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">
                        {balanceLoading ? "..." : `${formatEthBalance(onchainBalanceEth)} ETH`}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                        Real blockchain balance
                    </p>
                    <div className="absolute -bottom-4 -right-4 text-emerald-50/50 group-hover:scale-110 transition-transform duration-500">
                        <Coins size={120} />
                    </div>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(14,165,233,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-sky-50 text-sky-500 rounded-2xl">
                            <CheckSquare size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Active Campaigns</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">{campaignsLoading ? "..." : activeCampaigns}</p>
                    <div className="absolute -bottom-4 -right-4 text-sky-50/50 group-hover:scale-110 transition-transform duration-500">
                        <CheckSquare size={120} />
                    </div>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(244,63,94,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
                            <Clock size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Pending Proofs</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">{proofsLoading ? "..." : proofs.length}</p>
                    <div className="absolute -bottom-4 -right-4 text-rose-50/50 group-hover:scale-110 transition-transform duration-500">
                        <Clock size={120} />
                    </div>
                </Card>
            </Grid>

            {/* Campaign Funds Breakdown */}
            {!campaignFundsLoading && campaignFunds.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-2xl font-extrabold text-slate-800 mb-4">Campaign Funding Details</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {campaignFunds.slice(0, 5).map((campaign) => (
                            <Card key={campaign.campaignId} className="border-l-4 border-l-indigo-500">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-semibold text-slate-800">{campaign.title}</h3>
                                        <p className="text-sm text-slate-500">
                                            NGO: {campaign.ngo?.profile?.organizationName || campaign.ngo?.email || 'Unknown'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-indigo-600">
                                            {typeof campaign.contractBalanceEth === 'string' && campaign.contractBalanceEth !== 'N/A'
                                                ? formatEthBalance(campaign.contractBalanceEth)
                                                : campaign.contractBalanceEth} ETH
                                        </p>
                                        <p className="text-xs text-slate-500">Locked in Contract</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-200">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">Funds Goal</p>
                                        <p className="text-lg font-semibold text-slate-800">{formatEthBalance(campaign.fundingGoalEth)} ETH</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">Pending</p>
                                        <p className="text-lg font-semibold text-amber-600">{formatEthBalance(campaign.pendingEth)} ETH</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider">Released</p>
                                        <p className="text-lg font-semibold text-green-600">{formatEthBalance(campaign.releasedFundsEth)} ETH</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                    {campaignFunds.length > 5 && (
                        <p className="text-center text-slate-500 mt-4 text-sm">
                            Showing 5 of {campaignFunds.length} campaigns
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;