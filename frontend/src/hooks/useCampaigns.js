import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as campaignService from "../services/campaignService";

export function useCampaigns(params = {}, options = {}) {
  return useQuery({
    queryKey: ["campaigns", params],
    queryFn: () => campaignService.fetchCampaigns(params),
    placeholderData: keepPreviousData,
    retry: 1,
    ...options,
  });
}

export function useAdminCampaigns(params = {}, options = {}) {
  return useQuery({
    queryKey: ["admin-campaigns", params],
    queryFn: () => campaignService.fetchAdminCampaigns(params),
    placeholderData: keepPreviousData,
    retry: 1,
    ...options,
  });
}

export function useNgoCampaigns(params = {}, options = {}) {
  return useQuery({
    queryKey: ["ngo-campaigns", params],
    queryFn: () => campaignService.fetchNgoCampaigns(params),
    placeholderData: keepPreviousData,
    retry: 1,
    ...options,
  });
}

export function useCampaign(id, options = {}) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: () => campaignService.fetchCampaignById(id),
    enabled: !!id,
    retry: 1,
    ...options,
  });
}

export function useCampaignMilestones(campaignId, options = {}) {
  return useQuery({
    queryKey: ["campaign-milestones", campaignId],
    queryFn: () => campaignService.fetchCampaignMilestones(campaignId),
    enabled: !!campaignId,
    retry: 1,
    ...options,
  });
}

export function useCreateCampaign(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => campaignService.createCampaign(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      if (options?.onSuccess) options.onSuccess(data);
    },
    onError: options.onError,
  });
}

export function useCreateMilestone(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, payload }) => campaignService.createMilestone(campaignId, payload),
    onSuccess: (data) => {
      const currentCampaignId = data?.milestone?.campaign;
      if (currentCampaignId) {
        qc.invalidateQueries({ queryKey: ["campaign-milestones", currentCampaignId] });
      }
      if (options?.onSuccess) options.onSuccess(data);
    },
    onError: options.onError,
  });
}

export function useUpdateCampaign(id, options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => campaignService.updateCampaign(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      options.onSuccess && options.onSuccess(data);
    },
    onError: options.onError,
  });
}

export function useDeleteCampaign(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => campaignService.deleteCampaign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
    onError: options.onError,
  });
}

export function useVerifyCampaign(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => campaignService.verifyCampaign(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      if (options?.onSuccess) options.onSuccess(data);
    },
    onError: options.onError,
  });
}

export function useRejectCampaign(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => campaignService.rejectCampaign(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      if (options?.onSuccess) options.onSuccess(data);
    },
    onError: options.onError,
  });
}

export default useCampaigns;
