import { useState, useLayoutEffect, useRef } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import {
    User, Mail, Phone, Building2, Shield, Lock, Wallet, ExternalLink, Camera,
    Save, Edit3, CheckCircle, AlertCircle, Activity, X, LayoutDashboard,
    Settings, ShieldCheck, Heart, ArrowUpRight, BarChart3, Globe, Loader2
} from "lucide-react";
import { gsap } from "gsap";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import FormInput from "../../components/ui/form/FormInput";
import FormTextarea from "../../components/ui/form/FormTextarea";
import Badge from "../../components/ui/Badge";
import { useNgoCampaigns } from "../../hooks/useCampaigns";
import authService from "../../services/authService";
import uploadService from "../../services/uploadService";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";

function Profile() {
    const { user, role, setUser } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Animation Refs
    const sidebarRef = useRef(null);
    const contentRef = useRef(null);
    const headerRef = useRef(null);
    const fileInputRef = useRef(null);

    // Form States
    const [profileData, setProfileData] = useState({
        name: user?.profile?.name || "",
        organizationName: user?.profile?.organizationName || "",
        phone: user?.profile?.phone || "",
        bio: user?.profile?.bio || "",
        avatar: user?.profile?.avatar || ""
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    // NGO Campaigns
    const { data: ngoCampaigns } = useNgoCampaigns(
        { ngoId: user?._id, perPage: 3 },
        { enabled: role === "ngo" && !!user?._id }
    );

    const campaigns = ngoCampaigns?.items || [];

    // Sync form with user data
    useLayoutEffect(() => {
        if (user?.profile) {
            setProfileData({
                name: user.profile.name || "",
                organizationName: user.profile.organizationName || "",
                phone: user.profile.phone || "",
                bio: user.profile.bio || "",
                avatar: user.profile.avatar || ""
            });
        }
    }, [user]);

    // Animations
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            // Guard against null refs and missing selectors to prevent console warnings
            if (headerRef.current) {
                gsap.from(headerRef.current, { y: -20, opacity: 0, duration: 0.6, delay: 0.2, ease: "power2.out" });
            }

            const staggerElements = document.querySelectorAll(".anim-stagger");
            if (staggerElements.length > 0) {
                gsap.from(staggerElements, {
                    y: 20,
                    opacity: 0,
                    duration: 0.5,
                    stagger: 0.1,
                    delay: 0.4,
                    ease: "power2.out"
                });
            }
        });
        return () => ctx.revert();
    }, []);

    // Effect to animate tab changes
    useLayoutEffect(() => {
        gsap.fromTo(contentRef.current,
            { opacity: 0, x: 10 },
            { opacity: 1, x: 0, duration: 0.4, ease: "power1.out" }
        );
    }, [activeTab]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        const loadingToast = toast.loading("Saving changes...");
        try {
            const result = await authService.updateProfile(profileData);
            if (result.user) setUser(result.user);
            setIsEditing(false);
            toast.success("Profile updated successfully!", { id: loadingToast });
        } catch (error) {
            toast.error(error.message || "Failed to update profile", { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Security check: file type and size
        if (!file.type.startsWith("image/")) {
            return toast.error("Please upload an image file");
        }
        if (file.size > 5 * 1024 * 1024) {
            return toast.error("File size must be less than 5MB");
        }

        setUploading(true);
        const loadToast = toast.loading("Uploading high-performance photo...");
        try {
            const result = await uploadService.uploadFile(file);
            const imageUrl = result.url || result.data?.url;

            if (imageUrl) {
                setProfileData({ ...profileData, avatar: imageUrl });
                toast.success("Photo ready! Click 'Sync Metadata' to save.", { id: loadToast });
            } else {
                throw new Error("Failed to get image URL");
            }
        } catch (error) {
            toast.error(error.message || "Upload failed", { id: loadToast });
        } finally {
            setUploading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return toast.error("New passwords do not match");
        }
        setLoading(true);
        const loadingToast = toast.loading("Updating password...");
        try {
            await authService.changePassword(passwordData.currentPassword, passwordData.newPassword);
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            toast.success("Password changed successfully!", { id: loadingToast });
        } catch (error) {
            toast.error(error.message || "Failed to change password", { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    // Navigation Items based on role visibility rules
    const navItems = [
        { id: "overview", label: "General Details", icon: User },
        { id: "security", label: "Security", icon: ShieldCheck },
        ...(role === "ngo" ? [{ id: "campaigns", label: "Campaigns", icon: Heart }] : []),
        ...(role === "ngo" || role === "donor" ? [{ id: "wallet", label: "Wallet", icon: Wallet }] : [])
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20 rounded-4xl overflow-hidden">
            {/* Responsive Header Background */}
            <div ref={headerRef} className="min-h-64 bg-indigo-900 relative overflow-hidden flex flex-col justify-end pt-12 pb-16">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 -right-24 w-64 h-64 bg-indigo-200 rounded-full blur-3xl"></div>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 text-center md:text-left">
                        {/* Avatar Container */}
                        <div className="relative group">
                            <div className="w-32 h-32 md:w-36 md:h-36 rounded-[2rem] md:rounded-[2.5rem] bg-white p-1 shadow-2xl transition-transform duration-500 group-hover:scale-105">
                                <div className="w-full h-full rounded-[1.8rem] md:rounded-[2.2rem] overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                                    {profileData.avatar ? (
                                        <img src={profileData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-slate-300">
                                            <User className="w-16 h-16 md:w-20 md:h-20" strokeWidth={1} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleAvatarClick}
                                disabled={uploading}
                                className="absolute -bottom-2 -right-2 p-2.5 md:p-3 bg-white text-indigo-600 rounded-2xl shadow-xl hover:bg-slate-50 hover:scale-110 active:scale-95 transition-all focus:ring-4 focus:ring-indigo-100 cursor-pointer border-none outline-none z-10"
                            >
                                {uploading ? <Loader2 size={18} className="animate-spin text-indigo-600" /> : <Camera size={18} />}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        {/* Name and Info */}
                        <div className="mb-2">
                            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 mb-2">
                                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight break-words">
                                    {role === "ngo" ? (profileData.organizationName || profileData.name) : (profileData.name || profileData.organizationName) || "Explorer"}
                                </h1>
                                <Badge label={role} type="secondary" className="bg-white/10 text-white border-white/10 uppercase" />
                            </div>
                            <p className="text-indigo-100/80 font-medium flex items-center justify-center md:justify-start gap-2 text-base md:text-lg">
                                <Mail size={18} className="opacity-70" /> {user?.email}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-8 relative z-20">
                {/* Pill Navigation - Fully Responsive */}
                <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-1.5 md:p-2 mb-8 md:mb-10 flex flex-wrap items-center justify-center md:justify-start gap-1.5 md:gap-2 max-w-fit mx-auto md:mx-0 premium-shadow border border-slate-100">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`nav-pill text-xs md:text-sm px-4 md:px-6 py-2 md:py-2.5 ${activeTab === item.id ? 'nav-pill-active' : 'nav-pill-inactive'}`}
                        >
                            <item.icon size={16} className="md:w-[18px] md:h-[18px]" />
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Content Section */}
                <div ref={contentRef} className="section-enter">
                    {activeTab === "overview" && (
                        <div className="space-y-6 md:space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                                {/* Details Card */}
                                <Card className="lg:col-span-2 p-6 md:p-10 !rounded-[2rem] md:!rounded-[2.5rem] border-slate-100/80 anim-stagger">
                                    <div className="flex items-center justify-between mb-8 md:mb-10">
                                        <div>
                                            <h2 className="text-xl md:text-2xl font-black text-slate-800">Operational Integrity</h2>
                                            <p className="text-[10px] md:text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Registry Profile</p>
                                        </div>
                                        <button
                                            onClick={() => setIsEditing(!isEditing)}
                                            className="p-2.5 md:p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl md:rounded-2xl transition-all"
                                        >
                                            {isEditing ? <X size={20} /> : <Edit3 size={20} />}
                                        </button>
                                    </div>

                                    <form onSubmit={handleProfileUpdate} className="space-y-6 md:space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                            <FormInput
                                                label={role === "ngo" ? "Executive Owner" : "Display Name"}
                                                disabled={!isEditing}
                                                value={profileData.name}
                                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                                icon={<User size={18} />}
                                                className="input-focus"
                                            />
                                            <FormInput
                                                label="Contact Phone"
                                                disabled={!isEditing}
                                                value={profileData.phone}
                                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                                icon={<Phone size={18} />}
                                                className="input-focus"
                                            />
                                            {role === "ngo" && (
                                                <div className="md:col-span-2">
                                                    <FormInput
                                                        label="Organization Entity Name"
                                                        disabled={!isEditing}
                                                        value={profileData.organizationName}
                                                        onChange={(e) => setProfileData({ ...profileData, organizationName: e.target.value })}
                                                        icon={<Building2 size={18} />}
                                                        className="input-focus"
                                                    />
                                                </div>
                                            )}
                                            <div className="md:col-span-2">
                                                <FormTextarea
                                                    label="Core Mission / Vision"
                                                    disabled={!isEditing}
                                                    value={profileData.bio}
                                                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                                    rows={4}
                                                    className="input-focus"
                                                />
                                            </div>
                                        </div>

                                        {isEditing && (
                                            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t border-slate-50">
                                                <Button type="secondary" onClick={() => setIsEditing(false)} className="!rounded-xl md:!rounded-2xl px-6 md:px-10 w-full sm:w-auto">
                                                    Discard
                                                </Button>
                                                <Button type="primary" loading={loading} className="!rounded-xl md:!rounded-2xl px-6 md:px-10 w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600">
                                                    <Save size={18} /> Sync Metadata
                                                </Button>
                                            </div>
                                        )}
                                    </form>
                                </Card>

                                {/* Side Stats Card */}
                                <div className="space-y-6">
                                    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center">
                                        <div className="w-14 h-14 md:w-16 md:h-16 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4">
                                            <ShieldCheck size={28} className="md:w-8 md:h-8" />
                                        </div>
                                        <h3 className="text-base md:text-lg font-black text-slate-800">System Standing</h3>
                                        <p className="text-[10px] md:text-xs text-slate-400 font-medium mb-6">Network verification status across nodes.</p>
                                        <div className="w-full h-1.5 bg-slate-50 rounded-full mb-6 overflow-hidden">
                                            <div className="w-[85%] h-full bg-indigo-500 rounded-full"></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 md:gap-4 w-full">
                                            <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl">
                                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase">Impact</p>
                                                <p className="text-base md:text-lg font-bold text-slate-800">8.4k</p>
                                            </div>
                                            <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl">
                                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase">Trust</p>
                                                <p className="text-base md:text-lg font-bold text-emerald-600">High</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-slate-900/10 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                            <Globe size={80} strokeWidth={1} className="text-white md:w-24 md:h-24" />
                                        </div>
                                        <h3 className="text-base md:text-lg font-bold text-white mb-2 relative z-10">Network Hub</h3>
                                        <p className="text-slate-400 text-xs md:text-sm mb-8 relative z-10">Connected to Mainnet-1X via encrypted protocols.</p>
                                        <Link to="/help" className="text-white text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all relative z-10">
                                            Inquiry Logs <ArrowUpRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "security" && (
                        <div className="max-w-4xl mx-auto">
                            <Card className="p-6 md:p-10 !rounded-[2rem] md:!rounded-[2.5rem] border-slate-100/80">
                                <div className="flex items-center gap-4 md:gap-5 mb-10 md:mb-12">
                                    <div className="p-3 md:p-4 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl">
                                        <Lock size={28} className="md:w-8 md:h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-black text-slate-800">Security Protocols</h2>
                                        <p className="text-xs md:text-sm text-slate-400 font-medium">Update authentication credentials and access layers.</p>
                                    </div>
                                </div>

                                <form onSubmit={handlePasswordUpdate} className="space-y-6 md:space-y-8">
                                    <FormInput
                                        type="password"
                                        label="Verify Current Protocol"
                                        placeholder="Current Password"
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        icon={<Shield size={18} />}
                                        className="input-focus"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                        <FormInput
                                            type="password"
                                            label="Establish New Secret"
                                            placeholder="Secure Key"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            icon={<Lock size={18} />}
                                            className="input-focus"
                                        />
                                        <FormInput
                                            type="password"
                                            label="Confirm Secret Matrix"
                                            placeholder="Re-type Secure Key"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            icon={<CheckCircle size={18} />}
                                            className="input-focus"
                                        />
                                    </div>
                                    <div className="flex justify-end pt-8 border-t border-slate-50">
                                        <Button type="primary" loading={loading} className="!rounded-xl md:!rounded-2xl px-8 md:px-12 w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 border-none">
                                            <Save size={18} /> Deploy Security Update
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </div>
                    )}

                    {activeTab === "campaigns" && role === "ngo" && (
                        <div className="space-y-6 md:space-y-8">
                            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4 mb-4 text-center md:text-left">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Active Campaigns</h2>
                                    <p className="text-[10px] md:text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time Campaign Oversight</p>
                                </div>
                                <Link to="/ngo/create" className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                                    Launch New Mission <ArrowUpRight size={16} />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                {campaigns.length > 0 ? (
                                    campaigns.map((camp) => (
                                        <Card key={camp._id} className="p-0 overflow-hidden !rounded-[2rem] md:!rounded-[2.5rem] border-slate-100 group h-full flex flex-col">
                                            <div className="h-44 md:h-52 bg-slate-100 overflow-hidden relative">
                                                {camp.coverImage ? (
                                                    <img src={camp.coverImage} alt={camp.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                        <Heart size={64} md:size={80} strokeWidth={1} />
                                                    </div>
                                                )}
                                                <div className="absolute top-4 right-4 md:top-5 md:right-5">
                                                    <Badge label={camp.status} type={camp.status === "published" ? "success" : "warning"} className="shadow-lg scale-90 md:scale-100" />
                                                </div>
                                            </div>
                                            <div className="p-6 md:p-8 flex-1 flex flex-col">
                                                <h4 className="font-bold text-slate-800 text-lg md:text-xl mb-2 md:mb-3 line-clamp-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{camp.title}</h4>
                                                <p className="text-xs md:text-sm text-slate-500 font-medium mb-6 md:mb-8 line-clamp-2 md:line-clamp-3 leading-relaxed">{camp.description}</p>
                                                <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Allocation</span>
                                                        <span className="text-indigo-600 font-black text-base md:text-lg">
                                                            {Number(camp.fundingGoalETH).toFixed(3)} ETH
                                                        </span>
                                                    </div>
                                                    <Link to={`/ngo/campaigns/${camp._id || camp.id}/progress`} className="p-2 md:p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg md:rounded-xl transition-all">
                                                        <ArrowUpRight size={18} md:size={20} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="md:col-span-3 py-20 md:py-32 text-center bg-white rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-slate-100 shadow-sm px-6">
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-6">
                                            <Activity size={32} className="md:w-10 md:h-10" />
                                        </div>
                                        <h3 className="text-lg md:text-xl font-black text-slate-800 mb-2">No Active Campaigns</h3>
                                        <p className="text-xs md:text-sm text-slate-400 font-medium mb-8 max-w-xs mx-auto">Initiate a blockchain-verified campaign to start generating social impact.</p>
                                        <Button type="primary" className="!rounded-xl md:!rounded-2xl px-10 md:px-12 bg-indigo-600">Initialize First Mission</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "wallet" && (role === "ngo" || role === "donor") && (
                        <div className="space-y-6 md:space-y-8">
                            <div className="mb-4 text-center md:text-left">
                                <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Financial Matrix</h2>
                                <p className="text-[10px] md:text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Blockchain Hub & Fund Custody</p>
                            </div>

                            <Card className="p-6 md:p-10 !bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 !rounded-[2rem] md:!rounded-[3rem] relative overflow-hidden group premium-shadow border-none text-white">
                                <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-indigo-500/5 to-transparent"></div>
                                <div className="absolute -top-20 -right-20 w-64 h-64 md:w-80 md:h-80 bg-indigo-600/10 rounded-full blur-[80px] md:blur-[100px]"></div>

                                <div className="relative z-10">
                                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-5 mb-10 md:mb-14 text-center md:text-left">
                                        <div className="p-3 md:p-4 bg-white/5 text-indigo-400 rounded-xl md:rounded-2xl border border-white/10">
                                            <Wallet size={32} className="md:w-9 md:h-9" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl md:text-2xl font-black text-white">TrustTrack Web3 Node</h3>
                                            <p className="text-xs md:text-sm text-slate-400 font-medium">Your cryptographic fingerprint on the network.</p>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 rounded-xl md:rounded-2xl p-6 md:p-10 border border-white/10 mb-10 group hover:bg-white/[0.07] transition-all text-center md:text-left">
                                        <p className="text-[8px] md:text-[10px] uppercase font-black tracking-[0.2em] md:tracking-[0.3em] text-slate-500 mb-4 md:mb-6">Verified Public Key (EVM)</p>
                                        <div className="flex items-center justify-center md:justify-start gap-4">
                                            <code className="text-lg sm:text-xl md:text-3xl font-mono break-all text-indigo-300 tracking-tighter">
                                                {user?.walletAddress || "0x000...0000"}
                                            </code>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                        <button className="flex items-center justify-center gap-3 px-6 md:px-8 py-4 md:py-5 bg-white text-slate-900 font-black text-xs md:text-sm uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 shadow-lg border-none outline-none">
                                            <ExternalLink size={18} md:size={20} /> Etherscan Registry
                                        </button>
                                        <Link to={`/${role}/wallet`} className="flex items-center justify-center gap-3 px-6 md:px-8 py-4 md:py-5 bg-white/5 text-white font-black text-xs md:text-sm uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-white/10 transition-all border border-white/10 active:scale-95 outline-none">
                                            <Settings size={18} md:size={20} /> Advanced Config
                                        </Link>
                                    </div>
                                </div>
                            </Card>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
                                {[
                                    { label: "Liquid Balance", val: "2.40 ETH", icon: <ArrowUpRight className="text-emerald-500" /> },
                                    { label: "Escrowed Funds", val: "0.00 ETH", icon: <Lock className="text-indigo-500" /> },
                                    { label: "TX Success Rate", val: "99.2%", icon: <ShieldCheck className="text-violet-500" /> }
                                ].map((stat, i) => (
                                    <div key={i} className="p-6 md:p-8 bg-white border border-slate-100 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/20 group hover:border-indigo-100 transition-all text-center sm:text-left">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                            <div className="p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">
                                                {stat.icon}
                                            </div>
                                        </div>
                                        <h5 className="text-xl md:text-2xl font-black text-slate-900">{stat.val}</h5>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Profile;
