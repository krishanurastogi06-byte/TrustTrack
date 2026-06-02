import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import notificationService from "../services/notificationService";

export function useNotifications(options = {}) {
    return useQuery({
        queryKey: ["notifications"],
        queryFn: notificationService.getNotifications,
        // Using WebSockets for real-time updates (TopNavbar listener)
        refetchInterval: false,
        refetchOnWindowFocus: true,
        ...options,
    });
}

export function useMarkNotificationAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id) => notificationService.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

export function useMarkAllNotificationsAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => notificationService.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

export function useDeleteNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id) => notificationService.deleteNotification(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

export function useClearAllNotifications() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => notificationService.deleteAllNotifications(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}
