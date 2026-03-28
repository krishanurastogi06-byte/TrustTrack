function Table({ headers, data, className = "" }) {
    return (
        <div className={`w-full overflow-x-auto ${className}`}>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-100">
                        {headers.map((head, i) => (
                            <th key={i} className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                {head}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                    {data.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 transition-colors duration-150 group">
                            {row.map((cell, j) => (
                                <td key={j} className="px-5 py-5 text-sm text-slate-700 font-medium whitespace-nowrap">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {(!data || data.length === 0) && (
                        <tr>
                            <td colSpan={headers.length} className="px-5 py-8 text-center text-slate-400 font-medium text-sm">
                                No records found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default Table;