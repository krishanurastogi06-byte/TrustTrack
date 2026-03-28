import { useParams, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { ArrowLeft, CheckCircle2, CircleDashed, FileCheck } from "lucide-react";
import { useCampaign, useCampaignMilestones } from "../../hooks/useCampaigns";
import DonateWithWallet from "../../components/ui/DonateWithWallet";
import donationAbi from "../../lib/contracts/donationAbi.json";

function CampaignDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isLoading, isError, error, refetch } = useCampaign(id);
    const {
        data: milestonesData,
        isLoading: milestonesLoading,
        isError: milestonesIsError,
        error: milestonesError,
        refetch: refetchMilestones,
    } = useCampaignMilestones(id);

    const campaign = data?.campaign;
    const milestones = milestonesData?.items || [];

    if (isLoading) {
        return <div className="max-w-5xl mx-auto w-full py-10 text-center text-slate-500">Loading campaign...</div>;
    }

    if (isError || !campaign) {
        const isNotFound = error?.status === 404;
        return (
            <div className="max-w-5xl mx-auto w-full py-10 text-center">
                <p className="text-red-700 font-semibold">{isNotFound ? "Campaign not found." : (error?.message || "Failed to load campaign")}</p>
                {!isNotFound && (
                    <button onClick={() => refetch()} className="mt-3 mr-4 text-sm font-semibold underline text-red-700">Retry</button>
                )}
                <button onClick={() => navigate(-1)} className="mt-3 text-sm font-semibold underline text-red-700">Go back</button>
            </div>
        );
    }

    const contractAddress = import.meta.env.VITE_DONATION_CONTRACT;
    const coverImage = campaign.coverImage || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1200";

    return (
        <div className="max-w-5xl mx-auto w-full">
            <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold mb-6 transition-colors"
            >
                <ArrowLeft size={18} />
                Back to Explore
            </button>

            <Card className="p-0 overflow-hidden mb-8 border-none shadow-[0_8px_30px_-4px_rgba(0,0,0,0.05)]">
                {/* Hero Image */}
                <div className="h-64 sm:h-80 md:h-96 relative w-full">
                    <img 
                        src={coverImage}
                        alt="Campaign Hero" 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full">
                        <Badge label={campaign.category || "General"} className="bg-white/20 text-white backdrop-blur-md mb-4" />
                        <h1 className="text-3xl md:text-4xl text-white font-extrabold tracking-tight">{campaign.title}</h1>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row">
                    {/* Main Content */}
                    <div className="p-6 md:p-10 flex-1 border-r border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">About the Campaign</h2>
                        <p className="text-slate-600 leading-relaxed mb-8">
                            {campaign.description}
                        </p>

                        <h3 className="font-bold text-slate-800 mb-4 text-lg">Project Milestones</h3>
                        <div className="space-y-4 mb-8">
                            {milestonesLoading ? (
                                <div className="text-sm text-slate-500">Loading milestones...</div>
                            ) : milestonesIsError ? (
                                <div className="text-sm text-red-700">
                                    {milestonesError?.message || "Failed to load milestones."}
                                    <button onClick={() => refetchMilestones()} className="ml-2 underline font-semibold">Retry</button>
                                </div>
                            ) : milestones.length ? (
                                milestones.map((m) => (
                                    <div key={m._id} className={`flex items-start gap-3 p-4 rounded-2xl border ${m.status === "released" || m.status === "verified" ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
                                        {m.status === "released" || m.status === "verified" ? (
                                            <CheckCircle2 className="text-emerald-600 mt-0.5" size={20} />
                                        ) : (
                                            <CircleDashed className="text-slate-400 mt-0.5" size={20} />
                                        )}
                                        <div>
                                            <p className="font-bold text-slate-800">{m.title}</p>
                                            <p className="text-sm text-slate-500 mt-1 capitalize">{m.status}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-slate-500">No milestones available yet.</div>
                            )}
                        </div>

                        <h3 className="font-bold text-slate-800 mb-4 text-lg">Verification Proofs</h3>
                        <div className="inline-flex items-center gap-2 p-4 w-full bg-slate-50 border border-slate-100 rounded-2xl group">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl group-hover:bg-indigo-200 transition-colors">
                                <FileCheck size={20} />
                            </div>
                            <span className="font-bold text-slate-700">Proofs are available after NGO submission and admin verification.</span>
                        </div>
                    </div>

                    {/* Sidebar action */}
                    <div className="w-full md:w-80 p-6 md:p-10 bg-slate-50">
                        <div className="mb-6">
                            <p className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-2">Funds Raised</p>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-4xl font-extrabold text-slate-800 tracking-tight">₹0</span>
                                <span className="text-slate-500 font-medium tracking-tight">/ ₹{Number(campaign.fundingGoal || 0).toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '0%' }}></div>
                            </div>
                            <p className="text-sm font-semibold text-slate-600">0% funded</p>
                        </div>

                        <div className="space-y-4">
                            <DonateWithWallet contractAddress={contractAddress} abi={donationAbi} campaignId={campaign._id} />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default CampaignDetails;