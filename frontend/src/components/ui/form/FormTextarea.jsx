import React from "react";

export default function FormTextarea({ label, id, register, error, rows = 4, ...rest }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      {label && (
        <label htmlFor={id} className="text-sm font-bold text-slate-700 ml-1">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        {...(register ? register(id) : {})}
        {...rest}
        aria-invalid={error ? "true" : "false"}
        className={`w-full border ${
          error ? "border-red-400 focus:ring-red-500/10" : "border-slate-200 focus:ring-indigo-500/10"
        } bg-white px-4 py-3.5 rounded-2xl focus:outline-none focus:ring-4 focus:border-indigo-600 transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 resize-none leading-relaxed ${rest.className || ""}`}
      />
      {error && <p className="text-xs text-red-600 mt-1 ml-1 font-medium">{error.message}</p>}
    </div>
  );
}
