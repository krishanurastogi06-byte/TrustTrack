import { useQuery } from "@tanstack/react-query";
import { ngoService } from "../services/ngoService";

export function usePublicNgos(options = {}) {
  return useQuery({
    queryKey: ["public-ngos"],
    queryFn: () => ngoService.fetchPublicNgos(),
    ...options,
  });
}

export default usePublicNgos;
