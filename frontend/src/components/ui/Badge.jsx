function Badge({ label, type = "default", className = "" }) {
    const styles = {
        default: "bg-slate-100 text-slate-600",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-700",
        danger: "bg-rose-100 text-rose-700",
        indigo: "bg-indigo-100 text-indigo-700",
    };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${styles[type]} ${className}`}
        >
            {label}
        </span>
    );
}

export default Badge;