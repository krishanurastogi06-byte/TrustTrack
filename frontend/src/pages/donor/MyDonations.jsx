import Table from "../../components/ui/Table";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { Gift } from "lucide-react";
import { useDonations } from "../../hooks/useDonations";

function MyDonations() {
    const headers = ["Campaign Name", "Amount Donated", "Status"];
    const { data, isLoading, isError, error, refetch } = useDonations({ perPage: 50 });

    const rows = (data?.items || []).map((item) => [
        <span className="font-bold text-slate-800">{item?.campaign?.title || "Campaign"}</span>,
        <span className="font-bold text-indigo-600">{item.amount} {item.currency}</span>,
        <Badge
            label={item.status}
            type={item.status === "confirmed" ? "success" : item.status === "failed" ? "danger" : "warning"}
        />,
    ]);

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <Gift className="text-indigo-600" size={32} strokeWidth={2.5} />
                    My Donations
                </h1>
                <p className="text-slate-500 mt-2 font-medium">History of your direct contributions and their current status.</p>
            </div>
            
            <Card className="p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading donations...</div>
                ) : isError ? (
                    <div className="p-8 text-center">
                        <p className="text-red-700 font-semibold">{error?.message || "Failed to load donations"}</p>
                        <button onClick={() => refetch()} className="mt-2 text-sm underline text-red-700">Retry</button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No donations yet.</div>
                ) : (
                    <Table headers={headers} data={rows} />
                )}
            </Card>
        </div>
    );
}

export default MyDonations;