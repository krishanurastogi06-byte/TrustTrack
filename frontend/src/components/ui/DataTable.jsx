import React, { useMemo, useState, useEffect } from "react";
import { ChevronUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import useDebounce from "../../utils/useDebounce";

/**
 * DataTable
 * Props:
 * - columns: [{ header, accessor, sortable=true, filterable=true, render?(row) }]
 * - data: array (for client-side mode)
 * - fetchData: async ({ pageIndex, pageSize, sortBy, filters, search }) => { items, total }
 * - initialState: { pageIndex, pageSize }
 * - pageSizeOptions: [10,20,50]
 *
 * Supports client-side and server-side modes (server when fetchData provided).
 */
export default function DataTable({
  columns = [],
  data = [],
  fetchData = null,
  initialState = { pageIndex: 0, pageSize: 10 },
  pageSizeOptions = [10, 20, 50],
  className = "",
}) {
  const [pageIndex, setPageIndex] = useState(initialState.pageIndex || 0);
  const [pageSize, setPageSize] = useState(initialState.pageSize || 10);
  const [sortBy, setSortBy] = useState({ key: null, direction: null });
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [serverItems, setServerItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isServer = typeof fetchData === "function";

  useEffect(() => {
    setPageIndex(0);
  }, [pageSize, debouncedSearch]);

  useEffect(() => {
    if (!isServer) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchData({ pageIndex, pageSize, sortBy, filters, search: debouncedSearch })
      .then((res) => {
        if (!mounted) return;
        setServerItems(res.items || []);
        setTotal(typeof res.total === "number" ? res.total : (res.items || []).length);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err);
      })
      .finally(() => mounted && setLoading(false));

    return () => (mounted = false);
  }, [fetchData, pageIndex, pageSize, sortBy, filters, debouncedSearch, isServer]);

  const clientProcessed = useMemo(() => {
    if (isServer) return serverItems;
    let items = Array.isArray(data) ? data.slice() : [];

    // column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value == null || value === "") return;
      items = items.filter((r) => String(getValue(r, key)).toLowerCase().includes(String(value).toLowerCase()));
    });

    // global search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter((r) => columns.some((c) => String(getValue(r, c.accessor) ?? "").toLowerCase().includes(q)));
    }

    // sorting
    if (sortBy.key) {
      const key = sortBy.key;
      const dir = sortBy.direction === "asc" ? 1 : -1;
      items.sort((a, b) => {
        const A = getValue(a, key);
        const B = getValue(b, key);
        if (A == null && B == null) return 0;
        if (A == null) return -1 * dir;
        if (B == null) return 1 * dir;
        if (typeof A === "number" && typeof B === "number") return (A - B) * dir;
        return String(A).localeCompare(String(B)) * dir;
      });
    }

    setTotal(items.length);

    // pagination
    const start = pageIndex * pageSize;
    const paged = items.slice(start, start + pageSize);
    return paged;
  }, [data, serverItems, isServer, debouncedSearch, filters, sortBy, pageIndex, pageSize, columns]);

  const items = isServer ? serverItems : clientProcessed;

  function getValue(row, accessor) {
    if (!accessor) return undefined;
    if (typeof accessor === "function") return accessor(row);
    return row[accessor];
  }

  function toggleSort(accessor) {
    setPageIndex(0);
    setSortBy((s) => {
      if (s.key !== accessor) return { key: accessor, direction: "asc" };
      if (s.direction === "asc") return { key: accessor, direction: "desc" };
      return { key: null, direction: null };
    });
  }

  function setFilter(accessor, value) {
    setPageIndex(0);
    setFilters((f) => ({ ...f, [accessor]: value }));
  }

  const pageCount = Math.max(1, Math.ceil((isServer ? total : total) / pageSize));

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              aria-label="Search table"
              className="border border-slate-200 rounded-lg px-3 py-2 w-60"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">Rows per page</div>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border rounded px-2 py-1">
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full overflow-x-auto border rounded-lg">
        <table className="w-full table-auto text-left">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-4 py-3 text-sm font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => col.sortable !== false && toggleSort(col.accessor)} className="flex items-center gap-2">
                      <span>{col.header}</span>
                      {col.sortable !== false && <ChevronUpDown size={16} className="text-slate-400" />}
                    </button>
                  </div>
                  {col.filterable !== false && (
                    <div className="mt-2">
                      <input
                        placeholder={`Filter ${col.header}`}
                        value={filters[col.accessor] || ""}
                        onChange={(e) => setFilter(col.accessor, e.target.value)}
                        className="w-full border border-slate-100 px-2 py-1 text-xs rounded"
                      />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-slate-500">Loading…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-red-600">Error: {String(error.message || error)}</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-6 text-center text-slate-400">No records found.</td>
              </tr>
            ) : (
              items.map((row, ri) => (
                <tr key={ri} className="hover:bg-slate-50">
                  {columns.map((col, ci) => (
                    <td key={ci} className="px-4 py-3 text-sm text-slate-700">
                      {col.render ? col.render(row) : String(getValue(row, col.accessor) ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-slate-500">Showing {(pageIndex * pageSize) + 1} - {Math.min((pageIndex + 1) * pageSize, isServer ? total : total)} of {isServer ? total : total}</div>

        <div className="flex items-center gap-2">
          <button onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={pageIndex === 0} className="p-2 rounded disabled:opacity-50">
            <ChevronLeft />
          </button>
          <div className="text-sm">Page {pageIndex + 1} of {pageCount}</div>
          <button onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} disabled={pageIndex >= pageCount - 1} className="p-2 rounded disabled:opacity-50">
            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}

// small helper
function getValue(row, accessor) {
  if (!accessor) return undefined;
  if (typeof accessor === "function") return accessor(row);
  return row[accessor];
}
