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

    const ngos = data?.items || [];

    const headers = ["Name", "Email", "Verification Status", "Wallet Address", "Actions"];
    const rows = ngos.map((ngo) => {
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
                    className="!px-3 !py-1.5 text-xs"
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
                    className="!px-3 !py-1.5 text-xs"
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
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <ShieldCheck className="text-indigo-600" size={32} strokeWidth={2.5} />
                    NGO Verification
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Approve or reject pending NGO application requests.</p>
            </div>
            
            <Card className="p-0 overflow-hidden">
                {actionError && (
                    <div className="mx-5 mt-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        {actionError}
                    </div>
                )}

                {actionSuccess && (
                    <div className="mx-5 mt-5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                        {actionSuccess}
                    </div>
                )}

                {isLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading NGOs...</div>
                ) : isError ? (
                    <div className="p-8 text-center">
                        <p className="text-red-700 font-semibold">{error?.message || "Failed to load NGOs"}</p>
                        <button onClick={() => refetch()} className="mt-2 text-sm underline text-red-700">Retry</button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No NGOs found.</div>
                ) : (
                    <Table headers={headers} data={rows} />
                )}
            </Card>
        </div>
    );
}

export default NgoVerification;