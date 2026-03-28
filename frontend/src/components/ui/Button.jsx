function Button({ label, type = "primary", onClick, className = "", disabled = false, children }) {
    const styles = {
        primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_16px_-4px_rgba(79,70,229,0.4)] active:scale-[0.98]",
        secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-[0.98]",
        outline: "bg-transparent border-2 border-slate-200 hover:border-slate-300 text-slate-600 active:scale-[0.98]",
        success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_16px_-4px_rgba(5,150,105,0.4)] active:scale-[0.98]",
        danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-[0_4px_16px_-4px_rgba(225,29,72,0.4)] active:scale-[0.98]",
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none ${styles[type]} ${className}`}
        >
            {children || label}
        </button>
    );
}

export default Button;