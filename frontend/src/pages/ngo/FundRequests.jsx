import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { HandCoins, Send } from "lucide-react";

function FundRequests() {
    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <HandCoins className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Fund Requests
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Request pending milestone distribution from administrators.</p>
            </div>
            
            <Card className="p-0 overflow-hidden">
                <div className="p-8 text-center text-slate-500">
                    Fund release request endpoint is not available in backend yet. Add payout/fund request API and connect this page.
                </div>
            </Card>
        </div>
    );
}

export default FundRequests;