import { useParams, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { ArrowLeft, CheckCircle2, CircleDashed, FileCheck, ExternalLink, Info } from "lucide-react";
import { useCampaign, useCampaignMilestones } from "../../hooks/useCampaigns";
import DonateWithWallet from "../../components/ui/DonateWithWallet";
import donationAbi from "../../lib/contracts/donationAbi.json";

const INR_PER_ETH = 250000;

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

    const contractAddress = data?.contractAddress || import.meta.env.VITE_DONATION_CONTRACT;
    const coverImage = campaign.coverImage || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1200";
    const fundingGoalEth = Number(campaign.fundingGoalETH || (Number(campaign.fundingGoalINR || campaign.fundingGoal || 0) / INR_PER_ETH));
    const raisedEth = Number(campaign.raisedETH || 0);
    const remainingEth = Math.max(0, fundingGoalEth - raisedEth);
    const fundedPercentage = fundingGoalEth > 0 ? Math.min((raisedEth / fundingGoalEth) * 100, 100) : 0;

    const verifiedProofs = milestones.flatMap((m) =>
        (m.proofs || [])
            .filter((p) => p.status === "verified")
            .map((p) => ({ ...p, milestoneTitle: m.title }))
    );

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
                                    <div key={m._id} className={`flex items-center justify-between gap-3 p-4 rounded-2xl border ${m.status === "released" || m.status === "verified" ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
                                        <div className="flex items-start gap-3">
                                            {m.status === "released" || m.status === "verified" ? (
                                                <CheckCircle2 className="text-emerald-600 mt-0.5 flex-shrink-0" size={20} />
                                            ) : (
                                                <CircleDashed className="text-slate-400 mt-0.5 flex-shrink-0" size={20} />
                                            )}
                                            <div>
                                                <p className="font-bold text-slate-800">{m.title}</p>
                                                <p className="text-sm text-slate-500 mt-0.5 capitalize">{m.status}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-extrabold text-slate-800">{(m.milestoneAmountETH ?? m.amount ?? 0).toFixed(4)} ETH</p>
                                            {m.milestoneAmountINR && (
                                                <p className="text-xs font-semibold text-slate-500 mt-0.5">₹{Number(m.milestoneAmountINR).toLocaleString('en-IN')}</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-slate-500">No milestones available yet.</div>
                            )}
                        </div>

                        <h3 className="font-bold text-slate-800 mb-4 text-lg">Verification Proofs</h3>
                        {verifiedProofs.length ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {verifiedProofs.map((p) => {
                                    const fileUrl = proofUrlFromCid(p.cid);
                                    return (
                                        <div key={p._id} className="flex flex-col justify-between p-5 bg-white border border-slate-100 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group">
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                                        <FileCheck size={18} />
                                                    </div>
                                                    <Badge label="Verified Proof" className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wide" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Milestone</p>
                                                <p className="font-bold text-slate-800 text-sm mb-2">{p.milestoneTitle}</p>
                                                {p.remarks && (
                                                    <>
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-3">Remarks</p>
                                                        <p className="text-sm text-slate-600 italic mt-0.5 mb-4">"{p.remarks}"</p>
                                                    </>
                                                )}
                                            </div>
                                            {fileUrl && (
                                                <a
                                                    href={fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-bold transition-all"
                                                >
                                                    View Document
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-start gap-3 p-4 w-full bg-slate-50/50 border border-slate-100 rounded-2xl">
                                <Info className="text-slate-400 mt-0.5 flex-shrink-0" size={18} />
                                <div>
                                    <p className="font-semibold text-slate-600 text-sm">No proofs verified yet</p>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                        Verification proofs will become available here for donors to view once they are uploaded by the NGO and approved by the platform administrators.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar action */}
                    <div className="w-full md:w-80 p-6 md:p-10 bg-slate-50">
                        <div className="mb-6">
                            <p className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-2">Funds Raised</p>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-4xl font-extrabold text-slate-800 tracking-tight">{raisedEth.toFixed(4)} ETH</span>
                                <span className="text-slate-500 font-medium tracking-tight">/ {fundingGoalEth.toFixed(4)} ETH</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${fundedPercentage}%` }}></div>
                            </div>
                            <p className="text-sm font-semibold text-slate-600">{fundedPercentage.toFixed(2)}% funded</p>
                        </div>

                        <div className="space-y-4">
                            <DonateWithWallet
                                contractAddress={contractAddress}
                                abi={donationAbi}
                                campaignId={campaign._id}
                                contractCampaignId={campaign.contractCampaignId}
                                remainingEth={remainingEth}
                                onDonationConfirmed={() => refetch()}
                            />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default CampaignDetails;