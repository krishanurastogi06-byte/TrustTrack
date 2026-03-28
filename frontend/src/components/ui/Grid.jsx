function Grid({ children, className = "" }) {
    return (
        <div className={`grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}>
            {children}
        </div>
    );
}

export default Grid;