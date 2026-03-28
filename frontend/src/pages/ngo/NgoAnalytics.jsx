import Card from "../../components/ui/Card";
import { BarChart3 } from "lucide-react";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useAuthStore } from "../../store/useAuthStore";

function NgoAnalytics() {
    const user = useAuthStore((state) => state.user);
    const { data, isLoading, isError, error } = useCampaigns({ ngoId: user?._id, perPage: 200 }, { enabled: !!user?._id });
    const campaigns = data?.items || [];
    const published = campaigns.filter((c) => c.status === "published").length;
    const completed = campaigns.filter((c) => c.status === "completed").length;

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <BarChart3 className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Analytics Insight
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Visualize your campaign performance and overall reach.</p>
            </div>

            <Card className="p-8 text-center">
                {isLoading ? (
                    <p className="text-slate-500">Loading analytics...</p>
                ) : isError ? (
                    <p className="text-red-700 font-semibold">{error?.message || "Failed to load analytics"}</p>
                ) : (
                    <div className="space-y-2">
                        <p className="text-slate-700 font-semibold">Total Campaigns: {campaigns.length}</p>
                        <p className="text-slate-700 font-semibold">Published Campaigns: {published}</p>
                        <p className="text-slate-700 font-semibold">Completed Campaigns: {completed}</p>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default NgoAnalytics;