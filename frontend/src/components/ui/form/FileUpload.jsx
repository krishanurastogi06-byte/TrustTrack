import React, { useRef, useState } from "react";

export default function FileUpload({ value, onChange, accept = "image/*,application/pdf", maxSize = 10 * 1024 * 1024, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files) {
    const f = files?.[0];
    if (!f) return;
    if (f.size > maxSize) {
      onChange && onChange(f, { error: "File too large" });
      return;
    }
    onChange && onChange(f);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={`w-full border-2 ${dragging ? "border-indigo-400 bg-indigo-50" : "border-dashed border-slate-200 bg-slate-50"} rounded-2xl p-5 text-center cursor-pointer transition-colors`}
      >
        {value ? (
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700">{value.name}</p>
            <p className="text-xs text-slate-500">{(value.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-bold text-slate-700">Click to upload or drag & drop</p>
            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error.message ?? error}</p>}
    </div>
  );
}
