import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FolderKanban, ShieldCheck, Link as LinkIcon } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useAdminNgoCampaigns } from "../../hooks/useAdminNgos";

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

function NgoCampaignDetails() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { data, isLoading, isError, error, refetch } = useAdminNgoCampaigns(id);

    const campaigns = data?.items || [];
    const ngo = data?.ngo || null;

    const summary = useMemo(() => {
        const totalProofs = campaigns.reduce((sum, campaign) => sum + (campaign?.verifiedProofCount || 0), 0);
        return {
            totalCampaigns: campaigns.length,
            totalProofs,
        };
    }, [campaigns]);

    return (
        <div className="max-w-7xl mx-auto w-full space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                        <FolderKanban className="text-indigo-600" size={32} strokeWidth={2.5} />
                        NGO Campaign Details
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        {ngo?.profile?.organizationName || ngo?.profile?.name || ngo?.email || "NGO"} - Campaigns with verified proofs
                    </p>
                </div>
                <Button type="secondary" className="!px-4 !py-2" onClick={() => navigate("/admin/verified-ngos")}>
                    <ArrowLeft size={16} /> Back
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <p className="text-sm text-slate-500">Total Campaigns</p>
                    <p className="text-2xl font-extrabold text-slate-800 mt-2">{summary.totalCampaigns}</p>
                </Card>
                <Card>
                    <p className="text-sm text-slate-500">Verified Proofs</p>
                    <p className="text-2xl font-extrabold text-emerald-700 mt-2">{summary.totalProofs}</p>
                </Card>
            </div>

            {isLoading ? (
                <Card><div className="p-2 text-slate-500">Loading NGO campaigns...</div></Card>
            ) : isError ? (
                <Card>
                    <div className="space-y-2">
                        <p className="text-red-700 font-semibold">{error?.message || "Failed to load NGO campaign details"}</p>
                        <button className="text-sm underline text-red-700" onClick={() => refetch()}>Retry</button>
                    </div>
                </Card>
            ) : campaigns.length === 0 ? (
                <Card>
                    <p className="text-slate-500">No campaigns found for this NGO.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {campaigns.map((campaign) => {
                        const raised = Number(campaign.raisedETH || 0);
                        const goal = Number(campaign.fundingGoalETH || (Number(campaign.fundingGoalINR || campaign.fundingGoal || 0) / 250000));
                        const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
                        const pending = Math.max(0, goal - raised);
                        const image = campaign.coverImage || "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800";

                        return (
                            <Card key={campaign._id} className="space-y-5">
                                {/* Banner Image & Status */}
                                <div className="h-44 rounded-xl bg-slate-200 relative overflow-hidden -mx-2 -mt-2">
                                    <img 
                                        src={image} 
                                        alt={campaign.title} 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-3 right-3 shadow-sm rounded-full overflow-hidden">
                                        <Badge
                                            label={campaign.status || "draft"}
                                            type={campaign.status === "published" ? "success" : campaign.status === "completed" ? "indigo" : "warning"}
                                        />
                                    </div>
                                </div>

                                {/* Title & Description */}
                                <div className="px-1">
                                    <h2 className="text-xl font-bold text-slate-800">{campaign.title}</h2>
                                    <p className="text-sm text-slate-500 mt-2 line-clamp-3 leading-relaxed">{campaign.summary || campaign.description || "No description provided."}</p>
                                </div>

                                {/* Funding Stats */}
                                <div className="px-1">
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                        <div className="flex justify-between items-end mb-3">
                                            <div>
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Funding Goals</p>
                                                <p className="font-extrabold text-indigo-700 mt-1 text-lg">{raised.toFixed(4)} ETH <span className="text-sm font-semibold text-slate-500">Raised</span></p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-800">{goal.toFixed(4)} ETH Total</p>
                                                <p className="text-xs font-bold text-red-500 mt-0.5">{pending.toFixed(4)} ETH Pending</p>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                                            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Verified Proofs List */}
                                <div className="px-1">
                                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <ShieldCheck size={18} className="text-emerald-600" /> 
                                            Verified Proofs <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-bold">{campaign.verifiedProofCount || 0}</span>
                                        </h3>
                                    </div>

                                    {!campaign.verifiedProofs?.length ? (
                                        <div className="text-sm text-slate-500 mt-2 bg-slate-50 p-5 rounded-xl text-center border border-dashed border-slate-200 font-medium">No verified proofs for this campaign yet.</div>
                                    ) : (
                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                            {campaign.verifiedProofs.map((proof) => {
                                                const proofUrl = proofUrlFromCid(proof.cid);
                                                return (
                                                    <div key={proof._id} className="border border-emerald-200 rounded-xl px-4 py-3 bg-[#f4fdf8]">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 line-clamp-1">{proof.filename || "Proof file"}</p>
                                                                <p className="text-xs text-slate-500 mt-1 font-semibold text-emerald-800/80">Milestone: {proof.milestoneTitle || "Untitled milestone"}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge label="Verified" type="success" />
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-emerald-200/60">
                                                            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                                                                <span>✦</span> Funds Released
                                                            </span>
                                                            {proofUrl ? (
                                                                <a
                                                                    href={proofUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 border border-indigo-200 shadow-sm bg-white px-3 py-1.5 rounded-lg transition-colors hover:bg-slate-50"
                                                                >
                                                                    <LinkIcon size={14} /> View Document
                                                                </a>
                                                            ) : (
                                                                <span className="text-xs font-medium text-slate-400">No link</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default NgoCampaignDetails;
