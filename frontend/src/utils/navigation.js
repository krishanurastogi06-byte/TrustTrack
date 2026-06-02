import { LayoutDashboard, Folder, Upload, Users, BarChart, ShieldCheck, FileText, PlusCircle, Search, Heart, CreditCard, Wallet, BadgeCheck } from "lucide-react";

// DONOR
export const donorLinks = [
    { label: "Dashboard", path: "/donor", icon: LayoutDashboard },
    { label: "Explore", path: "/donor/explore", icon: Search },
    { label: "My Donations", path: "/donor/donations", icon: Heart },
    { label: "Transactions", path: "/donor/transactions", icon: CreditCard },
    { label: "Wallet", path: "/donor/wallet", icon: Wallet },
];

// NGO
export const ngoLinks = [
    { label: "Dashboard", path: "/ngo", icon: LayoutDashboard },
    { label: "Campaigns", path: "/ngo/campaigns", icon: Folder },
    { label: "Create Campaign", path: "/ngo/create", icon: PlusCircle },
    { label: "Submit Proof", path: "/ngo/proof", icon: Upload },
    { label: "Wallet", path: "/ngo/wallet", icon: Wallet },
];

// ADMIN
export const adminLinks = [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "NGO Verification", path: "/admin/ngos", icon: Users },
    { label: "Verified NGOs", path: "/admin/verified-ngos", icon: BadgeCheck },
    { label: "Campaigns", path: "/admin/campaigns", icon: Folder },
    { label: "Proof Verification", path: "/admin/proofs", icon: ShieldCheck },
    // { label: "Audit Logs", path: "/admin/logs", icon: FileText },
];