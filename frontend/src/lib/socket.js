import { io } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

class SocketService {
    constructor() {
        this.socket = null;
    }

    connect() {
        const token = useAuthStore.getState().accessToken;
        
        if (!token) {
            console.warn("[socket] No token found, skipping connection");
            return;
        }

        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            auth: {
                token
            },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });

        this.socket.on("connect", () => {
            console.log("[socket] Connected to server:", this.socket.id);
        });

        this.socket.on("connect_error", (err) => {
            console.error("[socket] Connection error:", err.message);
        });

        this.socket.on("disconnect", (reason) => {
            console.log("[socket] Disconnected:", reason);
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event, callback) {
        if (!this.socket) this.connect();
        this.socket?.on(event, callback);
    }

    off(event, callback) {
        this.socket?.off(event, callback);
    }

    getSocket() {
        return this.socket;
    }
}

const socketService = new SocketService();
export default socketService;
