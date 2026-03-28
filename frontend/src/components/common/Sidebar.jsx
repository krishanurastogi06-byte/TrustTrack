import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Menu, MoreHorizontal, LogOut, X, User } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

function Sidebar({ links }) {
    const [showMore, setShowMore] = useState(false);
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const location = useLocation();

    // Context for rendering user details in the glassmorphic mobile drawer
    const user = useAuthStore((state) => state.user);
    const role = useAuthStore((state) => state.role);

    useEffect(() => {
        setShowMore(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const visibleLinks = links.slice(0, 4);
    const moreLinks = links.slice(4);

    return (
        <>
            <div className="hidden md:block relative w-[104px] shrink-0 z-[60]">
                <aside className="fixed flex flex-col h-[90vh] group w-20 hover:w-[15rem] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100">

                    <div className="h-6 shrink-0"></div>

                    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 space-y-2.5 no-scrollbar pb-6">
                        {links.map((link, index) => (
                            <NavLink
                                key={index}
                                to={link.path}
                                end
                                className={({ isActive }) =>
                                    `flex items-center gap-4 px-3.5 py-3.5 rounded-lg transition-all duration-200 whitespace-nowrap outline-none ${isActive
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                                        : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50 font-semibold focus-visible:bg-slate-50"
                                    }`
                                }
                                title={link.label}
                            >
                                <link.icon size={22} className="shrink-0" strokeWidth={2.5} />
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 tracking-wide text-sm font-bold">
                                    {link.label}
                                </span>
                            </NavLink>
                        ))}
                    </nav>

                    <div className="px-3.5 mt-auto shrink-0 pb-6 border-t border-slate-50 pt-6">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-4 px-3.5 py-3.5 rounded-2xl text-rose-500 hover:text-white hover:bg-rose-500 shadow-sm transition-all duration-200 whitespace-nowrap font-bold bg-rose-50 outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                        >
                            <LogOut size={22} className="shrink-0" strokeWidth={2.5} />
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 tracking-wide text-[15px]">
                                Logout
                            </span>
                        </button>
                    </div>
                </aside>
            </div>

            <nav className="md:hidden fixed bottom-0 w-full bg-white border border-slate-100 z-[60] flex items-center justify-around px-2 py-3 shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)]">
                {visibleLinks.map((link, index) => (
                    <NavLink
                        key={index}
                        to={link.path}
                        end
                        className={({ isActive }) => `flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 outline-none ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' : 'bg-[#f0f2f5] text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-transparent'}`}
                    >
                        {({ isActive }) => (
                            <link.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        )}
                    </NavLink>
                ))}

                <button
                    onClick={() => setShowMore(true)}
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 outline-none hover:text-slate-600 hover:bg-slate-100 border border-transparent ${showMore ? 'scale-105 bg-indigo-100 text-indigo-600' : 'bg-[#f0f2f5] text-slate-400 '}`}
                >
                    <MoreHorizontal size={22} strokeWidth={2.5} />
                </button>
            </nav>

            {/* --- MOBILE MORE MENU OVERLAY (GLASSMORPHIC) --- */}
            {showMore && (
                <div
                    className="md:hidden fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm flex justify-center items-end"
                    onClick={() => setShowMore(false)}
                >
                    <div
                        className="w-[95%] bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_-20px_50px_-10px_rgba(0,0,0,0.3)] rounded-xl p-6 mb-24 animate-in slide-in-from-bottom-8 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-6 pb-6 border-b border-indigo-500/10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border border-white shrink-0 overflow-hidden shadow-sm">
                                    {user?.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={28} />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-slate-800 tracking-tight leading-tight">{user?.name || "User_Name"}</span>
                                    <span className="text-[13px] font-bold text-slate-400 uppercase tracking-wide">{role || "Role"}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowMore(false)} className="bg-white/50 hover:bg-white rounded-full p-2 text-slate-400 hover:text-slate-800 transition-colors">
                                <X size={20} className="shrink-0" />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar">
                            {/* Generic notifications or extra links */}
                            {moreLinks.map((link, index) => (
                                <NavLink
                                    key={index}
                                    to={link.path}
                                    end
                                    onClick={() => setShowMore(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-4 p-4 rounded-lg transition-all duration-200 border border-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] ${isActive
                                            ? 'text-indigo-600 bg-indigo-50 font-bold border-indigo-100'
                                            : 'text-slate-600 bg-white/80 hover:bg-white font-bold'
                                        }`
                                    }
                                >
                                    <link.icon size={22} strokeWidth={2.5} />
                                    <span>{link.label}</span>
                                </NavLink>
                            ))}

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-4 p-4 rounded-lg text-rose-500 hover:text-white hover:bg-rose-500 border border-white hover:border-transparent bg-white/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-200 mt-6 font-bold"
                            >
                                <LogOut size={22} strokeWidth={2.5} />
                                <span className="text-left w-full tracking-wide">Logout Account</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Sidebar;