import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAdminStats, 
  getAllUsers, 
  updateUserAccess, 
  getUserActivity,
  getAllInvoices
} from '../utils/storage';
import { Users, FileText, IndianRupee, AlertCircle, Shield, ShieldOff, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'users' | 'revenue' | 'activity' | 'invoices'>('overview');
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserActivity, setSelectedUserActivity] = useState<any[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    const [s, u, inv] = await Promise.all([getAdminStats(), getAllUsers(), getAllInvoices()]);
    setStats(s);
    setUsers(u);
    setAllInvoices(inv);
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

  const viewUserDetail = async (u: any) => {
    setSelectedUser(u);
    setIsLoading(true);
    const activity = await getUserActivity(u.user_id);
    setSelectedUserActivity(activity);
    setIsLoading(false);
  };

  const calculateWorkingHours = (logs: any[]) => {
    if (!logs || logs.length === 0) return 0;
    
    // Group by day
    const days: { [key: string]: any[] } = {};
    logs.forEach(log => {
      const day = new Date(log.created_at).toDateString();
      if (!days[day]) days[day] = [];
      days[day].push(new Date(log.created_at).getTime());
    });

    let totalHours = 0;
    Object.values(days).forEach(times => {
      const min = Math.min(...times);
      const max = Math.max(...times);
      const diff = (max - min) / (1000 * 60 * 60);
      // Assume at least 15 min for single action
      totalHours += Math.max(diff, 0.25);
    });

    return totalHours.toFixed(1);
  };

  const filteredUsers = users.filter(u => 
    u.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.user_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
            <span 
              className="hover:text-slate-900 cursor-pointer transition-colors"
              onClick={() => { setActiveView('overview'); setSelectedUser(null); }}
            >
              Admin
            </span>
            {activeView !== 'overview' && (
              <>
                <span>/</span>
                <span 
                  className="hover:text-slate-900 cursor-pointer transition-colors capitalize"
                  onClick={() => setSelectedUser(null)}
                >
                  {activeView}
                </span>
              </>
            )}
            {selectedUser && (
              <>
                <span>/</span>
                <span className="text-slate-900 truncate max-w-[150px]">{selectedUser.business_name || selectedUser.user_id}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            {selectedUser ? 'User Insights' : 
             activeView === 'overview' ? 'Admin Dashboard' : 
             activeView === 'users' ? 'User Management' : 
             activeView === 'revenue' ? 'Revenue Analytics' : 'Platform Activity'}
          </h1>
          <p className="text-slate-500 mt-1">
            {selectedUser ? `In-depth activity and engagement metrics for ${selectedUser.business_name}.` : 
             activeView === 'overview' ? 'Monitor platform activity and manage users.' : 
             activeView === 'users' ? 'Manage access and view store details for all registered users.' : 
             activeView === 'revenue' ? 'Detailed breakdown of platform revenue and invoice generation.' : 
             'Real-time feed of all platform events and user actions.'}
          </p>
        </div>
        <div className="flex gap-2">
          {(activeView !== 'overview' || selectedUser) && (
            <button 
              onClick={() => { setSelectedUser(null); if (selectedUser) return; setActiveView('overview'); }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {selectedUser ? 'Back to List' : 'Overview'}
            </button>
          )}
          <button 
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-900 transition-colors bg-white border border-slate-200 rounded-lg"
            title="Refresh stats"
          >
            <Activity size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      {!selectedUser && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button 
            onClick={() => setActiveView('users')}
            className="text-left transition-transform active:scale-95 duration-200 group"
          >
            <Card className={`p-6 transition-all duration-300 ${activeView === 'users' ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-md'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">Registered Users</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats?.totalUsers || 0}</h3>
                </div>
                <div className={`p-3 rounded-xl transition-colors ${activeView === 'users' ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'}`}>
                  <Users size={24} />
                </div>
              </div>
            </Card>
          </button>

          <button 
            onClick={() => setActiveView('activity')}
            className="text-left transition-transform active:scale-95 duration-200 group"
          >
            <Card className={`p-6 transition-all duration-300 ${activeView === 'activity' ? 'ring-2 ring-emerald-500 shadow-lg' : 'hover:shadow-md'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-emerald-600 transition-colors">Invoices Today</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats?.invoicesToday || 0}</h3>
                </div>
                <div className={`p-3 rounded-xl transition-colors ${activeView === 'activity' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'}`}>
                  <FileText size={24} />
                </div>
              </div>
            </Card>
          </button>

          <button 
            onClick={() => setActiveView('revenue')}
            className="text-left transition-transform active:scale-95 duration-200 group"
          >
            <Card className={`p-6 transition-all duration-300 ${activeView === 'revenue' ? 'ring-2 ring-amber-500 shadow-lg' : 'hover:shadow-md'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-amber-600 transition-colors">Total Revenue</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}</h3>
                </div>
                <div className={`p-3 rounded-xl transition-colors ${activeView === 'revenue' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100'}`}>
                  <IndianRupee size={24} />
                </div>
              </div>
            </Card>
          </button>

          <button 
            onClick={() => setActiveView('invoices')}
            className="text-left transition-transform active:scale-95 duration-200 group"
          >
            <Card className={`p-6 transition-all duration-300 ${activeView === 'invoices' ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">Total Receipts</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats?.totalInvoices || allInvoices.length}</h3>
                </div>
                <div className={`p-3 rounded-xl transition-colors ${activeView === 'invoices' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
                  <FileText size={24} />
                </div>
              </div>
            </Card>
          </button>

          <Card className="p-6 transition-all duration-300 hover:shadow-md border-emerald-50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Live Users</p>
                <div className="flex items-center gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-slate-900">{stats?.liveUsers || 0}</h3>
                  <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[10px] font-medium text-slate-400 mt-1">Active (last 15m)</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Activity size={24} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {selectedUser ? (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 space-y-4 md:col-span-1 border-slate-100 shadow-xl">
              <div className="h-20 w-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                <Users size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedUser.business_name}</h3>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">{selectedUser.owner_name}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase">Registration ID</span>
                  <span className="font-mono text-slate-900">{selectedUser.user_id.slice(0, 18)}...</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase">Email</span>
                  <span className="font-medium text-slate-900">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase">Phone</span>
                  <span className="font-medium text-slate-900">{selectedUser.phone}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase">Location</span>
                  <span className="font-medium text-slate-900">{selectedUser.city}, {selectedUser.state}</span>
                </div>
              </div>
              <button
                onClick={() => handleToggleAccess(selectedUser.user_id, !!selectedUser.is_blocked)}
                className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  selectedUser.is_blocked 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200' 
                    : 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200'
                }`}
              >
                {selectedUser.is_blocked ? 'Grant Platform Access' : 'Revoke Platform Access'}
              </button>
            </Card>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="p-8 border-slate-100 shadow-lg relative overflow-hidden group">
                <FileText size={80} className="absolute -right-4 -bottom-4 text-emerald-50 opacity-10 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total Output</p>
                <h4 className="text-4xl font-black text-slate-900">{selectedUser.invoices?.[0]?.count || 0}</h4>
                <p className="text-xs font-bold text-emerald-600 uppercase mt-4">Invoices Generated</p>
              </Card>

              <Card className="p-8 border-slate-100 shadow-lg relative overflow-hidden group">
                <Activity size={80} className="absolute -right-4 -bottom-4 text-indigo-50 opacity-10 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Platform Engagement</p>
                <h4 className="text-4xl font-black text-slate-900">{calculateWorkingHours(selectedUserActivity)}h</h4>
                <p className="text-xs font-bold text-indigo-600 uppercase mt-4">Estimated Working Hours</p>
              </Card>

              <Card className="p-8 md:col-span-2 border-slate-100 shadow-lg">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">User Activity Timeline</h4>
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-200">
                  {selectedUserActivity.map((log: any, i) => (
                    <div key={log.id} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${
                          log.action === 'login' ? 'bg-indigo-400' : 'bg-emerald-400'
                        }`} />
                        {i !== selectedUserActivity.length - 1 && <div className="w-px h-full bg-slate-100 my-1" />}
                      </div>
                      <div className="pb-6">
                        <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{log.action.replace('_', ' ')}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {log.entity_type} • {new Date(log.created_at).toLocaleString()}
                        </p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-2 p-2 bg-slate-50 rounded text-[10px] font-mono text-slate-500 overflow-x-auto">
                            {JSON.stringify(log.metadata)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedUserActivity.length === 0 && (
                    <p className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest italic">No activity logs found</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : activeView === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Management Quick View */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users size={20} /> Recent Users
              </h2>
              <button 
                onClick={() => setActiveView('users')}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all users →
              </button>
            </div>
            <Card className="overflow-hidden shadow-sm border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600">Store / Owner</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600">Invoices</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.slice(0, 5).map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-4 cursor-pointer" onClick={() => viewUserDetail(u)}>
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase text-sm tracking-tight flex items-center gap-2">
                            {u.business_name || 'Unnamed Store'}
                            {u.is_pending && (
                              <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-100 px-1 rounded uppercase font-black">Pending Setup</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 lowercase opacity-80">{u.owner_name} • {u.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                          {u.invoices?.[0]?.count || 0}
                        </td>
                        <td className="px-6 py-4">
                          {u.is_blocked ? (
                            <span className="inline-flex items-center px-4 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                              Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-4 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleToggleAccess(u.user_id, !!u.is_blocked)}
                            className={`p-2 rounded-lg transition-all duration-300 ${
                              u.is_blocked 
                                ? 'text-emerald-500 hover:bg-emerald-50 hover:shadow-inner' 
                                : 'text-rose-500 hover:bg-rose-50 hover:shadow-inner'
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

          {/* Activity Feed Quick View */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Activity size={20} /> Latest Actions
              </h2>
              <button 
                onClick={() => setActiveView('activity')}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Full logs →
              </button>
            </div>
            <Card className="p-6 max-h-[500px] overflow-y-auto shadow-sm border-slate-100">
              <div className="space-y-6">
                {stats?.recentLogs.slice(0, 10).map((log: any) => (
                  <div key={log.id} className="flex gap-4 group">
                    <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 transition-transform group-hover:scale-125 ${
                      log.action === 'login' ? 'bg-indigo-400' : 
                      log.action.includes('create') ? 'bg-emerald-400' : 
                      log.action.includes('error') ? 'bg-rose-400' : 'bg-slate-400'
                    }`} />
                    <div className="border-l-2 border-slate-50 pl-4 py-0.5">
                      <p className="text-sm font-bold text-slate-800 uppercase tracking-tighter">
                        {log.action.replace('_', ' ')}
                      </p>
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-0.5 opacity-60">
                        {log.entity_type} • {new Date(log.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {(!stats?.recentLogs || stats.recentLogs.length === 0) && (
                  <p className="text-center text-slate-500 py-8 text-sm italic">No recent activity</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : activeView === 'users' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
              <Users size={20} className="text-indigo-600" /> Complete User Directory
            </h2>
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="Search name, email or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm pl-10"
              />
              <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          
          <Card className="overflow-hidden shadow-xl border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Store / Owner</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Registration ID</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Volume</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Location</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Access control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 cursor-pointer" onClick={() => viewUserDetail(u)}>
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight flex items-center gap-2">
                          {u.business_name || 'Unset Business Name'}
                          {u.is_pending && (
                            <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded uppercase font-black">Pending Setup</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 lowercase opacity-70 italic">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-mono text-slate-400 truncate max-w-[120px]" title={u.user_id}>
                          {u.user_id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg font-black text-slate-900 group-hover:scale-110 transition-transform origin-left inline-block">
                          {u.invoices?.[0]?.count || 0}
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest -mt-1">Invoices</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-700 uppercase">{u.city}, {u.state}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleAccess(u.user_id, !!u.is_blocked)}
                          className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 border ${
                            u.is_blocked 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white' 
                              : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white'
                          }`}
                        >
                          {u.is_blocked ? 'Grant access' : 'Revoke access'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : activeView === 'revenue' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <IndianRupee size={20} className="text-amber-500" /> Revenue Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 border-slate-100 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <IndianRupee size={120} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Aggregate Growth</p>
              <h3 className="text-5xl font-black text-slate-900 mb-6 tracking-tighter">
                ₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}
              </h3>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 w-3/4 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
              </div>
            </Card>
            
            <Card className="p-8 border-slate-100 shadow-xl">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Top Revenue Stores</h4>
              <div className="space-y-4">
                {users.sort((a, b) => (b.invoices?.[0]?.count || 0) - (a.invoices?.[0]?.count || 0)).slice(0, 5).map((u, i) => (
                  <div key={u.id} className="flex items-center justify-between group cursor-pointer" onClick={() => viewUserDetail(u)}>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-slate-300 group-hover:text-amber-500 transition-colors">0{i+1}</span>
                      <p className="text-sm font-bold text-slate-800 uppercase tracking-tight group-hover:text-indigo-600">{u.business_name}</p>
                    </div>
                    <p className="text-sm font-black text-slate-900">{u.invoices?.[0]?.count || 0} INVS</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : activeView === 'invoices' ? (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
              <FileText size={20} className="text-blue-600" /> All Platform Invoices
            </h2>
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="Search invoice #, customer or store..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all shadow-sm pl-10"
              />
              <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          
          <Card className="overflow-hidden shadow-xl border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Invoice #</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Store / Business</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Customer</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allInvoices.filter(inv => 
                    inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    inv.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    inv.stores?.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                          {inv.stores?.business_name || 'Missing Store'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{inv.store_id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {inv.customers?.name || 'Unknown Customer'}
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-slate-900">
                        ₹{inv.grand_total?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                          inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
                          inv.status === 'unpaid' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {allInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                        No invoices found across the platform.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <Activity size={20} className="text-emerald-500" /> Complete System Logs
          </h2>
          <Card className="overflow-hidden shadow-xl border-slate-100">
            <div className="max-h-[800px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Timestamp</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Action</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Entity Type</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.recentLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                          log.action === 'login' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 
                          log.action.includes('create') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                          'bg-slate-50 text-slate-600 border border-slate-100'
                        }`}>
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase opacity-60">
                        {log.entity_type}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-[10px] font-mono text-slate-400 max-w-[200px] truncate ml-auto">
                          {JSON.stringify(log.metadata)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
