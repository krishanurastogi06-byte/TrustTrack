function Card({ children, className = "" }) {
    return (
        <div className={`bg-white rounded-[1.5rem] p-6 lg:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 ${className}`}>
            {children}
        </div>
    );
}

export default Card;