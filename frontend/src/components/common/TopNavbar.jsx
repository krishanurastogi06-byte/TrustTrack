import { Search, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import NotificationDropdown from "./NotificationDropdown";
import { useEffect } from "react";
import socketService from "../../lib/socket";
import { useQueryClient } from "@tanstack/react-query";

function TopNavbar() {
    const user = useAuthStore((state) => state.user);
    const role = useAuthStore((state) => state.role);
    const queryClient = useQueryClient();

    useEffect(() => {
        // Connect to socket
        const socket = socketService.connect();

        if (socket) {
            // Listen for new notifications
            socketService.on("new_notification", (data) => {
                console.log("[socket] New notification received:", data);
                // Invalidate query to trigger refetch
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
            });
        }

        return () => {
            socketService.disconnect();
        };
    }, [queryClient]);

    const ngoStatus = user?.verificationStatus;
    const ngoTag = ngoStatus === "approved"
        ? "Verified"
        : ngoStatus === "rejected"
            ? "Rejected"
            : "Unverified";

    const ngoTagClass = ngoTag === "Verified"
        ? "bg-emerald-100 text-emerald-700"
        : ngoTag === "Rejected"
            ? "bg-rose-100 text-rose-700"
            : "bg-amber-100 text-amber-700";

    return (
        <header className="fixed top-0 left-0 right-0 h-20 bg-white z-[70] flex items-center justify-between px-4 md:px-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <img src="/logo/horizontalLogo.svg" alt="TrustTrack" className="h-8 md:h-9 object-contain" />
            </div>

            {/* Right Group */}
            <div className="flex items-center gap-4 md:gap-6">
                {/* Desktop Search Bar */}
                {/* <div className="hidden md:flex items-center bg-[#f0f2f5] rounded-full px-5 py-2.5 w-64 lg:w-96 border border-transparent focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white transition-all">
                    <Search size={18} className="text-slate-400 mr-2 shrink-0" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400 font-medium"
                    />
                </div> */}

                <NotificationDropdown />

                {/* Mobile Profile Icon */}
                <Link to={`/${role}/profile`} className="md:hidden w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0 overflow-hidden shadow-sm hover:ring-2 hover:ring-indigo-500/20 transition-all">
                    {user?.profile?.avatar ? <img src={user.profile.avatar} alt="Avatar" className="w-full h-full object-cover m-1" /> : <User size={22} />}
                </Link>

                {/* Desktop User Profile */}
                <Link to={`/${role}/profile`} className="hidden md:flex items-center gap-3 pl-2 group">
                    <div className="w-11 h-11 rounded-full bg-indigo-50 flex flex-col items-center justify-center text-indigo-600 border border-indigo-100 shrink-0 overflow-hidden shadow-sm group-hover:ring-2 group-hover:ring-indigo-500/20 transition-all">
                        {user?.profile?.avatar ? <img src={user.profile.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={22} />}
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="text-sm font-bold text-slate-800 leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">{user?.profile?.name || user?.email || "User"}</span>
                        {role === "ngo" ? (
                            <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 ${ngoTagClass}`}>
                                {ngoTag}
                            </span>
                        ) : (
                            <span className="text-xs text-slate-500 font-medium capitalize mt-0.5 tracking-wide group-hover:text-slate-700 transition-colors">{role || "Role"}</span>
                        )}
                    </div>
                </Link>

            </div>
        </header>
    );
}

export default TopNavbar;
