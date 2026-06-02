import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Check, Info, AlertTriangle, CheckCircle, Clock, X, Trash2 } from "lucide-react";
import { 
    useNotifications, 
    useMarkNotificationAsRead, 
    useMarkAllNotificationsAsRead,
    useDeleteNotification,
    useClearAllNotifications 
} from "../../hooks/useNotifications";
import { useAuthStore } from "../../store/useAuthStore";

// Native helper to avoid date-fns resolution issues
const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    
    // Only fetch if authenticated
    const initialized = useAuthStore(state => state.initialized);
    const userRole = useAuthStore((state) => state.role);
    const { data: notificationsData, isLoading } = useNotifications({ enabled: initialized && !!userRole });
    const markAsRead = useMarkNotificationAsRead();
    const markAllAsRead = useMarkAllNotificationsAsRead();
    const deleteNotification = useDeleteNotification();
    const clearAllNotifications = useClearAllNotifications();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!initialized || !userRole) return null;

    const unreadCount = notificationsData?.unreadCount || 0;
    const notifications = notificationsData?.data || [];

    const getIcon = (type) => {
        switch (type) {
            case "success": return <CheckCircle size={18} className="text-emerald-500" />;
            case "error": return <AlertTriangle size={18} className="text-red-500" />;
            case "warning": return <AlertTriangle size={18} className="text-amber-500" />;
            case "info":
            default: return <Info size={18} className="text-indigo-500" />;
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            markAsRead.mutate(notification._id);
        }
        setIsOpen(false);
        if (notification.link) {
            navigate(notification.link);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 bg-[#f0f2f5] rounded-full text-slate-500 hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-200 z-50 overflow-hidden transform origin-top-right transition-all duration-200">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 text-base">Notifications</h3>
                        <div className="flex items-center gap-3">
                            {notifications.length > 0 && (
                                <button 
                                    onClick={() => clearAllNotifications.mutate()}
                                    disabled={clearAllNotifications.isPending}
                                    className="text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors disabled:opacity-50"
                                    title="Clear all"
                                >
                                    <Trash2 size={14} /> Clear all
                                </button>
                            )}
                            {unreadCount > 0 && (
                                <button 
                                    onClick={() => markAllAsRead.mutate()}
                                    disabled={markAllAsRead.isPending}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors disabled:opacity-50"
                                >
                                    <Check size={14} /> Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto overflow-x-hidden">
                        {isLoading ? (
                            <div className="p-8 text-center text-slate-400">
                                <div className="animate-pulse flex flex-col items-center gap-3">
                                    <div className="h-10 w-10 bg-slate-100 rounded-full"></div>
                                    <div className="h-4 w-24 bg-slate-100 rounded"></div>
                                </div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center gap-3">
                                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-1">
                                    <Bell size={24} className="text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-medium text-sm">You have no notifications right now.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map((notif) => (
                                    <div 
                                        key={notif._id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`px-5 py-4 flex items-start gap-4 cursor-pointer transition-colors border-b border-slate-50 last:border-0 hover:bg-slate-50 ${
                                            !notif.isRead ? 'bg-indigo-50/30' : ''
                                        }`}
                                    >
                                        <div className={`mt-0.5 flex-shrink-0 flex items-center justify-center p-2 rounded-full ${
                                            notif.type === 'success' ? 'bg-emerald-50' : 
                                            notif.type === 'error' ? 'bg-red-50' : 
                                            notif.type === 'warning' ? 'bg-amber-50' : 'bg-indigo-50'
                                        }`}>
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm tracking-tight mb-1 ${!notif.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-slate-500 leading-relaxed break-words line-clamp-2">
                                                {notif.message}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium mt-2 flex items-center gap-1">
                                                <Clock size={10} /> 
                                                {formatTimeAgo(new Date(notif.createdAt))}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 self-stretch">
                                            {!notif.isRead && (
                                                <div className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0 mt-2"></div>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification.mutate(notif._id);
                                                }}
                                                className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                title="Delete"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationDropdown;
