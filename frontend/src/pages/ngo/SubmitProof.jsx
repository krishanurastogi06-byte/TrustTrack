import React, { useState } from "react";
import Card from "../../components/ui/Card";
import { UploadCloud } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitProofSchema } from "../../schemas/campaignSchema";
import FormSelect from "../../components/ui/form/FormSelect";
import FormTextarea from "../../components/ui/form/FormTextarea";
import FileUpload from "../../components/ui/form/FileUpload";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import { useCampaigns, useCampaignMilestones } from "../../hooks/useCampaigns";
import { useCreateProof, useMyProofs, useUploadProof } from "../../hooks/useProofs";
import { useAuthStore } from "../../store/useAuthStore";

function SubmitProof() {
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");
    const user = useAuthStore((state) => state.user);

    const {
        register,
        control,
        handleSubmit,
        watch,
        formState: { errors, isValid },
    } = useForm({
        resolver: zodResolver(submitProofSchema),
        mode: "onChange",
    });

    const selectedCampaign = watch("campaignId");
    const { data: campaignsData, isLoading: campaignsLoading, isError: campaignsError } = useCampaigns({ ngoId: user?._id, perPage: 100 }, { enabled: !!user?._id });
    const { data: milestonesData, isLoading: milestonesLoading } = useCampaignMilestones(selectedCampaign);
    const { data: myProofsData, isLoading: proofsLoading, isError: proofsError, error: proofsLoadError, refetch: refetchProofs } = useMyProofs({}, { enabled: !!user?._id });
    const uploadProofMutation = useUploadProof();
    const createProofMutation = useCreateProof();

    const campaigns = campaignsData?.items || [];
    const milestones = milestonesData?.items || [];
    const proofs = myProofsData?.items || myProofsData?.data || [];

    const proofHeaders = ["Campaign", "Milestone", "Document", "Status", "Submitted On"];
    const proofRows = proofs.map((proof) => {
        const status = String(proof?.status || "pending").toLowerCase();
        const badgeType = status === "verified" ? "success" : status === "rejected" ? "danger" : "warning";
        const submittedOn = proof?.createdAt ? new Date(proof.createdAt).toLocaleString() : "-";

        return [
            <span className="font-semibold text-slate-800">{proof?.milestone?.campaign?.title || "-"}</span>,
            <span className="text-slate-700">{proof?.milestone?.title || "-"}</span>,
            <span className="text-slate-600">{proof?.filename || proof?.cid || "-"}</span>,
            <Badge label={status} type={badgeType} />,
            <span className="text-slate-500 text-xs">{submittedOn}</span>,
        ];
    });

    async function onSubmit(values) {
        setSubmitting(true);
        setSubmitError("");
        setSubmitSuccess("");
        try {
            const upload = await uploadProofMutation.mutateAsync(values.file);
            await createProofMutation.mutateAsync({
                milestoneId: values.milestoneId,
                payload: {
                    cid: upload.cid,
                    filename: upload.filename,
                    mimeType: upload.mimeType,
                    size: upload.size,
                    remarks: values.remarks,
                },
            });
            setSubmitSuccess("Proof submitted successfully.");
        } catch (err) {
            console.error(err);
            setSubmitError(err?.message || "Failed to submit proof");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <UploadCloud className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Submit Milestone Proof
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Provide documentation verifying your milestone progress.</p>
            </div>

            <Card>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {submitError && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            {submitError}
                        </div>
                    )}

                    {submitSuccess && (
                        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                            {submitSuccess}
                        </div>
                    )}

                    <div>
                        <FormSelect
                            label="Target Campaign"
                            id="campaignId"
                            register={register}
                            options={campaigns.map((c) => ({ value: c._id, label: c.title }))}
                            error={errors.campaignId}
                        />
                        {campaignsLoading && <p className="mt-1 text-xs text-slate-500">Loading campaigns...</p>}
                        {campaignsError && <p className="mt-1 text-xs text-red-600">Failed to load campaigns</p>}
                    </div>

                    <div>
                        <FormSelect
                            label="Milestone Phase"
                            id="milestoneId"
                            register={register}
                            options={milestones.map((m) => ({ value: m._id, label: m.title }))}
                            error={errors.milestoneId}
                        />
                        {selectedCampaign && milestonesLoading && <p className="mt-1 text-xs text-slate-500">Loading milestones...</p>}
                    </div>

                    <div>
                        <label className="text-sm font-bold text-slate-700">Proof Document</label>
                        <div className="mt-2">
                            <Controller
                                control={control}
                                name="file"
                                render={({ field: { onChange, value } }) => (
                                    <FileUpload value={value} onChange={onChange} error={errors.file} />
                                )}
                            />
                        </div>
                    </div>

                    <div>
                        <FormTextarea label="Remarks / Description" id="remarks" register={register} error={errors.remarks} rows={3} placeholder="Add any additional details..." />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={!isValid || submitting}
                            className="w-full sm:w-auto inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {submitting ? "Submitting..." : "Submit Documentation"}
                        </button>
                    </div>
                </form>
            </Card>

            <Card className="mt-6 p-0 overflow-hidden">
                <div className="px-6 pt-6 pb-2">
                    <h2 className="text-lg font-bold text-slate-800">Submitted Proof Status</h2>
                    <p className="text-sm text-slate-500 mt-1">Track verification progress for your submitted proofs.</p>
                </div>

                {proofsLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading proof statuses...</div>
                ) : proofsError ? (
                    <div className="p-8 text-center">
                        <p className="text-red-700 font-semibold">{proofsLoadError?.message || "Failed to load proof statuses"}</p>
                        <button onClick={() => refetchProofs()} className="mt-2 text-sm underline text-red-700">Retry</button>
                    </div>
                ) : proofRows.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No proofs submitted yet.</div>
                ) : (
                    <Table headers={proofHeaders} data={proofRows} />
                )}
            </Card>
        </div>
    );
}

export default SubmitProof;