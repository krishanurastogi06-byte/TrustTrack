import React from "react";

export default function FormTextarea({ label, id, register, error, rows = 4, ...rest }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-bold text-slate-700">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        {...(register ? register(id) : {})}
        {...rest}
        aria-invalid={error ? "true" : "false"}
        className={`w-full border ${error ? "border-red-400" : "border-slate-200"} bg-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 resize-none`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error.message}</p>}
    </div>
  );
}
