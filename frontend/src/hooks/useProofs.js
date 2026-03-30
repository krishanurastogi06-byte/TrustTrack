import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as proofService from "../services/proofService";

export function useAdminProofs(params = {}, options = {}) {
  return useQuery({
    queryKey: ["admin-proofs", params],
    queryFn: () => proofService.fetchAdminProofs(params),
    ...options,
  });
}

export function useUploadProof(options = {}) {
  return useMutation({
    mutationFn: (file) => proofService.uploadProofFile(file),
    ...options,
  });
}

export function useMyProofs(params = {}, options = {}) {
  return useQuery({
    queryKey: ["my-proofs", params],
    queryFn: () => proofService.fetchMyProofs(params),
    ...options,
  });
}

export function useCreateProof(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, payload }) => proofService.createProof(milestoneId, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["my-proofs"] });
      qc.invalidateQueries({ queryKey: ["admin-proofs"] });
      options.onSuccess && options.onSuccess(data);
    },
    onError: options.onError,
  });
}

export function useVerifyProof(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proofId, payload }) => proofService.verifyProof(proofId, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-proofs"] });
      options.onSuccess && options.onSuccess(data);
    },
    onError: options.onError,
  });
}

export function useRejectProof(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proofId, payload }) => proofService.rejectProof(proofId, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-proofs"] });
      options.onSuccess && options.onSuccess(data);
    },
    onError: options.onError,
  });
}

export function useDeleteMilestone(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId) => proofService.deleteMilestone(milestoneId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-proofs"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      if (options?.onSuccess) options.onSuccess(data);
    },
    onError: options.onError,
  });
}

export function useReleaseMilestoneFunds(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, remarks, expectedNgoWalletAddress }) =>
      proofService.releaseMilestoneFunds(milestoneId, { remarks, expectedNgoWalletAddress }),
    onMutate: async ({ milestoneId }) => {
      const key = ["admin-proofs"];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueriesData({ queryKey: key });

      previous.forEach(([queryKey, oldData]) => {
        if (!oldData?.data || !Array.isArray(oldData.data)) return;
        const patched = oldData.data.map((proof) => {
          if (String(proof?.milestone?._id) !== String(milestoneId)) return proof;
          return {
            ...proof,
            milestone: {
              ...proof.milestone,
              status: "completed",
              isPaid: true,
            },
          };
        });
        qc.setQueryData(queryKey, { ...oldData, data: patched });
      });

      return { previous };
    },
    onError: (error, _payload, context) => {
      context?.previous?.forEach(([queryKey, previousData]) => {
        qc.setQueryData(queryKey, previousData);
      });
      options.onError && options.onError(error);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-proofs"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign-milestones"] });
      options.onSuccess && options.onSuccess(data);
    },
  });
}

export default useAdminProofs;
