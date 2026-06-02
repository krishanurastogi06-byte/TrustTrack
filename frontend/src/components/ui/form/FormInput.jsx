import React from "react";

export default function FormInput({ label, id, register, registerOptions, type = "text", error, icon, ...rest }) {
  return (
    <div className="space-y-1.5 flex flex-col">
      {label && (
        <label htmlFor={id} className="text-sm font-bold text-slate-700 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors duration-200">
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          {...(register ? register(id, registerOptions) : {})}
          {...rest}
          aria-invalid={error ? "true" : "false"}
          className={`w-full border ${
            error ? "border-red-400 focus:ring-red-500/10" : "border-slate-200 focus:ring-indigo-500/10"
          } bg-white ${
            icon ? "pl-11" : "px-4"
          } py-3.5 rounded-2xl focus:outline-none focus:ring-4 focus:border-indigo-600 transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 ${rest.className || ""}`}
        />
      </div>
      {error && <p className="text-xs text-red-600 mt-1 ml-1 font-medium">{error.message}</p>}
    </div>
  );
}
