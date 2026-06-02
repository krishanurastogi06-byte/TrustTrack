import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { ShieldCheck, Check, X, AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useAdminNgos, useVerifyNgo, useRejectNgo } from "../../hooks/useAdminNgos";

function NgoVerification() {
    const [actionError, setActionError] = useState("");
    const [actionSuccess, setActionSuccess] = useState("");

    const { data, isLoading, isError, error, refetch } = useAdminNgos({ perPage: 100 });

    const verifyMutation = useVerifyNgo({
        onSuccess: () => {
            setActionError("");
            setActionSuccess("NGO verified successfully.");
        },
        onError: (err) => {
            setActionSuccess("");
            setActionError(err?.message || "Failed to verify NGO");
        },
    });

    const rejectMutation = useRejectNgo({
        onSuccess: () => {
            setActionError("");
            setActionSuccess("NGO rejected and account deleted.");
        },
        onError: (err) => {
            setActionSuccess("");
            setActionError(err?.message || "Failed to reject NGO");
        },
    });

    const [filter, setFilter] = useState("all");

    const filterOptions = [
        { id: "all", label: "All NGOs" },
        { id: "pending", label: "Pending Verification" },
        { id: "approved", label: "Verified NGOs" },
        { id: "rejected", label: "Rejected" },
    ];

    const allNgos = data?.items || [];

    const filteredNgos = allNgos.filter((ngo) => {
        const status = (ngo?.verificationStatus || (ngo?.isVerified ? "approved" : "pending")).toLowerCase();

        if (filter === "all") return true;
        if (filter === "pending") return status === "pending";
        if (filter === "approved") return status === "approved";
        if (filter === "rejected") return status === "rejected";
        return true;
    });

    const headers = ["Name", "Email", "Verification Status", "Wallet Address", "Actions"];
    const rows = filteredNgos.map((ngo) => {
        const status = ngo?.verificationStatus || (ngo?.isVerified ? "approved" : "pending");
        const isApproved = status === "approved";
        const isRejected = status === "rejected";
        const isPendingAction = verifyMutation.isPending || rejectMutation.isPending;
        const hasWallet = !!ngo?.walletAddress;

        return [
            <span className="font-semibold text-slate-800">{ngo?.profile?.organizationName || ngo?.profile?.name || "Unnamed NGO"}</span>,
            <span className="text-slate-600">{ngo?.email || "-"}</span>,
            isApproved ? (
                <Badge label="Verified" type="success" />
            ) : isRejected ? (
                <Badge label="Rejected" type="danger" />
            ) : (
                <Badge label="Pending" type="warning" />
            ),
            <div className="flex items-center gap-2">
                {hasWallet ? (
                    <>
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-xs font-mono text-slate-600 truncate max-w-xs" title={ngo.walletAddress}>
                            {ngo.walletAddress.substring(0, 10)}...{ngo.walletAddress.substring(36)}
                        </span>
                    </>
                ) : (
                    <>
                        <AlertCircle size={16} className="text-amber-600" />
                        <span className="text-sm text-amber-600 font-medium">Not Configured</span>
                    </>
                )}
            </div>,
            <div className="flex gap-2">
                <Button
                    label="Verify"
                    type="success"
                    className="!px-3 !py-1.5 text-xs shadow-sm shadow-emerald-600/20"
                    disabled={isApproved || isPendingAction}
                    onClick={() => {
                        setActionError("");
                        setActionSuccess("");
                        verifyMutation.mutate(ngo._id);
                    }}
                >
                    <Check size={16} /> Verify
                </Button>
                <Button
                    label="Reject"
                    type="danger"
                    className="!px-3 !py-1.5 text-xs shadow-sm shadow-red-600/20"
                    disabled={isRejected || isPendingAction}
                    onClick={() => {
                        setActionError("");
                        setActionSuccess("");
                        rejectMutation.mutate(ngo._id);
                    }}
                >
                    <X size={16} /> Reject
                </Button>
            </div>,
        ];
    });

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-6 pb-6 border-b border-slate-200">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <ShieldCheck className="text-indigo-600" size={32} strokeWidth={2.5} />
                    NGO Verification
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Approve or reject pending NGO application requests.</p>
            </div>

            <div className="mb-8 -mx-1 px-1">
                <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide md:pb-0 md:flex-wrap">
                    {filterOptions.map((opt) => {
                        const count = opt.id === "all"
                            ? allNgos.length
                            : allNgos.filter(ngo => {
                                const status = (ngo?.verificationStatus || (ngo?.isVerified ? "approved" : "pending")).toLowerCase();
                                if (opt.id === "pending") return status === "pending";
                                if (opt.id === "approved") return status === "approved";
                                if (opt.id === "rejected") return status === "rejected";
                                return true;
                            }).length;

                        return (
                            <button
                                key={opt.id}
                                onClick={() => setFilter(opt.id)}
                                className={`flex-shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border ${filter === opt.id
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                            >
                                {opt.label}
                                <span className={`flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] min-w-[20px] ${filter === opt.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                    }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <Card className="p-0 overflow-hidden shadow-sm border border-slate-200">
                {actionError && (
                    <div className="mx-6 mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
                        <X size={16} /> {actionError}
                    </div>
                )}

                {actionSuccess && (
                    <div className="mx-6 mt-5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4">
                        <p className="font-bold flex items-center gap-2"><Check size={16} /> {actionSuccess}</p>
                    </div>
                )}

                {isLoading ? (
                    <div className="p-16 text-center text-slate-500 font-medium animate-pulse">Loading NGOs...</div>
                ) : isError ? (
                    <div className="p-16 text-center">
                        <p className="text-red-700 font-bold bg-red-50 px-4 py-3 rounded-xl border border-red-100 inline-block">{error?.message || "Failed to load NGOs"}</p>
                        <br />
                        <button onClick={() => refetch()} className="mt-4 text-sm font-semibold underline text-red-700 hover:text-red-800">Retry Connection</button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
                        <ShieldCheck size={48} className="text-slate-300" strokeWidth={1} />
                        <p className="font-medium">No {filter !== "all" ? filter.replace("_", " ") : ""} NGOs found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table headers={headers} data={rows} />
                    </div>
                )}
            </Card>
        </div>
    );
}

export default NgoVerification;