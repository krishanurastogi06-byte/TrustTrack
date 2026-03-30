import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as adminNgoService from "../services/adminNgoService";

export function useAdminNgos(params = {}, options = {}) {
  return useQuery({
    queryKey: ["admin-ngos", params],
    queryFn: () => adminNgoService.fetchAdminNgos(params),
    retry: 1,
    ...options,
  });
}

function patchNgoInCache(qc, ngoId, patch) {
  const matches = qc.getQueriesData({ queryKey: ["admin-ngos"] });
  matches.forEach(([key, oldData]) => {
    if (!oldData?.items) return;
    const items = oldData.items.map((ngo) => {
      if (String(ngo?._id) !== String(ngoId)) return ngo;
      return { ...ngo, ...patch };
    });
    qc.setQueryData(key, { ...oldData, items });
  });
}

export function useVerifyNgo(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ngoId) => adminNgoService.verifyAdminNgo(ngoId),
    onMutate: async (ngoId) => {
      await qc.cancelQueries({ queryKey: ["admin-ngos"] });
      patchNgoInCache(qc, ngoId, { isVerified: true, verificationStatus: "approved" });
      return { ngoId };
    },
    onError: (_err, _ngoId, ctx) => {
      if (ctx?.ngoId) {
        patchNgoInCache(qc, ctx.ngoId, { isVerified: false, verificationStatus: "pending" });
      }
      if (options.onError) options.onError(_err);
    },
    onSuccess: (data, ngoId) => {
      const updatedNgo = data?.ngo;
      if (updatedNgo?._id) {
        patchNgoInCache(qc, updatedNgo._id, updatedNgo);
      } else {
        patchNgoInCache(qc, ngoId, { isVerified: true, verificationStatus: "approved" });
      }
      if (options.onSuccess) options.onSuccess(data);
    },
  });
}

export function useRejectNgo(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ngoId) => adminNgoService.rejectAdminNgo(ngoId),
    onMutate: async (ngoId) => {
      await qc.cancelQueries({ queryKey: ["admin-ngos"] });
      // Remove the NGO from the list immediately
      const matches = qc.getQueriesData({ queryKey: ["admin-ngos"] });
      matches.forEach(([key, oldData]) => {
        if (!oldData?.items) return;
        const items = oldData.items.filter((ngo) => String(ngo?._id) !== String(ngoId));
        qc.setQueryData(key, { ...oldData, items, total: Math.max(0, (oldData.total || 1) - 1) });
      });
      return { ngoId };
    },
    onError: (_err, _ngoId, ctx) => {
      // Refetch on error to restore the list
      qc.invalidateQueries({ queryKey: ["admin-ngos"] });
      if (options.onError) options.onError(_err);
    },
    onSuccess: (data, ngoId) => {
      // Already removed from cache in onMutate
      if (options.onSuccess) options.onSuccess(data);
    },
  });
}

export function useVerifiedNgos(params = {}, options = {}) {
  return useQuery({
    queryKey: ["admin-verified-ngos", params],
    queryFn: () => adminNgoService.fetchVerifiedNgos(params),
    retry: 1,
    ...options,
  });
}

export function useDeleteNgo(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ngoId) => adminNgoService.deleteAdminNgo(ngoId),
    onSuccess: (data, ngoId) => {
      qc.setQueriesData({ queryKey: ["admin-verified-ngos"] }, (oldData) => {
        if (!oldData?.items) return oldData;
        return {
          ...oldData,
          items: oldData.items.filter((ngo) => String(ngo?._id) !== String(ngoId)),
        };
      });
      qc.invalidateQueries({ queryKey: ["admin-ngos"] });
      qc.invalidateQueries({ queryKey: ["admin-verified-ngos"] });
      if (options.onSuccess) options.onSuccess(data);
    },
    onError: (err) => {
      if (options.onError) options.onError(err);
    },
  });
}

export function useAdminNgoCampaigns(ngoId, options = {}) {
  return useQuery({
    queryKey: ["admin-ngo-campaigns", ngoId],
    queryFn: () => adminNgoService.fetchAdminNgoCampaigns(ngoId),
    enabled: Boolean(ngoId),
    retry: 1,
    ...options,
  });
}

export default useAdminNgos;
