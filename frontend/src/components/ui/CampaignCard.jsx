import Card from "./Card";
import Button from "./Button";
import { Heart, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

function CampaignCard({ data }) {
    const navigate = useNavigate();
    const { id, title, description, category, status, raisedEth = 0, goalEth = 0, image, ngoName } = data;

    const isUpcoming = status === 'draft';

    // Calculate progress percentage securely
    const progress = goalEth > 0 ? Math.min((raisedEth / goalEth) * 100, 100) : 0;

    const handleShare = async (e) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/donor/campaign/${id}`;
        const shareData = {
            title: title,
            text: `Support this campaign on TrustTrack: ${title}`,
            url: shareUrl
        };

        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                toast.success("Shared successfully!");
            } else {
                await navigator.clipboard.writeText(shareUrl);
                toast.success("Campaign link copied to clipboard!");
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error sharing campaign:", error);
                toast.error("Failed to share campaign");
            }
        }
    };

    return (
        <Card className="p-0 overflow-hidden flex flex-col bg-white border border-slate-100 rounded-[2rem] hover:shadow-[0_15px_40px_rgba(99,102,241,0.06)] hover:-translate-y-1 transition-all duration-300 group h-full">
            <div className="h-48 bg-slate-100 relative overflow-hidden">
                <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-xl text-xs font-black text-slate-700 shadow-sm uppercase tracking-wider">
                    {category}
                </div>
                {isUpcoming && (
                    <div className="absolute top-4 left-4 bg-amber-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-sm uppercase tracking-wider">
                        Upcoming
                    </div>
                )}
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                    {ngoName && (
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1.5">
                            {ngoName}
                        </p>
                    )}
                    <h3 className="text-lg font-black text-slate-800 mb-2 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">{title}</h3>
                    <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-2 mb-6">{description}</p>
                </div>

                <div className="mt-auto">
                    <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-indigo-600 font-extrabold">{Number(raisedEth || 0).toFixed(4)} ETH raised</span>
                        <span className="text-slate-400">of {Number(goalEth || 0).toFixed(4)} ETH</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-6 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            label={isUpcoming ? "Upcoming..." : "View Details"}
                            className={`w-full !rounded-xl text-xs font-bold py-3 ${isUpcoming ? "opacity-50 cursor-not-allowed bg-slate-400 hover:bg-slate-400 pointer-events-none" : "bg-indigo-600"}`}
                            onClick={() => !isUpcoming && navigate(`/donor/campaign/${id}`)}
                            disabled={isUpcoming}
                        />
                        <button 
                            className={`p-3 bg-slate-50 text-slate-400 rounded-xl transition-all shrink-0 border-none outline-none ${isUpcoming ? 'opacity-50 cursor-not-allowed' : 'hover:text-indigo-600 hover:bg-indigo-50'}`}
                            onClick={handleShare}
                            disabled={isUpcoming}
                        >
                            <Share2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default CampaignCard;
