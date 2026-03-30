import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil } from "lucide-react";
import Card from "../../components/ui/Card";
import FormInput from "../../components/ui/form/FormInput";
import FormSelect from "../../components/ui/form/FormSelect";
import FormTextarea from "../../components/ui/form/FormTextarea";
import { useCampaign, useUpdateCampaign } from "../../hooks/useCampaigns";

const editCampaignSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters").max(120),
    category: z.string().min(1, "Select a category"),
    coverImageUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
    description: z.string().min(20, "Description must be at least 20 characters").max(5000),
    fundingGoal: z.coerce.number().min(100, "Funding goal must be at least ₹100").max(100000000, "Funding goal seems too large"),
    milestones: z.array(
        z.object({
            id: z.string().optional(),
            title: z.string().min(3, "Milestone title too short").max(120),
            amount: z.coerce.number().min(1, "Milestone amount must be at least ₹1"),
            description: z.string().max(2000).optional(),
        })
    ),
});

function slugify(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function EditCampaign() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [submitError, setSubmitError] = useState("");
    const INR_PER_ETH = 250000;

    const { data, isLoading, isError, error, refetch } = useCampaign(id, { enabled: !!id });
    const campaign = data?.campaign;

    const defaultValues = useMemo(() => ({
        title: "",
        category: "",
        coverImageUrl: "",
        description: "",
        fundingGoal: undefined,
        milestones: [],
    }), []);

    const {
        register,
        control,
        watch,
        handleSubmit,
        reset,
        formState: { errors, isValid },
    } = useForm({
        resolver: zodResolver(editCampaignSchema),
        mode: "onChange",
        defaultValues,
    });

    const { fields, append, remove } = useFieldArray({ control, name: "milestones" });
    const milestones = watch("milestones");

    const formatEth = useMemo(() => {
        return (amountInr) => {
            const amount = Number(amountInr);
            if (!Number.isFinite(amount) || amount <= 0) return "-";
            return `${(amount / INR_PER_ETH).toFixed(6)} ETH`;
        };
    }, [INR_PER_ETH]);

    useEffect(() => {
        if (!campaign) return;
        reset({
            title: campaign.title || "",
            category: campaign.category || "",
            coverImageUrl: campaign.coverImage || "",
            description: campaign.description || "",
            fundingGoal: Number(campaign.fundingGoalINR ?? campaign.fundingGoal ?? 0),
            milestones: (data?.milestones || []).map((m) => ({
                id: m._id || m.id,
                title: m.title || "",
                amount: Number(m.milestoneAmountINR ?? m.amountINR ?? m.amount ?? 0),
                description: m.description || "",
            })),
        });
    }, [campaign, data?.milestones, reset]);

    const updateMutation = useUpdateCampaign(id, {
        onSuccess: () => {
            navigate("/ngo/campaigns", { state: { message: "Campaign updated successfully." } });
        },
        onError: (err) => {
            setSubmitError(err?.message || "Failed to update campaign");
        },
    });

    async function onSubmit(values) {
        setSubmitError("");
        updateMutation.mutate({
            title: values.title,
            slug: slugify(values.title),
            summary: values.description.slice(0, 160),
            description: values.description,
            category: values.category,
            coverImage: values.coverImageUrl || undefined,
            fundingGoal: Number(values.fundingGoal),
            fundingGoalINR: Number(values.fundingGoal),
            fundingGoalETH: Number(values.fundingGoal) / INR_PER_ETH,
            milestones: (values.milestones || []).map((m) => ({
                ...(m.id ? { id: m.id } : {}),
                title: m.title,
                description: m.description || m.title,
                amount: Number(m.amount),
                milestoneAmountINR: Number(m.amount),
                milestoneAmountETH: Number(m.amount) / INR_PER_ETH,
            })),
        });
    }

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto w-full">
                <Card>
                    <div className="p-8 text-center text-slate-500">Loading campaign...</div>
                </Card>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-7xl mx-auto w-full">
                <Card>
                    <div className="p-8 text-center">
                        <p className="text-red-700 font-semibold">{error?.message || "Failed to load campaign"}</p>
                        <button onClick={() => refetch()} className="mt-2 text-sm underline text-red-700">Retry</button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <Pencil className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Edit Campaign
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Update your campaign details and publish changes.</p>
            </div>

            <Card>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {submitError && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            {submitError}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput label="Campaign Title" id="title" register={register} error={errors.title} placeholder="e.g. Village Water Project" />

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

                    <FormInput
                        id="coverImageUrl"
                        label="Cover Image URL"
                        register={register}
                        error={errors.coverImageUrl}
                        placeholder="https://images.unsplash.com/..."
                    />

                    <FormTextarea
                        label="Description"
                        id="description"
                        register={register}
                        error={errors.description}
                        rows={5}
                        placeholder="Describe your cause, the impact, and why people should donate..."
                    />

                    <FormInput
                        label="Funding Goal (₹)"
                        id="fundingGoal"
                        register={register}
                        registerOptions={{ valueAsNumber: true }}
                        type="number"
                        error={errors.fundingGoal}
                        placeholder="50000"
                    />

                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700">Project Milestones</h3>
                            <button
                                type="button"
                                onClick={() => append({ title: "", amount: undefined, description: "" })}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-bold transition-colors"
                            >
                                + Add Milestone
                            </button>
                        </div>

                        {fields.length === 0 && (
                            <p className="text-sm text-slate-500">No milestones yet. Add at least one milestone if needed.</p>
                        )}

                        <div className="space-y-3">
                            {fields.map((field, idx) => (
                                <div key={field.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                    <input type="hidden" {...register(`milestones.${idx}.id`)} />

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
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

                                        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_auto] gap-3 items-center">
                                            <div>
                                                <input
                                                    {...register(`milestones.${idx}.amount`, { valueAsNumber: true })}
                                                    placeholder="Amount (₹)"
                                                    type="number"
                                                    className={`w-full border ${errors?.milestones?.[idx]?.amount ? "border-red-400" : "border-slate-200"} bg-white px-4 py-3.5 rounded-xl focus:outline-none transition-all text-slate-700`}
                                                />
                                                {errors?.milestones?.[idx]?.amount && (
                                                    <p className="text-xs text-red-600 mt-1">{errors.milestones[idx].amount.message}</p>
                                                )}
                                            </div>

                                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-right">
                                                <p className="text-[10px] uppercase tracking-wide text-indigo-500 font-semibold">Approx ETH</p>
                                                <p className="text-xs font-bold text-indigo-700">{formatEth(milestones?.[idx]?.amount)}</p>
                                            </div>

                                            <button type="button" onClick={() => remove(idx)} className="text-red-600 hover:text-red-700 px-3 py-2">Remove</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="submit"
                            disabled={!isValid || updateMutation.isPending}
                            className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate("/ngo/campaigns")}
                            className="inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-2xl"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

export default EditCampaign;
