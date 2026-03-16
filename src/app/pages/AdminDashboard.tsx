import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { getAdminStats, getAllUsers, updateUserAccess } from '../utils/storage';
import { Users, FileText, IndianRupee, AlertCircle, Shield, ShieldOff, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const [s, u] = await Promise.all([getAdminStats(), getAllUsers()]);
    setStats(s);
    setUsers(u);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const handleToggleAccess = async (userId: string, currentBlocked: boolean) => {
    const success = await updateUserAccess(userId, !currentBlocked);
    if (success) {
      toast.success(currentBlocked ? 'User unblocked' : 'User blocked');
      loadData();
    } else {
      toast.error('Failed to update access');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-600">
        <AlertCircle size={48} className="mb-4 text-rose-500" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Monitor platform activity and manage users.</p>
        </div>
        <button 
          onClick={loadData}
          className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
          title="Refresh stats"
        >
          <Activity size={20} />
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Users</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats?.totalUsers || 0}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Invoices Today</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats?.invoicesToday || 0}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileText size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <IndianRupee size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Health</p>
              <h3 className="text-3xl font-bold text-emerald-500 mt-1">Stable</h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <Shield size={24} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={20} /> User Management
          </h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-sm font-semibold text-slate-900">Store / Owner</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-900">Invoices</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-900">Status</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-900 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{u.business_name}</div>
                        <div className="text-xs text-slate-500">{u.owner_name || 'No Owner'} • {u.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {u.invoices?.[0]?.count || 0}
                      </td>
                      <td className="px-6 py-4">
                        {u.is_blocked ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleAccess(u.user_id, !!u.is_blocked)}
                          className={`p-2 rounded-lg transition-colors ${
                            u.is_blocked 
                              ? 'text-emerald-600 hover:bg-emerald-50' 
                              : 'text-rose-600 hover:bg-rose-50'
                          }`}
                          title={u.is_blocked ? 'Unblock user' : 'Block user'}
                        >
                          {u.is_blocked ? <Shield size={18} /> : <ShieldOff size={18} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Activity Feed */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity size={20} /> Real-time Feed
          </h2>
          <Card className="p-6 max-h-[600px] overflow-y-auto">
            <div className="space-y-6">
              {stats?.recentLogs.map((log: any) => (
                <div key={log.id} className="flex gap-4">
                  <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${
                    log.action === 'login' ? 'bg-indigo-400' : 
                    log.action.includes('create') ? 'bg-emerald-400' : 
                    log.action.includes('error') ? 'bg-rose-400' : 'bg-slate-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {log.action.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {log.entity_type} • {new Date(log.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats?.recentLogs || stats.recentLogs.length === 0) && (
                <p className="text-center text-slate-500 py-8">No recent activity</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
