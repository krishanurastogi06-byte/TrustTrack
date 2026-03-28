import Table from "../../components/ui/Table";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { History } from "lucide-react";

function AuditLogs() {
    const headers = ["Action", "User", "Time", "Status"];

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                    <History className="text-indigo-600" size={32} strokeWidth={2.5} />
                    Audit Logs
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Review recent administrative actions and system events.</p>
            </div>
            
            <Card className="p-0 overflow-hidden">
                <div className="p-8 text-center text-slate-500">
                    Audit log API is not available in backend yet. Connect this page to GET /api/admin/audit-logs when endpoint is added.
                </div>
            </Card>
        </div>
    );
}

export default AuditLogs;