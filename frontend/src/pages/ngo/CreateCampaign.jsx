import React, { useState } from "react";
import Card from "../../components/ui/Card";
import { PlusCircle } from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import createCampaignSchema from "../../schemas/campaignSchema";
import FormInput from "../../components/ui/form/FormInput";
import FormSelect from "../../components/ui/form/FormSelect";
import FormTextarea from "../../components/ui/form/FormTextarea";
import FileUpload from "../../components/ui/form/FileUpload";
import { useCreateCampaign, useCreateMilestone } from "../../hooks/useCampaigns";

function CreateCampaign() {
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");

    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isValid },
        reset,
    } = useForm({
        resolver: zodResolver(createCampaignSchema),
        mode: "onChange",
        defaultValues: {
            title: "",
            category: "",
            coverImageUrl: "",
            description: "",
            fundingGoal: undefined,
            milestones: [{ title: "", amount: undefined }],
        },
    });

    const createCampaignMutation = useCreateCampaign();
    const createMilestoneMutation = useCreateMilestone();
    const submitting = createCampaignMutation.isPending || createMilestoneMutation.isPending;

    const slugify = (value) =>
        String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");

    const { fields, append, remove } = useFieldArray({ control, name: "milestones" });

    async function onSubmit(values) {
        setSubmitError("");
        setSubmitSuccess("");
        try {
            const slug = slugify(values.title);
            const payload = {
                title: values.title,
                slug,
                summary: values.description.slice(0, 160),
                description: values.description,
                category: values.category,
                coverImage: values.coverImageUrl || undefined,
                fundingGoal: Number(values.fundingGoal),
            };

            const campaignResponse = await createCampaignMutation.mutateAsync(payload);
            const campaignId = campaignResponse?.campaign?._id || campaignResponse?.campaign?.id;

            if (!campaignId) {
                throw new Error("Campaign created but id was not returned by server.");
            }

            if (campaignId && values.milestones?.length) {
                const milestoneResults = await Promise.allSettled(
                    values.milestones.map((m) =>
                        createMilestoneMutation.mutateAsync({
                            campaignId,
                            payload: {
                                title: m.title,
                                amount: Number(m.amount),
                                description: m.title,
                            },
                        })
                    )
                );

                const failedCount = milestoneResults.filter((r) => r.status === "rejected").length;
                if (failedCount > 0) {
                    setSubmitSuccess(`Campaign created, but ${failedCount} milestone(s) failed. You can add them later.`);
                    return;
                }
            }

            reset();
            setSubmitSuccess("Campaign created successfully.");
        } catch (err) {
            console.error(err);
            setSubmitError(err?.message || "Failed to publish campaign");
        }
    }

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <PlusCircle className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Create Campaign
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Post a new request for funds by filling out the details below.</p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <FormInput label="Campaign Title" id="title" register={register} error={errors.title} placeholder="e.g. Village Water Project" />
                        </div>

                        <div>
                            <FormSelect
                                label="Category"
                                id="category"
                                register={register}
                                options={[
                                    { value: "health", label: "Health Initiative" },
                                    { value: "education", label: "Education" },
                                    { value: "environment", label: "Environment" },
                                    { value: "disaster", label: "Disaster Relief" },
                                ]}
                                error={errors.category}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-slate-700">Cover Image</label>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div>
                                <Controller
                                    name="coverFile"
                                    control={control}
                                    render={({ field: { onChange, value } }) => (
                                        <FileUpload value={value} onChange={onChange} error={errors.coverFile} />
                                    )}
                                />
                            </div>
                            <div>
                                <FormInput id="coverImageUrl" label="Cover Image URL" register={register} error={errors.coverImageUrl} placeholder="https://images.unsplash.com/..." />
                                <p className="text-xs text-slate-400 mt-1">You may provide a URL or upload an image. Upload preferred for proof storage.</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <FormTextarea label="Description" id="description" register={register} error={errors.description} rows={5} placeholder="Describe your cause, the impact, and why people should donate..." />
                    </div>

                    <div>
                        <FormInput
                            label="Funding Goal (₹)"
                            id="fundingGoal"
                            register={register}
                            registerOptions={{ valueAsNumber: true }}
                            type="number"
                            error={errors.fundingGoal}
                            placeholder="50000"
                        />
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700">Project Milestones</h3>
                            <button
                                type="button"
                                onClick={() => append({ title: "", amount: undefined })}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-bold transition-colors"
                            >
                                + Add Milestone
                            </button>
                        </div>

                        <div className="space-y-3">
                            {fields.map((f, idx) => (
                                <div key={f.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                    <div className="md:col-span-2">
                                        <input
                                            {...register(`milestones.${idx}.title`)}
                                            placeholder="e.g. Phase 1 - Supply Assessment"
                                            className={`w-full border ${errors?.milestones?.[idx]?.title ? "border-red-400" : "border-slate-200"} bg-white px-4 py-3.5 rounded-xl focus:outline-none transition-all text-slate-700`}
                                        />
                                        {errors?.milestones?.[idx]?.title && (
                                            <p className="text-xs text-red-600 mt-1">{errors.milestones[idx].title.message}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-3 items-center">
                                        <input
                                            {...register(`milestones.${idx}.amount`, { valueAsNumber: true })}
                                            placeholder="Amount (₹)"
                                            type="number"
                                            className={`w-full border ${errors?.milestones?.[idx]?.amount ? "border-red-400" : "border-slate-200"} bg-white px-4 py-3.5 rounded-xl focus:outline-none transition-all text-slate-700`}
                                        />
                                        <button type="button" onClick={() => remove(idx)} className="text-red-600 hover:text-red-700 px-3 py-2">Remove</button>
                                        {errors?.milestones?.[idx]?.amount && (
                                            <p className="text-xs text-red-600 mt-1">{errors.milestones[idx].amount.message}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={!isValid || submitting}
                            className="w-full sm:w-auto inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {submitting ? "Publishing..." : "Publish Campaign"}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

export default CreateCampaign;