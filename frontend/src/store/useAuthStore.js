import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            role: null,
            accessToken: null,
            refreshToken: null,
            initialized: false,

            setAuth: ({ user, accessToken, refreshToken }) =>
                set({
                    user,
                    role: user?.role || null,
                    accessToken: accessToken || null,
                    refreshToken: refreshToken || null,
                    initialized: true,
                }),

            setUser: (userData) =>
                set((state) => ({
                    ...state,
                    user: userData,
                    role: userData?.role || null,
                })),

            setAccessToken: (token) =>
                set((state) => ({
                    ...state,
                    accessToken: token || null,
                })),

            setTokens: ({ accessToken, refreshToken }) =>
                set((state) => ({
                    ...state,
                    accessToken: accessToken || null,
                    refreshToken: refreshToken || state.refreshToken || null,
                })),

            setInitialized: (value = true) =>
                set((state) => ({
                    ...state,
                    initialized: !!value,
                })),

            isAuthenticated: () => {
                const state = get();
                return !!(state.accessToken && state.user);
            },

            logout: () =>
                set({
                    user: null,
                    role: null,
                    accessToken: null,
                    refreshToken: null,
                    initialized: true,
                }),
        }),
        {
            name: "auth-storage", // name of the item in the storage (must be unique)
            partialize: (state) => ({
                user: state.user,
                role: state.role,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
            }),
        }
    )
);