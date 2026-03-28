import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

function ProtectedRoute({ children, allowedRole }) {
    const role = useAuthStore((state) => state.role);
    const user = useAuthStore((state) => state.user);
    const token = useAuthStore((state) => state.accessToken);
    const initialized = useAuthStore((state) => state.initialized);

    if (!initialized) {
        return <div className="w-full py-10 text-center text-slate-500">Checking session...</div>;
    }

    if (!token || !user) {
        return <Navigate to="/login" />;
    }

    if (allowedRole && role !== allowedRole) {
        return <Navigate to="/login" />;
    }

    return children;
}

export default ProtectedRoute;