import { Compass, Search } from "lucide-react";
import { useState } from "react";
import CampaignCard from "../../components/ui/CampaignCard";
import { useCampaigns } from "../../hooks/useCampaigns";
import useDebounce from "../../utils/useDebounce";

function ExploreCampaigns() {
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedQuery = useDebounce(searchQuery, 350);
    const { data, isLoading, isError, error, refetch, isFetching } = useCampaigns(
        { search: debouncedQuery || undefined, perPage: 50 },
        { staleTime: 1000 * 60 }
    );

    const campaigns = (data?.items || []).map((c) => ({
        id: c._id,
        title: c.title,
        description: c.summary || c.description,
        category: c.category || "General",
        raised: 0,
        goal: c.fundingGoal || 0,
        image: c.coverImage || "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800",
    }));

    const isInitialLoading = isLoading && !data;

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 w-full mb-8">
                <div className="flex-1">
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                        <Compass className="text-indigo-600" size={32} strokeWidth={2.5} />
                        Explore Campaigns
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Discover verified causes and organizations that need your help today.</p>
                </div>

                <div className="relative w-full lg:max-w-md shrink-0 z-10">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="text-slate-400" size={20} strokeWidth={2.5} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search campaigns by keyword, category, or title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-semibold placeholder:font-medium placeholder:text-slate-400 text-sm"
                    />
                </div>
            </div>

            {isFetching && !isInitialLoading && (
                <div className="mb-4 text-xs text-slate-500 font-semibold">Updating results...</div>
            )}

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {isInitialLoading ? (
                    <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-slate-100">
                        Loading campaigns...
                    </div>
                ) : isError ? (
                    <div className="col-span-full py-12 text-center bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-red-700 font-semibold">{error?.message || "Failed to load campaigns"}</p>
                        <button onClick={() => refetch()} className="mt-3 text-sm font-semibold text-red-700 underline">Retry</button>
                    </div>
                ) : campaigns.length > 0 ? (
                    campaigns.map((campaign) => (
                        <CampaignCard key={campaign.id} data={campaign} />
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-slate-100">
                        {debouncedQuery ? "No campaigns matched your search." : "No campaigns found."}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExploreCampaigns;