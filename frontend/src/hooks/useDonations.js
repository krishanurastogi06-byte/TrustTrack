import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as donationService from "../services/donationService";

export function useDonations(params = {}, options = {}) {
  return useQuery({
    queryKey: ["donations", params],
    queryFn: () => donationService.fetchDonations(params),
    ...options,
  });
}

export function useDonation(id, options = {}) {
  return useQuery({
    queryKey: ["donation", id],
    queryFn: () => donationService.fetchDonationById(id),
    enabled: !!id,
    ...options,
  });
}

export function useCreateDonation(options = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => donationService.createDonation(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["donations"] });
      options.onSuccess && options.onSuccess(data);
    },
    onError: options.onError,
  });
}

export default useDonations;
