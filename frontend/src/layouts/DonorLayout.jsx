import { Routes, Route } from "react-router-dom";
import TopNavbar from "../components/common/TopNavbar";
import Sidebar from "../components/common/Sidebar";
import { donorLinks } from "../utils/navigation";
import ProtectedRoute from "../routes/ProtectedRoute";

import DonorDashboard from "../pages/donor/DonorDashboard";
import ExploreCampaigns from "../pages/donor/ExploreCampaigns";
import CampaignDetails from "../pages/donor/CampaignDetails";
import MyDonations from "../pages/donor/MyDonations";
import TransactionHistory from "../pages/donor/TransactionHistory";
import Wallet from "../pages/donor/Wallet";

function DonorLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-[#f0f2f5] font-sans text-slate-900">
            <TopNavbar />

            <div className="flex flex-1 pt-20 relative">
                <Sidebar links={donorLinks} />

                <main className="flex-1 p-4 md:p-8 pb-32 md:pb-8 w-full overflow-x-hidden">
                    <Routes>
                        <Route path="/" element={<ProtectedRoute allowedRole="donor"><DonorDashboard /></ProtectedRoute>} />
                        <Route path="/explore" element={<ProtectedRoute allowedRole="donor"><ExploreCampaigns /></ProtectedRoute>} />
                        <Route path="/campaign/:id" element={<ProtectedRoute allowedRole="donor"><CampaignDetails /></ProtectedRoute>} />
                        <Route path="/donations" element={<ProtectedRoute allowedRole="donor"><MyDonations /></ProtectedRoute>} />
                        <Route path="/transactions" element={<ProtectedRoute allowedRole="donor"><TransactionHistory /></ProtectedRoute>} />
                        <Route path="/wallet" element={<ProtectedRoute allowedRole="donor"><Wallet /></ProtectedRoute>} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export default DonorLayout;