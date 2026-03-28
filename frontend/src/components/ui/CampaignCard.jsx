import Card from "./Card";
import Button from "./Button";
import { Heart, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

function CampaignCard({ data }) {
    const navigate = useNavigate();
    const { id, title, description, category, raised, goal, image } = data;

    // Calculate progress percentage securely
    const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

    return (
        <Card className="p-0 overflow-hidden flex flex-col hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-shadow">
            <div className="h-48 bg-slate-200 relative">
                <img 
                    src={image} 
                    alt={title} 
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm">
                    {category}
                </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-6">{description}</p>
                
                <div className="mt-auto">
                    <div className="flex justify-between text-sm font-semibold mb-2">
                        <span className="text-indigo-600">₹{raised.toLocaleString()} raised</span>
                        <span className="text-slate-400">of ₹{goal.toLocaleString()}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-6">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="flex gap-3">
                        <Button 
                            label="View Details" 
                            className="w-full" 
                            onClick={() => navigate(`/donor/campaign/${id}`)} 
                        />
                        <button className="p-3 bg-slate-100 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0">
                            <Heart size={20} />
                        </button>
                        <button className="p-3 bg-slate-100 text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors shrink-0">
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default CampaignCard;
