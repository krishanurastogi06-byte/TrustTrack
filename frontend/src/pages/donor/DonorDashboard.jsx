import Card from "../../components/ui/Card";
import Grid from "../../components/ui/Grid";
import { LayoutDashboard, HeartHandshake, TrendingUp, Sparkles } from "lucide-react";
import { useDonations } from "../../hooks/useDonations";
import { useAuthStore } from "../../store/useAuthStore";

function normalizeDonationAmount(donation) {
    const directAmount = donation?.amount;
    if (typeof directAmount === "number" && Number.isFinite(directAmount)) return directAmount;

    if (typeof directAmount === "string") {
        const parsed = Number.parseFloat(directAmount.replace(/[^0-9.]/g, ""));
        if (Number.isFinite(parsed)) return parsed;
    }

    const metadataAmount = donation?.metadata?.amountEth ?? donation?.metadata?.amount;
    if (typeof metadataAmount === "number" && Number.isFinite(metadataAmount)) return metadataAmount;
    if (typeof metadataAmount === "string") {
        const parsed = Number.parseFloat(metadataAmount.replace(/[^0-9.]/g, ""));
        if (Number.isFinite(parsed)) return parsed;
    }

    return 0;
}

function DonorDashboard() {
    const user = useAuthStore((state) => state.user);
    const initialized = useAuthStore((state) => state.initialized);
    const { data, isLoading } = useDonations(
        { perPage: 100 },
        { enabled: initialized && !!user?._id }
    );

    const items = data?.items || data?.data || [];
    const confirmedItems = items.filter((d) => d.status === "confirmed");
    const totalDonated = confirmedItems.reduce((sum, d) => sum + normalizeDonationAmount(d), 0);
    const campaignsSupported = new Set(items.map((d) => d.campaign?._id || d.campaign).filter(Boolean)).size;
    const confirmed = confirmedItems.length;
    const impact = items.length ? Math.round((confirmed / items.length) * 100) : 0;

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <LayoutDashboard className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Welcome Back 👋
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Here is the summary of your recent impact across the world.</p>
            </div>

            <Grid>
                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(79,70,229,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <HeartHandshake size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Total Donated</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">
                        {isLoading ? "..." : `${totalDonated.toFixed(2)} ETH`}
                    </p>
                    <div className="absolute -bottom-4 -right-4 text-indigo-50/50 group-hover:scale-110 transition-transform duration-500">
                        <HeartHandshake size={120} />
                    </div>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <TrendingUp size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Campaigns Supported</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">{isLoading ? "..." : campaignsSupported}</p>
                    <div className="absolute -bottom-4 -right-4 text-emerald-50/50 group-hover:scale-110 transition-transform duration-500">
                        <TrendingUp size={120} />
                    </div>
                </Card>

                <Card className="relative overflow-hidden group hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.15)] transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                            <Sparkles size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    <h3 className="text-slate-500 font-semibold text-sm uppercase tracking-wider">Impact Score</h3>
                    <p className="text-4xl font-extrabold mt-2 text-slate-800 tracking-tight">{isLoading ? "..." : `${impact}%`}</p>
                    <div className="absolute -bottom-4 -right-4 text-amber-50/50 group-hover:scale-110 transition-transform duration-500">
                        <Sparkles size={120} />
                    </div>
                </Card>
            </Grid>
        </div>
    );
}

export default DonorDashboard;