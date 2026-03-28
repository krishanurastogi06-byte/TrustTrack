import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Route-level code splitting using React.lazy
const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const NgoLayout = lazy(() => import("../layouts/NgoLayout"));
const DonorLayout = lazy(() => import("../layouts/DonorLayout"));
const Login = lazy(() => import("../pages/auth/Login"));

function RouteFallback() {
    return (
        <div className="w-full py-12 text-center">
            <div className="inline-block px-4 py-2 bg-white rounded shadow text-sm text-slate-600">Loading...</div>
        </div>
    );
}

function AppRoutes() {
    return (
        <Suspense fallback={<RouteFallback />}>
            <Routes>
            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" />} />

            {/* Role Based Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin/*" element={<AdminLayout />} />
            <Route path="/ngo/*" element={<NgoLayout />} />
            <Route path="/donor/*" element={<DonorLayout />} />

            {/* Fallback */}
            <Route path="*" element={<h1>404 Not Found</h1>} />
            </Routes>
        </Suspense>
    );
}

export default AppRoutes;