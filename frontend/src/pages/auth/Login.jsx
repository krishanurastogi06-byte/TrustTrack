import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../../store/useAuthStore";
import authService from "../../services/authService";

function Login() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("donor");
    const [walletAddress, setWalletAddress] = useState("");
    const [mode, setMode] = useState("login");
    const [error, setError] = useState("");

    const loginMutation = useMutation({
        mutationFn: (payload) => authService.login(payload),
    });

    const registerMutation = useMutation({
        mutationFn: (payload) => authService.register(payload),
    });

    const submitting = loginMutation.isPending || registerMutation.isPending;

    const redirectByRole = (userRole) => {
        if (userRole === "admin") navigate("/admin");
        else if (userRole === "ngo") navigate("/ngo");
        else navigate("/donor");
    };

    const handleSubmit = async () => {
        setError("");

        if (!email || !password) {
            setError("Email and password are required.");
            return;
        }

        if (mode === "register" && password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        if (mode === "register" && role === "ngo") {
            const validWallet = /^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim());
            if (!validWallet) {
                setError("Valid NGO wallet address is required.");
                return;
            }
        }

        try {
            let response;
            if (mode === "register") {
                response = await registerMutation.mutateAsync({
                    email,
                    password,
                    role,
                    walletAddress: role === "ngo" ? walletAddress.trim() : undefined,
                    profile: { name: name || undefined },
                });
            } else {
                response = await loginMutation.mutateAsync({ email, password });
            }

            if (!response?.user || !response?.accessToken) {
                setError("Unexpected authentication response. Please try again.");
                return;
            }

            setAuth({
                user: response.user,
                accessToken: response.accessToken,
                refreshToken: response.refreshToken,
            });

            redirectByRole(response.user?.role);
        } catch (e) {
            setError(e?.message || "Authentication failed");
        }
    };

    return (
        <div className="flex min-h-screen bg-white font-sans text-slate-900">
            {/* Left Pane - Image/Branding */}
            <div className="hidden lg:flex flex-col justify-end w-1/2 bg-slate-900 relative overflow-hidden">
                <img 
                    src="https://www.sahaytacharitabletrust.org/3.jpg" 
                    alt="Charity and Support" 
                    className="absolute inset-0 w-full h-full object-cover opacity-[0.65] mix-blend-overlay"
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/20"></div>
                
                <div className="relative z-10 p-16 xl:p-24 text-white">
                    <h2 className="text-4xl xl:text-5xl font-extrabold mb-6 tracking-tight leading-tight">
                        Empowering change,<br/>tracking trust.
                    </h2>
                    <p className="text-lg text-slate-300 max-w-md font-medium leading-relaxed">
                        Join our platform to seamlessly connect NGOs and Donors with complete transparency and accountability.
                    </p>
                </div>
            </div>

            {/* Right Pane - Form */}
            <div className="flex flex-col justify-center w-full lg:w-1/2 p-8 md:p-16 lg:px-24 xl:px-32 relative bg-white">
                <div className="max-w-md w-full mx-auto">
                    {/* Logo & Welcome */}
                    <div className="mb-12 text-center lg:text-left">
                        <img 
                            src="/logo/horizontalLogo.svg" 
                            alt="TrustTrack Logo" 
                            className="h-10 mx-auto lg:mx-0 mb-8 object-contain" 
                        />
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                            {mode === "login" ? "Welcome back" : "Create your account"}
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">
                            {mode === "login" ? "Please enter your credentials to continue." : "Register to start using TrustTrack."}
                        </p>
                    </div>

                    <div className="mb-6 inline-flex bg-slate-100 rounded-xl p-1">
                        <button
                            type="button"
                            onClick={() => setMode("login")}
                            className={`px-4 py-2 text-sm font-bold rounded-lg ${mode === "login" ? "bg-white text-slate-800" : "text-slate-500"}`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("register")}
                            className={`px-4 py-2 text-sm font-bold rounded-lg ${mode === "register" ? "bg-white text-slate-800" : "text-slate-500"}`}
                        >
                            Register
                        </button>
                    </div>

                    <div className="space-y-5">
                        {mode === "register" && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    className="w-full border border-slate-200 bg-slate-50 px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-semibold placeholder:font-medium placeholder:text-slate-400"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                className="w-full border border-slate-200 bg-slate-50 px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-semibold placeholder:font-medium placeholder:text-slate-400"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full border border-slate-200 bg-slate-50 px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-semibold placeholder:font-medium placeholder:text-slate-400"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {mode === "register" && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full border border-slate-200 bg-slate-50 px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-semibold"
                                >
                                    <option value="donor">Donor</option>
                                    <option value="ngo">NGO</option>
                                </select>
                            </div>
                        )}

                        {mode === "register" && role === "ngo" && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">NGO Wallet Address</label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    className="w-full border border-slate-200 bg-slate-50 px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-semibold placeholder:font-medium placeholder:text-slate-400"
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                />
                            </div>
                        )}

                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 shadow-[0_8px_30px_-4px_rgba(79,70,229,0.3)] hover:shadow-[0_12px_40px_-4px_rgba(79,70,229,0.4)] transition-all duration-300 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 mt-6"
                        >
                            {submitting ? "Please wait..." : mode === "login" ? "Sign in to account" : "Create account"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;