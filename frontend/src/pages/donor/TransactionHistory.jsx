import Table from "../../components/ui/Table";
import Card from "../../components/ui/Card";
import { ArrowLeftRight } from "lucide-react";
import { useDonations } from "../../hooks/useDonations";

function TransactionHistory() {
    const headers = ["Transaction Hash", "Amount", "Date"];
    const { data, isLoading, isError, error, refetch } = useDonations({ perPage: 100 });

    const rows = (data?.items || [])
        .filter((d) => !!d.txHash)
        .map((item) => [
            <span className="font-mono text-sm font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">{item.txHash.slice(0, 10)}...{item.txHash.slice(-6)}</span>,
            <span className="font-bold text-slate-800">{item.amount} {item.currency}</span>,
            <span className="text-slate-500 font-medium">{new Date(item.createdAt).toLocaleString()}</span>,
        ]);

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <ArrowLeftRight className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Transaction History
                </h1>
                <p className="text-slate-500 mt-2 font-medium">An immutable ledger of your financial interactions.</p>
            </div>
            
            <Card className="p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading transactions...</div>
                ) : isError ? (
                    <div className="p-8 text-center">
                        <p className="text-red-700 font-semibold">{error?.message || "Failed to load transaction history"}</p>
                        <button onClick={() => refetch()} className="mt-2 text-sm underline text-red-700">Retry</button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No blockchain transaction history yet.</div>
                ) : (
                    <Table headers={headers} data={rows} />
                )}
            </Card>
        </div>
    );
}

export default TransactionHistory;