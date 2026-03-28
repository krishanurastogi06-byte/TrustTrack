import React from "react";

export default function FormInput({ label, id, register, registerOptions, type = "text", error, ...rest }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        {...(register ? register(id, registerOptions) : {})}
        aria-invalid={error ? "true" : "false"}
        className={`w-full border ${error ? "border-red-400" : "border-slate-200"} bg-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700`}
        {...rest}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error.message}</p>}
    </div>
  );
}
