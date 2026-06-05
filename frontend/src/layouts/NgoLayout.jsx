import { Routes, Route } from "react-router-dom";
import TopNavbar from "../components/common/TopNavbar";
import Sidebar from "../components/common/Sidebar";
import { ngoLinks } from "../utils/navigation";
import ProtectedRoute from "../routes/ProtectedRoute";

import NgoDashboard from "../pages/ngo/NgoDashboard";
import Campaigns from "../pages/ngo/Campaigns";
import CreateCampaign from "../pages/ngo/CreateCampaign";
import EditCampaign from "../pages/ngo/EditCampaign";
import CampaignProgress from "../pages/ngo/CampaignProgress";
import SubmitProof from "../pages/ngo/SubmitProof";
import FundRequests from "../pages/ngo/FundRequests";
import NgoAnalytics from "../pages/ngo/NgoAnalytics";
import Wallet from "../pages/ngo/Wallet";
import Profile from "../pages/common/Profile";

function NgoLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-[#f0f2f5] font-sans text-slate-900">
            <TopNavbar />

            <div className="flex flex-1 pt-20 relative">
                <Sidebar links={ngoLinks} />

                <main className="flex-1 p-4 md:p-8 pb-32 md:pb-8 w-full overflow-x-hidden">
                    <Routes>
                        <Route path="/" element={<ProtectedRoute allowedRole="ngo"><NgoDashboard /></ProtectedRoute>} />
                        <Route path="/campaigns" element={<ProtectedRoute allowedRole="ngo"><Campaigns /></ProtectedRoute>} />
                        <Route path="/campaigns/:id/edit" element={<ProtectedRoute allowedRole="ngo"><EditCampaign /></ProtectedRoute>} />
                        <Route path="/campaigns/:id/progress" element={<ProtectedRoute allowedRole="ngo"><CampaignProgress /></ProtectedRoute>} />
                        <Route path="/create" element={<ProtectedRoute allowedRole="ngo"><CreateCampaign /></ProtectedRoute>} />
                        <Route path="/proof" element={<ProtectedRoute allowedRole="ngo"><SubmitProof /></ProtectedRoute>} />
                        <Route path="/requests" element={<ProtectedRoute allowedRole="ngo"><FundRequests /></ProtectedRoute>} />
                        <Route path="/wallet" element={<ProtectedRoute allowedRole="ngo"><Wallet /></ProtectedRoute>} />
                        <Route path="/analytics" element={<ProtectedRoute allowedRole="ngo"><NgoAnalytics /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute allowedRole="ngo"><Profile /></ProtectedRoute>} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export default NgoLayout;