import { Routes, Route } from "react-router-dom";
import TopNavbar from "../components/common/TopNavbar";
import Sidebar from "../components/common/Sidebar";
import { adminLinks } from "../utils/navigation";
import ProtectedRoute from "../routes/ProtectedRoute";

import AdminDashboard from "../pages/admin/AdminDashboard";
import NgoVerification from "../pages/admin/NgoVerification";
import VerifiedNgos from "../pages/admin/VerifiedNgos";
import NgoCampaignDetails from "../pages/admin/NgoCampaignDetails";
import CampaignMonitoring from "../pages/admin/CampaignMonitoring";
import ProofVerification from "../pages/admin/ProofVerification";
import AuditLogs from "../pages/admin/AuditLogs";
import Profile from "../pages/common/Profile";

function AdminLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-[#f0f2f5] font-sans text-slate-900">
            <TopNavbar />

            <div className="flex flex-1 pt-20">
                <Sidebar links={adminLinks} />

                <main className="flex-1 p-4 md:p-8 pb-32 md:pb-8 w-full overflow-x-hidden">
                    <Routes>
                        <Route path="/" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
                        <Route path="/ngos" element={<ProtectedRoute allowedRole="admin"><NgoVerification /></ProtectedRoute>} />
                        <Route path="/verified-ngos" element={<ProtectedRoute allowedRole="admin"><VerifiedNgos /></ProtectedRoute>} />
                        <Route path="/verified-ngos/:id" element={<ProtectedRoute allowedRole="admin"><NgoCampaignDetails /></ProtectedRoute>} />
                        <Route path="/campaigns" element={<ProtectedRoute allowedRole="admin"><CampaignMonitoring /></ProtectedRoute>} />
                        <Route path="/proofs" element={<ProtectedRoute allowedRole="admin"><ProofVerification /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute allowedRole="admin"><Profile /></ProtectedRoute>} />
                        {/* <Route path="/logs" element={<ProtectedRoute allowedRole="admin"><AuditLogs /></ProtectedRoute>} /> */}
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export default AdminLayout;