import { Compass, Search, Building2, LayoutGrid, Clock, Heart, ArrowUpRight } from "lucide-react";
import { useState, useMemo } from "react";
import CampaignCard from "../../components/ui/CampaignCard";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useDonations } from "../../hooks/useDonations";
import { usePublicNgos } from "../../hooks/useNgos";
import useDebounce from "../../utils/useDebounce";

const INR_PER_ETH = 250000;

function ExploreCampaigns() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("verified"); // verified, upcoming, donations, ngos
    const [selectedNgoId, setSelectedNgoId] = useState(null);

    const debouncedQuery = useDebounce(searchQuery, 350);

    // Determines params for the campaign query
    const campaignParams = useMemo(() => {
        const params = { perPage: 50 };

        if (activeTab === "verified") {
            if (selectedNgoId) {
                params.ngoId = selectedNgoId;
                // When an NGO is explicitly selected, do not restrict to 'published' so both verified and upcoming are shown.
            } else {
                params.status = "published";
            }
        } else if (activeTab === "upcoming") {
            params.status = "draft";
        }

        return params;
    }, [activeTab, selectedNgoId]);

    // Fetch campaigns (used for 'verified' and 'upcoming')
    const {
        data: campaignsData,
        isLoading: isCampaignsLoading,
        isError: isCampaignsError,
        error: campaignsError,
        refetch: refetchCampaigns,
        isFetching: isCampaignsFetching
    } = useCampaigns(campaignParams, {
        enabled: activeTab === "verified" || activeTab === "upcoming",
        staleTime: 1000 * 60,
    });

    // Fetch My Donations
    const {
        data: donationsData,
        isLoading: isDonationsLoading,
        isError: isDonationsError,
        error: donationsError,
        refetch: refetchDonations,
    } = useDonations({}, {
        enabled: activeTab === "donations",
        staleTime: 1000 * 60,
    });

    // Fetch Public NGOs
    const {
        data: ngosData,
        isLoading: isNgosLoading,
        isError: isNgosError,
        error: ngosError,
        refetch: refetchNgos,
    } = usePublicNgos({
        enabled: activeTab === "ngos",
        staleTime: 1000 * 60 * 5,
    });

    // Process campaigns array
    const processCampaigns = (rawItems) => {
        return (rawItems || []).map((c) => ({
            id: c._id,
            title: c.title,
            description: c.summary || c.description,
            category: c.category || "General",
            status: c.status,
            raisedEth: Number(c.raisedETH || 0),
            goalEth: Number(c.fundingGoalETH || (Number(c.fundingGoalINR || c.fundingGoal || 0) / INR_PER_ETH)),
            image: c.coverImage || "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800",
            ngoName: c.ngo?.profile?.organizationName || c.ngo?.profile?.name || "Verified NGO",
        }));
    };

    let displayItems = [];
    let isLoading = false;
    let isError = false;
    let error = null;
    let refetch = () => { };

    if (activeTab === "verified" || activeTab === "upcoming") {
        displayItems = processCampaigns(campaignsData?.items);
        isLoading = isCampaignsLoading;
        isError = isCampaignsError;
        error = campaignsError;
        refetch = refetchCampaigns;

        if (debouncedQuery) {
            const q = debouncedQuery.toLowerCase();
            displayItems = displayItems.filter(c =>
                c.title?.toLowerCase().includes(q) ||
                c.category?.toLowerCase().includes(q) ||
                c.ngoName?.toLowerCase().includes(q)
            );
        }
    } else if (activeTab === "donations") {
        isLoading = isDonationsLoading;
        isError = isDonationsError;
        error = donationsError;
        refetch = refetchDonations;

        // Extract unique campaigns from donations
        if (donationsData?.items) {
            const uniqueCampaigns = new Map();
            donationsData.items.forEach(donation => {
                if (donation.campaign && !uniqueCampaigns.has(donation.campaign._id)) {
                    uniqueCampaigns.set(donation.campaign._id, donation.campaign);
                }
            });
            displayItems = processCampaigns(Array.from(uniqueCampaigns.values()));

            // local text search filtering for donations
            if (debouncedQuery) {
                const q = debouncedQuery.toLowerCase();
                displayItems = displayItems.filter(c =>
                    c.title?.toLowerCase().includes(q) ||
                    c.category?.toLowerCase().includes(q) ||
                    c.ngoName?.toLowerCase().includes(q)
                );
            }
        }
    } else if (activeTab === "ngos") {
        isLoading = isNgosLoading;
        isError = isNgosError;
        error = ngosError;
        refetch = refetchNgos;

        displayItems = ngosData || [];
        if (debouncedQuery) {
            const q = debouncedQuery.toLowerCase();
            displayItems = displayItems.filter(ngo =>
                ngo.profile?.name?.toLowerCase().includes(q) ||
                ngo.profile?.organizationName?.toLowerCase().includes(q)
            );
        }
    }

    const isInitialLoading = isLoading && displayItems.length === 0;

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSelectedNgoId(null); // Reset selected NGO when changing tabs
    };

    const handleNgoClick = (ngoId) => {
        setSelectedNgoId(ngoId);
        setActiveTab("verified");
    };

    const tabs = [
        { id: "verified", label: "All Verified Campaigns", icon: LayoutGrid },
        { id: "donations", label: "My Donations", icon: Heart },
        { id: "ngos", label: "Verified NGOs", icon: Building2 },
        { id: "upcoming", label: "Upcoming Campaigns", icon: Clock },
    ];

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 w-full mb-6">
                <div className="flex-1">
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                        <Compass className="text-indigo-600" size={32} strokeWidth={2.5} />
                        Explore Campaigns
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        {selectedNgoId ? "Viewing campaigns from selected NGO." : "Discover verified causes and organizations that need your help today."}
                    </p>
                </div>

                <div className="relative w-full lg:max-w-md shrink-0 z-10">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="text-slate-400" size={20} strokeWidth={2.5} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-semibold placeholder:font-medium placeholder:text-slate-400 text-sm"
                    />
                </div>
            </div>

            {/* Pills row */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all sm:w-auto w-full sm:flex-none justify-center ${activeTab === tab.id
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                            }`}
                    >
                        <tab.icon size={16} strokeWidth={2.5} className={activeTab === tab.id ? "text-indigo-200" : "text-slate-400"} />
                        {tab.label}
                    </button>
                ))}

                {selectedNgoId && activeTab === 'verified' && (
                    <div className="inline-flex items-center ml-2 border-l border-slate-300 pl-4 py-1">
                        <span className="text-sm font-semibold text-slate-600">Filtered by NGO</span>
                        <button
                            onClick={() => setSelectedNgoId(null)}
                            className="ml-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {(isCampaignsFetching || isDonationsLoading || isNgosLoading) && !isInitialLoading && (
                <div className="mb-4 text-xs text-slate-500 font-semibold">Updating results...</div>
            )}

            {/* Content Display */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {isInitialLoading ? (
                    <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-slate-100">
                        Loading...
                    </div>
                ) : isError ? (
                    <div className="col-span-full py-12 text-center bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-red-700 font-semibold">{error?.message || `Failed to load`}</p>
                        <button onClick={() => refetch()} className="mt-3 text-sm font-semibold text-red-700 underline">Retry</button>
                    </div>
                ) : displayItems.length > 0 ? (
                    activeTab === "ngos" ? (
                        displayItems.map((ngo) => (
                            <div
                                key={ngo._id}
                                onClick={() => handleNgoClick(ngo._id)}
                                className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgba(99,102,241,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group h-full min-h-[220px]"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                                {ngo.profile?.avatar ? (
                                                    <img src={ngo.profile.avatar} alt={ngo.profile?.organizationName || "NGO Logo"} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-extrabold text-xl">
                                                        {(ngo.profile?.organizationName || ngo.profile?.name || "N").charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-slate-800 tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">
                                                    {ngo.profile?.organizationName || "Verified Organization"}
                                                </h3>
                                                {ngo.profile?.name && (
                                                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                                                        Executive: <span className="text-slate-500 font-extrabold">{ngo.profile.name}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="bg-slate-50 group-hover:bg-indigo-50 p-2.5 rounded-xl text-slate-400 group-hover:text-indigo-600 inline-flex items-center transition-all duration-300">
                                            <ArrowUpRight size={18} strokeWidth={2.5} />
                                        </span>
                                    </div>
                                    {ngo.profile?.bio && (
                                        <div className="pt-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Core Mission / Vision</p>
                                            <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed font-medium">
                                                {ngo.profile.bio}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                                    <span>Joined {new Date(ngo.createdAt).toLocaleDateString()}</span>
                                    <span className="text-indigo-600 group-hover:underline">View Campaigns &rarr;</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        displayItems.map((campaign) => (
                            <CampaignCard key={campaign.id} data={campaign} />
                        ))
                    )
                ) : (
                    <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-slate-50 rounded-2xl border border-slate-100">
                        {debouncedQuery ? `No results matched your search.` : `No items found.`}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExploreCampaigns;