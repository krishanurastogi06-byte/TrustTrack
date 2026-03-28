import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FolderKanban, ShieldCheck, Link as LinkIcon } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useAdminNgoCampaigns } from "../../hooks/useAdminNgos";

function proofUrlFromCid(cid) {
    if (!cid) return null;
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
                    {campaigns.map((campaign) => (
                        <Card key={campaign._id} className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">{campaign.title}</h2>
                                    <p className="text-sm text-slate-500 mt-1">{campaign.summary || campaign.description || "No description"}</p>
                                </div>
                                <Badge
                                    label={campaign.status || "draft"}
                                    type={campaign.status === "published" ? "success" : campaign.status === "completed" ? "indigo" : "warning"}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-slate-50 rounded-lg p-3">
                                    <p className="text-slate-500">Funding Goal</p>
                                    <p className="font-bold text-slate-800 mt-1">{Number(campaign.fundingGoal || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3">
                                    <p className="text-slate-500">Verified Proofs</p>
                                    <p className="font-bold text-emerald-700 mt-1">{campaign.verifiedProofCount || 0}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-emerald-600" /> Verified Proofs
                                </h3>

                                {!campaign.verifiedProofs?.length ? (
                                    <p className="text-sm text-slate-500 mt-2">No verified proofs for this campaign yet.</p>
                                ) : (
                                    <div className="mt-3 space-y-2 max-h-56 overflow-auto pr-1">
                                        {campaign.verifiedProofs.map((proof) => {
                                            const proofUrl = proofUrlFromCid(proof.cid);
                                            return (
                                                <div key={proof._id} className="border border-slate-100 rounded-lg px-3 py-2 bg-white">
                                                    <p className="text-sm font-semibold text-slate-800">{proof.filename || "Proof file"}</p>
                                                    <p className="text-xs text-slate-500 mt-1">Milestone: {proof.milestoneTitle || "Untitled milestone"}</p>
                                                    <div className="mt-2 flex items-center justify-between gap-3">
                                                        <span className="text-xs text-slate-400">{new Date(proof.createdAt).toLocaleString()}</span>
                                                        {proofUrl ? (
                                                            <a
                                                                href={proofUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                                                            >
                                                                <LinkIcon size={13} /> View
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">No link</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default NgoCampaignDetails;
