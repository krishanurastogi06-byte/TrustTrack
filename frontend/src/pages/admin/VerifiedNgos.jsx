import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Trash2, ExternalLink, Mail, Calendar } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useDeleteNgo, useVerifiedNgos } from "../../hooks/useAdminNgos";

function VerifiedNgos() {
    const navigate = useNavigate();
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");

    const { data, isLoading, isError, error, refetch } = useVerifiedNgos({ perPage: 100 });

    const removeNgoMutation = useDeleteNgo({
        onSuccess: () => {
            setActionError("");
            setActionSuccess("NGO removed successfully.");
        },
        onError: (err) => {
            setActionSuccess("");
            setActionError(err?.message || "Failed to remove NGO");
        },
    });

    const ngos = data?.items || [];

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <BadgeCheck className="text-emerald-600" size={32} strokeWidth={2.5} />
                    Verified NGOs
                </h1>
                <p className="text-slate-500 mt-2 font-medium">View verified NGOs, open NGO details, or remove NGO accounts.</p>
            </div>

            {actionError && (
                <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 shadow-sm">
                    {actionError}
                </div>
            )}

            {actionSuccess && (
                <div className="mb-6 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 shadow-sm">
                    {actionSuccess}
                </div>
            )}

            {isLoading ? (
                <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">Loading verified NGOs...</div>
            ) : isError ? (
                <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100">
                    <p className="text-red-700 font-semibold">{error?.message || "Failed to load verified NGOs"}</p>
                    <button onClick={() => refetch()} className="mt-2 text-sm underline text-red-700 font-semibold">Retry</button>
                </div>
            ) : ngos.length === 0 ? (
                <div className="p-12 pl-12 pr-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.02)]">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                        <BadgeCheck size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No verified NGOs</h3>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto">There are currently no verified NGOs in the system. When an NGO registers and is approved, it will appear here.</p>
                </div>
            ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {ngos.map((ngo) => {
                        const ngoName = ngo?.profile?.organizationName || ngo?.profile?.name || "Unnamed NGO";
                        const removingCurrentNgo = removeNgoMutation.isPending && removeNgoMutation.variables === ngo._id;
                        const initial = ngoName.charAt(0).toUpperCase();

                        return (
                            <Card key={ngo._id} className="p-6 flex flex-col hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl shadow-sm">
                                            {initial}
                                        </div>
                                    </div>
                                    <Badge label="Verified" type="success" />
                                </div>
                                
                                <h3 className="text-lg font-bold text-slate-800 line-clamp-1 mb-3" title={ngoName}>
                                    {ngoName}
                                </h3>
                                
                                <div className="flex flex-col gap-3 text-sm font-medium text-slate-500 mb-6 flex-1">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                                            <Mail size={16} />
                                        </div>
                                        <span className="truncate" title={ngo?.email}>{ngo?.email || "No email"}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                                            <Calendar size={16} />
                                        </div>
                                        <span>Joined {new Date(ngo?.createdAt || Date.now()).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex gap-3 mt-auto">
                                    <button
                                        type="button"
                                        className="flex-1 py-2 px-4 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors inline-flex justify-center items-center gap-2"
                                        onClick={() => navigate(`/admin/verified-ngos/${ngo._id}`)}
                                        title="View Details"
                                    >
                                        <ExternalLink size={16} /> Details
                                    </button>
                                    <Button
                                        type="danger"
                                        className="!py-2 !px-4 text-sm font-bold"
                                        disabled={removingCurrentNgo}
                                        onClick={() => {
                                            const shouldDelete = window.confirm("This will permanently remove the NGO and associated campaigns. Continue?");
                                            if (!shouldDelete) return;
                                            setActionError("");
                                            setActionSuccess("");
                                            removeNgoMutation.mutate(ngo._id);
                                        }}
                                        title="Remove NGO"
                                    >
                                        {removingCurrentNgo ? "..." : <Trash2 size={16} />}
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default VerifiedNgos;
