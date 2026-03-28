import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Trash2, ExternalLink } from "lucide-react";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
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

    const rows = useMemo(() => {
        return ngos.map((ngo) => {
            const ngoName = ngo?.profile?.organizationName || ngo?.profile?.name || "Unnamed NGO";
            const removingCurrentNgo = removeNgoMutation.isPending && removeNgoMutation.variables === ngo._id;

            return [
                <button
                    type="button"
                    className="font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-2"
                    onClick={() => navigate(`/admin/verified-ngos/${ngo._id}`)}
                >
                    {ngoName}
                    <ExternalLink size={14} />
                </button>,
                <span className="text-slate-600">{ngo?.email || "-"}</span>,
                <Badge label="Verified" type="success" />,
                <span className="text-slate-500">{new Date(ngo?.createdAt || Date.now()).toLocaleDateString()}</span>,
                <Button
                    type="danger"
                    className="!px-3 !py-1.5 text-xs"
                    disabled={removingCurrentNgo}
                    onClick={() => {
                        const shouldDelete = window.confirm("This will permanently remove the NGO and associated campaigns. Continue?");
                        if (!shouldDelete) return;
                        setActionError("");
                        setActionSuccess("");
                        removeNgoMutation.mutate(ngo._id);
                    }}
                >
                    <Trash2 size={15} /> Remove
                </Button>,
            ];
        });
    }, [ngos, navigate, removeNgoMutation]);

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <BadgeCheck className="text-emerald-600" size={32} strokeWidth={2.5} />
                    Verified NGOs
                </h1>
                <p className="text-slate-500 mt-2 font-medium">View verified NGOs, open NGO details, or remove NGO accounts.</p>
            </div>

            <Card className="p-0 overflow-hidden">
                {actionError && (
                    <div className="mx-5 mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        {actionError}
                    </div>
                )}

                {actionSuccess && (
                    <div className="mx-5 mt-5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                        {actionSuccess}
                    </div>
                )}

                {isLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading verified NGOs...</div>
                ) : isError ? (
                    <div className="p-8 text-center">
                        <p className="text-red-700 font-semibold">{error?.message || "Failed to load verified NGOs"}</p>
                        <button onClick={() => refetch()} className="mt-2 text-sm underline text-red-700">Retry</button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No verified NGOs found.</div>
                ) : (
                    <Table
                        headers={["NGO", "Email", "Status", "Joined", "Actions"]}
                        data={rows}
                    />
                )}
            </Card>
        </div>
    );
}

export default VerifiedNgos;
