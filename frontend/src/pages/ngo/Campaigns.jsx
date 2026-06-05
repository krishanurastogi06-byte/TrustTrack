import Table from "../../components/ui/Table";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Flag, Pencil, Trash2, Activity } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCampaigns, useDeleteCampaign } from "../../hooks/useCampaigns";
import { useAuthStore } from "../../store/useAuthStore";
import { useEffect, useState } from "react";

function Campaigns() {
    const headers = ["Title", "Goal", "Raised", "Status", "Actions"];
    const user = useAuthStore((state) => state.user);
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");
    const navigate = useNavigate();
    const location = useLocation();

    const { data, isLoading, isError, error, refetch, isFetching } = useCampaigns({ ngoId: user?._id, perPage: 100 }, { enabled: !!user?._id });

    const deleteMutation = useDeleteCampaign({
        onSuccess: () => {
            setActionError("");
            setActionSuccess("Campaign deleted successfully.");
        },
        onError: (err) => {
            setActionSuccess("");
            setActionError(err?.message || "Failed to delete campaign");
        },
    });

    useEffect(() => {
        if (location.state?.message) {
            setActionError("");
            setActionSuccess(location.state.message);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.pathname, location.state, navigate]);

    function handleDelete(item) {
        const confirmed = window.confirm(`Delete campaign \"${item.title}\"? This action cannot be undone.`);
        if (!confirmed) return;
        setActionError("");
        setActionSuccess("");
        deleteMutation.mutate(item._id || item.id);
    }

    function handleEdit(item) {
        const id = item?._id || item?.id;
        if (!id) return;
        navigate(`/ngo/campaigns/${id}/edit`);
    }

    const formatEth = (value) => {
        const amount = Number(value || 0);
        if (!Number.isFinite(amount)) return "0.0000 ETH";
        return `${amount.toFixed(4)} ETH`;
    };

    const rows = (data?.items || []).map((item) => [
        <span className="font-bold text-slate-800">{item.title}</span>,
        <span className="font-medium text-slate-600">{formatEth(item.fundingGoalETH)}</span>,
        <span className="font-bold text-slate-600">{formatEth(item.raisedETH)}</span>,
        <Badge
            label={item.status === "published" ? "Published" : item.status === "cancelled" ? "Rejected" : item.status === "completed" ? "Completed" : "Pending Verification"}
            type={item.status === "published" ? "success" : item.status === "cancelled" ? "danger" : item.status === "completed" ? "indigo" : "warning"}
        />,
        <div className="flex gap-2">
            <Button
                type="outline"
                className="!px-3 !py-1.5 text-xs !bg-indigo-50 hover:!bg-indigo-100 !text-indigo-700 !border-indigo-100"
                onClick={() => navigate(`/ngo/campaigns/${item._id || item.id}/progress`)}
            >
                <Activity size={14} /> Progress
            </Button>
            <Button
                type="secondary"
                className="!px-3 !py-1.5 text-xs"
                disabled={deleteMutation.isPending}
                onClick={() => handleEdit(item)}
            >
                <Pencil size={14} /> Edit
            </Button>
            <Button
                type="danger"
                className="!px-3 !py-1.5 text-xs"
                disabled={deleteMutation.isPending}
                onClick={() => handleDelete(item)}
            >
                <Trash2 size={14} /> Delete
            </Button>
        </div>,
    ]);

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <Flag className="text-indigo-600" size={32} strokeWidth={2.5} />
                    My Campaigns
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Track your organization's ongoing and completed campaigns.</p>
            </div>

            <Card className="p-0 overflow-hidden">
                {actionError && (
                    <div className="mx-6 mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        {actionError}
                    </div>
                )}

                {actionSuccess && (
                    <div className="mx-6 mt-5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                        {actionSuccess}
                    </div>
                )}

                {isFetching && !isLoading && (
                    <div className="px-6 pt-4 text-xs text-slate-500 font-semibold">Refreshing campaigns...</div>
                )}
                {isLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading campaigns...</div>
                ) : isError ? (
                    <div className="p-8 text-center">
                        <p className="text-red-700 font-semibold">{error?.message || "Failed to load campaigns"}</p>
                        <button onClick={() => refetch()} className="mt-2 text-sm underline text-red-700">Retry</button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        <p>No campaigns created yet.</p>
                        <Link to="/ngo/create" className="inline-block mt-3 text-indigo-600 font-semibold underline">Create your first campaign</Link>
                    </div>
                ) : (
                    <Table headers={headers} data={rows} />
                )}
            </Card>
        </div>
    );
}

export default Campaigns;