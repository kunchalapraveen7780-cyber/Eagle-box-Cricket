import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { 
  DollarSign, Calendar, Users, AlertCircle, LogOut, Loader2, TrendingUp, Download, Shield, MapPin, Award, Search, Menu, X, Clock, Activity, ListOrdered, Share2, Check, RefreshCw, MessageSquare, Bell, FileText, Table, Lock, Star
} from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { generateExcel, generateCSV } from "../lib/exportUtils";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [venueAnalytics, setVenueAnalytics] = useState([]);
  const [, setReferrals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [slotLocks, setSlotLocks] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [supportStats, setSupportStats] = useState(null);
  const [selectedSupportTicket, setSelectedSupportTicket] = useState(null);
  const [adminTicketResponse, setAdminTicketResponse] = useState("");
  const [membershipStats, setMembershipStats] = useState(null);
  const [loyaltyStats, setLoyaltyStats] = useState(null);
  const [commStats, setCommStats] = useState(null);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // Bookings Daily Dashboard states
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [selectedVenueFilter, setSelectedVenueFilter] = useState("ALL");
  const [dailyBookingStats, setDailyBookingStats] = useState(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);

  const loadActiveTabData = useCallback(async () => {
    try {
      if (activeTab === "overview") {
        const [statsRes, topRes, venueRes] = await Promise.all([
          api.get("/api/admin/dashboard-stats"),
          api.get("/api/admin/loyalty-analytics").then(r => r), // to get top customers
          api.get("/api/admin/venue-analytics")
        ]);
        setStats(statsRes.data);
        setTopCustomers(topRes.data.topCustomers || []);
        setVenueAnalytics(venueRes.data);
      } else if (activeTab === "users") {
        const res = await api.get("/api/admin/users");
        setUsers(res.data);
      } else if (activeTab === "bookings") {
        const res = await api.get(`/api/admin/bookings/daily?date=${selectedDate}`);
        setBookings(res.data.bookings);
        setDailyBookingStats(res.data.stats);
      } else if (activeTab === "locks") {
        const res = await api.get('/api/slots/admin/slot-locks');
        setSlotLocks(res.data);
      } else if (activeTab === "venues") {
        const venueRes = await api.get("/api/admin/venue-analytics");
        setVenueAnalytics(venueRes.data);
      } else if (activeTab === "revenue") {
        const res = await api.get("/api/admin/revenue-analytics");
        setStats(res.data);
      } else if (activeTab === "memberships") {
        const res = await api.get("/api/admin/membership-analytics");
        setMembershipStats(res.data);
      } else if (activeTab === "loyalty") {
        const [loyaltyRes, refRes] = await Promise.all([
          api.get("/api/admin/loyalty-analytics"),
          api.get("/api/admin/referrals")
        ]);
        setLoyaltyStats(loyaltyRes.data);
        setReferrals(refRes.data);
      } else if (activeTab === "reviews") {
        const res = await api.get("/api/admin/reviews");
        setReviews(res.data);
      } else if (activeTab === "support") {
        const res = await api.get("/api/admin/support-analytics");
        setSupportStats(res.data);
      } else if (activeTab === "audit") {
        const res = await api.get("/api/admin/audit-logs");
        setAuditLogs(res.data);
      } else if (activeTab === "communications") {
        const res = await api.get("/api/admin/communications-analytics");
        setCommStats(res.data);
      }
    } catch (error) {
      console.error("Failed to load active tab data", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, navigate, selectedDate]);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      loadActiveTabData();
    }, 0);
    const interval = setInterval(loadActiveTabData, 30000); // 30s refresh for active tab
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadActiveTabData]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully.");
    navigate("/");
  };

  const handleSupportTicketUpdate = async (ticketId, status) => {
    try {
      await api.patch(`/api/support/admin/${ticketId}`, { 
        status, 
        adminResponse: adminTicketResponse || undefined 
      });
      toast.success("Ticket updated successfully!");
      setAdminTicketResponse("");
      setSelectedSupportTicket(null);
      loadActiveTabData();
    } catch {
      toast.error("Failed to update ticket");
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await api.patch(`/api/admin/bookings/${bookingId}/status`, { status: newStatus });
      toast.success(`Booking status updated to ${newStatus}`);
      loadActiveTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    }
  };

  const triggerExport = async (type, format) => {
    const toastId = toast.loading("Generating Report...\nPlease wait...", { duration: 15000 });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout protection

    try {
      if (format === 'pdf') {
        const res = await api.get(`/api/admin/export/${type}?format=pdf`, {
          responseType: 'blob',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${type}_report.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);

        toast.success("PDF generated successfully", { id: toastId });
      } else {
        const res = await api.get(`/api/admin/export/${type}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.data && res.data.success && res.data.data.length > 0) {
          const data = res.data.data;
          if (format === 'excel') {
            generateExcel(data, type);
          } else {
            generateCSV(data, type);
          }
          
          toast.success(`${format.toUpperCase()} generated successfully`, { id: toastId });
        } else {
          toast.error("No records available", { id: toastId });
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      let errorMessage = "Failed to generate export";
      if (err.response?.status === 404) {
        errorMessage = "No records available";
      } else if (err.name === 'CanceledError' || err.name === 'AbortError') {
        errorMessage = "Export timed out";
      } else if (err.response?.data) {
        if (err.response.data instanceof Blob) {
          try {
            const text = await err.response.data.text();
            const json = JSON.parse(text);
            if (json.error) errorMessage = json.error;
          } catch {
            // parsing error
          }
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        }
      }
      toast.error(errorMessage, { id: toastId });
    }
  };

  const sidebarContent = (
    <div className={`fixed inset-y-0 left-0 bg-[#1A1A1A] text-white w-64 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 z-50 lg:relative lg:translate-x-0 shadow-2xl flex flex-col`}>
      <div className="p-6 flex items-center justify-between border-b border-white/10">
        <h1 className="text-xl font-black tracking-tight">
          <span className="text-[#22C55E]">EagleBox</span> Admin
        </h1>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {[
            { id: "overview", name: "Overview", icon: Activity },
            { id: "users", name: "User Analytics", icon: Users },
            { id: "bookings", name: "Bookings", icon: Calendar },
            { id: "locks", name: "Active Slot Locks", icon: Lock },
            { id: "venues", name: "Venue Analytics", icon: MapPin },
            { id: "revenue", name: "Revenue Dashboard", icon: TrendingUp },
            { id: "memberships", name: "Memberships", icon: Award },
            { id: "loyalty", name: "Loyalty & Referrals", icon: Share2 },
            { id: "support", name: "Support Center", icon: MessageSquare },
            { id: "reviews", name: "Player Reviews", icon: Star },
            { id: "audit", name: "Audit Logs", icon: Shield },
            { id: "export", name: "Export Reports", icon: Download },
            { id: "communications", name: "Emails & Notifications", icon: Bell }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id ? "bg-[#22C55E] text-white shadow-lg shadow-green-500/20" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="p-4 border-t border-white/10">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>
    </div>
  );

  const handlePrevDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toLocaleDateString('en-CA'));
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toLocaleDateString('en-CA'));
  };

  const handleToday = () => {
    setSelectedDate(new Date().toLocaleDateString('en-CA'));
  };

  const uniqueVenues = venueAnalytics && venueAnalytics.length > 0 
    ? venueAnalytics.map(v => v.name) 
    : ['Arena Alpha', 'Arena Beta', 'Kukatpally', 'Madhapur', 'Gachibowli', 'Uppal'];

  const filteredBookings = bookings.filter(b => {
    if (selectedVenueFilter !== "ALL" && b.slot?.branch?.name !== selectedVenueFilter) return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-[#F5F5F0] overflow-hidden font-sans">
      {sidebarContent}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white border-b border-[#EEEDE8] h-16 flex items-center justify-between px-6 shadow-sm z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-600 hover:text-black">
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-black text-slate-800 capitalize tracking-tight">{activeTab.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => { setLoading(true); loadActiveTabData(); }} className="text-slate-500 hover:text-[#22C55E] flex items-center gap-2 text-xs font-bold transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh Data
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 text-slate-800 relative">
          {loading && <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-500" /></div>}
          
          <div className="max-w-7xl mx-auto space-y-8">

            {/* TAB: OVERVIEW */}
            {activeTab === "overview" && stats && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: "Total Users", value: stats.totalUsers || 0, icon: Users, color: "blue" },
                    { label: "Active Members", value: stats.activeMembers || 0, icon: Award, color: "purple" },
                    { label: "Active Bookings", value: stats.totalBookings || 0, icon: ListOrdered, color: "indigo" },
                    { label: "Completed Bookings", value: stats.completedBookings || 0, icon: Check, color: "emerald" },
                    { label: "Cancelled Bookings", value: stats.cancelledBookings || 0, icon: X, color: "red" },
                    { label: "Today's Bookings", value: stats.todaysBookings || 0, icon: Calendar, color: "orange" },
                    { label: "Monthly Rev.", value: `₹${(stats.monthlyRevenue || 0).toLocaleString()}`, icon: DollarSign, color: "green" },
                    { label: "Active Grounds", value: stats.activeVenues || 0, icon: MapPin, color: "teal" },
                    { label: "Slots Today", value: stats.totalSlotsToday || 0, icon: Clock, color: "slate" },
                    { label: "Booked Slots", value: stats.bookedSlotsToday || 0, icon: ListOrdered, color: "emerald" },
                    { label: "Available Slots", value: stats.availableSlotsToday || 0, icon: AlertCircle, color: "yellow" },
                    { label: "Occupancy Rate", value: `${stats.occupancyRate || 0}%`, icon: Activity, color: "cyan" }
                  ].map((kpi, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-[#EEEDE8] shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${kpi.color}-500/10 text-${kpi.color}-600`}>
                          <kpi.icon className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className="text-2xl font-black tracking-tight">{kpi.value}</h4>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">{kpi.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm">
                  <h3 className="text-base font-black tracking-tight mb-6">Top Customers Leaderboard</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Rank</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tier</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Bookings</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Total Spend</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCustomers.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-500 font-medium">
                              No customer booking data available yet.
                            </td>
                          </tr>
                        ) : (
                          topCustomers.map((user, idx) => (
                            <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                              <td className="py-4 px-4 font-black text-slate-500">#{idx + 1}</td>
                              <td className="py-4 px-4 font-bold text-slate-900">{user.name}</td>
                              <td className="py-4 px-4"><span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded">{(user.userMemberships && user.userMemberships.length > 0) ? user.userMemberships.map(m => m.tier).join(', ') : 'NONE'}</span></td>
                              <td className="py-4 px-4 font-bold">{user.bookingCount || 0}</td>
                              <td className="py-4 px-4 font-bold">₹{user.totalSpent?.toLocaleString()}</td>
                              <td className="py-4 px-4 font-bold text-yellow-600">{user.pointsBalance || 0}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: USERS */}
            {activeTab === "users" && (
              <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-black tracking-tight">User Management</h3>
                  <span className="text-xs font-bold text-slate-500">{users.length} Total Users</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">User</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Contact</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Membership</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Bookings</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Total Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[10px] text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="py-3 px-4 text-xs">{u.email}<br/>{u.phone || 'N/A'}</td>
                          <td className="py-3 px-4 text-xs font-bold text-blue-600">{u.userMemberships?.filter(m => m.status === 'ACTIVE').map(m => m.tier).join(', ') || 'NONE'}</td>
                          <td className="py-3 px-4 text-xs font-bold">{u.bookingCount || 0}</td>
                          <td className="py-3 px-4 text-xs font-bold text-green-600">₹{u.totalSpent || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: BOOKINGS */}
            {activeTab === "bookings" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header / Date Picker */}
                <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                  <h3 className="text-xl font-black tracking-tight text-slate-800">Daily Operations</h3>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={handlePrevDay}
                      className="px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 transition-colors"
                    >
                      &larr; Prev
                    </button>
                    
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#22C55E] bg-slate-50"
                    />
                    
                    <button 
                      onClick={handleNextDay}
                      className="px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600 transition-colors"
                    >
                      Next &rarr;
                    </button>

                    <button 
                      onClick={handleToday}
                      className="px-4 py-2 bg-[#22C55E]/10 text-[#16A34A] rounded-xl font-bold hover:bg-[#22C55E]/20 transition-colors"
                    >
                      Today
                    </button>

                    <select 
                      value={selectedVenueFilter}
                      onChange={(e) => setSelectedVenueFilter(e.target.value)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-white outline-none min-w-[140px]"
                    >
                      <option value="ALL">All Venues</option>
                      {uniqueVenues.map(venue => (
                        <option key={venue} value={venue}>{venue}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Summary Cards */}
                {dailyBookingStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-[#EEEDE8] shadow-sm flex flex-col items-center text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">🏏 Total Slots</div>
                      <div className="text-2xl font-black text-slate-800">{dailyBookingStats.totalSlots}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#EEEDE8] shadow-sm flex flex-col items-center text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">✅ Booked</div>
                      <div className="text-2xl font-black text-slate-800">{dailyBookingStats.bookedSlots}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#EEEDE8] shadow-sm flex flex-col items-center text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">🟢 Available</div>
                      <div className="text-2xl font-black text-slate-800">{dailyBookingStats.availableSlots}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm flex flex-col items-center text-center bg-red-50/30">
                      <div className="text-[10px] font-bold text-red-400 uppercase mb-1">❌ Cancelled</div>
                      <div className="text-2xl font-black text-red-600">{dailyBookingStats.cancelled}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#EEEDE8] shadow-sm flex flex-col items-center text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">💰 Revenue</div>
                      <div className="text-xl font-black text-green-600">₹{dailyBookingStats.revenue.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-[#EEEDE8] shadow-sm flex flex-col items-center text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">👥 Customers</div>
                      <div className="text-2xl font-black text-slate-800">{dailyBookingStats.customers}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col items-center text-center bg-blue-50/30">
                      <div className="text-[10px] font-bold text-blue-400 uppercase mb-1">📈 Occupancy</div>
                      <div className="text-2xl font-black text-blue-600">{dailyBookingStats.occupancy}%</div>
                    </div>
                  </div>
                )}

                {/* Bookings Table */}
                <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Time</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Venue</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Customer</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Amount</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-slate-400 font-bold text-sm">No bookings found for this date.</td>
                          </tr>
                        ) : (
                          filteredBookings.map(b => (
                            <tr 
                              key={b.id} 
                              onClick={() => setSelectedBookingDetails(b)}
                              className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <td className="py-4 px-4 text-sm font-black text-slate-800">{b.slot?.startTime} – {b.slot?.endTime}</td>
                              <td className="py-4 px-4 text-sm font-bold text-slate-600">{b.slot?.branch?.name || 'Eagle Box'}</td>
                              <td className="py-4 px-4 text-sm font-bold text-slate-800">
                                {b.user?.name}
                              </td>
                              <td className="py-4 px-4 text-sm font-black text-slate-800">₹{b.amountPaid}</td>
                              <td className="py-4 px-4 text-right">
                                <span className={`inline-block px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${
                                  b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                  b.status === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {b.status === 'CONFIRMED' ? 'UPCOMING' : b.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {/* TAB: LOCKS */}
            {activeTab === "locks" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-[#0F172A] flex items-center gap-2">
                    <Lock className="w-5 h-5 text-yellow-500" /> Active Slot Locks
                  </h2>
                  <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                    {slotLocks.length} Active Locks
                  </span>
                </div>
                {slotLocks.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 font-semibold text-sm">
                    No active slot reservations.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Lock ID</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">User</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Venue & Time</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Expires At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slotLocks.map(lock => (
                          <tr key={lock.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 text-[10px] font-mono text-slate-500">{lock.id.substring(0,8).toUpperCase()}</td>
                            <td className="py-3 px-4 text-xs font-bold text-slate-800">{lock.user?.name}<br/><span className="text-[10px] text-slate-400 font-normal">{lock.user?.email}</span></td>
                            <td className="py-3 px-4 text-xs text-slate-700">
                              <strong>{lock.slot?.branch?.name || 'Eagle Box'}</strong><br/>
                              {lock.slot?.date} • {lock.slot?.startTime}
                            </td>
                            <td className="py-3 px-4 text-xs font-bold text-yellow-600">
                              {new Date(lock.expiresAt).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: VENUES */}
            {activeTab === "venues" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {venueAnalytics.map(v => (
                    <div key={v.id} className="bg-white rounded-3xl border border-[#EEEDE8] p-6 shadow-sm flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                          <MapPin className="w-6 h-6" />
                        </div>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded uppercase">Live Status</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900">{v.name}</h4>
                      
                      <div className="mt-6 space-y-3">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-500">Total Slots</span>
                          <span className="text-slate-900">{v.totalSlots}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-500">Booked</span>
                          <span className="text-emerald-600">{v.bookedSlots}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-500">Available</span>
                          <span className="text-slate-900">{v.availableSlots}</span>
                        </div>
                        
                        <div className="pt-3 border-t border-slate-100">
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-500">Occupancy</span>
                            <span className="text-blue-600">{v.occupancy}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full transition-all" style={{width: `${v.occupancy}%`}} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: REVENUE */}
            {activeTab === "revenue" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {!stats || stats.totalRevenue === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-[#EEEDE8] shadow-sm text-center">
                    <DollarSign className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-slate-800">No revenue records available yet.</h3>
                    <p className="text-sm text-slate-500 mt-2">Bookings must be paid and confirmed to appear here.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <h4 className="text-2xl font-black text-green-600">₹{stats.todayRevenue?.toLocaleString() || 0}</h4>
                        <p className="text-xs font-bold text-slate-500 uppercase mt-1">Today</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <h4 className="text-2xl font-black text-blue-600">₹{stats.weeklyRevenue?.toLocaleString() || 0}</h4>
                        <p className="text-xs font-bold text-slate-500 uppercase mt-1">This Week</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <h4 className="text-2xl font-black text-purple-600">₹{stats.monthlyRevenue?.toLocaleString() || 0}</h4>
                        <p className="text-xs font-bold text-slate-500 uppercase mt-1">This Month</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <h4 className="text-2xl font-black text-indigo-600">₹{stats.yearlyRevenue?.toLocaleString() || 0}</h4>
                        <p className="text-xs font-bold text-slate-500 uppercase mt-1">This Year</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-2xl shadow-sm text-center">
                        <h4 className="text-2xl font-black">₹{stats.totalRevenue?.toLocaleString() || 0}</h4>
                        <p className="text-xs font-bold uppercase mt-1 opacity-90">Total Revenue</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm">
                        <h3 className="text-base font-black tracking-tight mb-6">Revenue Trend (30 Days)</h3>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.trend}>
                              <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(v) => `₹${v}`}/>
                              <RechartsTooltip 
                                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                itemStyle={{color: '#22C55E', fontWeight: 'bold'}}
                              />
                              <Area type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm flex flex-col justify-between">
                        <div>
                          <h3 className="text-base font-black tracking-tight mb-2">Average Booking Value</h3>
                          <div className="text-4xl font-black text-slate-800 mb-6">
                            ₹{Math.round(stats.averageBookingValue || 0).toLocaleString()}
                          </div>
                        </div>
                        
                        <h3 className="text-sm font-black tracking-tight mb-4 text-slate-500 uppercase">Top Customers</h3>
                        <div className="space-y-3 flex-1 overflow-y-auto max-h-48">
                          {stats.topRevenueCustomers?.map((c, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                              <span className="font-bold text-slate-700">{c.name}</span>
                              <span className="font-black text-green-600">₹{c.revenue.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm">
                        <h3 className="text-base font-black tracking-tight mb-6">Revenue by Branch</h3>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.revenueByBranch}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tick={{fontSize: 12}} />
                              <YAxis tickFormatter={(v) => `₹${v}`} tick={{fontSize: 10}} />
                              <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px'}} />
                              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm">
                        <h3 className="text-base font-black tracking-tight mb-6">Revenue by Plan</h3>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={stats.revenueByPlan} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                {stats.revenueByPlan?.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b'][index % 5]} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{borderRadius: '12px'}} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: MEMBERSHIPS */}
            {activeTab === "memberships" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {!membershipStats || membershipStats.activeMembers === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-[#EEEDE8] shadow-sm text-center">
                    <Award className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-slate-800">No membership subscriptions purchased yet.</h3>
                    <p className="text-sm text-slate-500 mt-2">When users buy Starter, Pro, Elite, or Champion plans, they will appear here.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <h4 className="text-3xl font-black text-blue-600">{membershipStats.activeMembers}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Total Active Members</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <h4 className="text-3xl font-black text-green-600">₹{membershipStats.membershipRevenue?.toLocaleString()}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Membership Revenue</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <h4 className="text-3xl font-black text-yellow-600">{membershipStats.expiringMemberships}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Expiring Soon</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                        <h4 className="text-3xl font-black text-red-600">{membershipStats.expiredMemberships}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Expired Members</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <h4 className="text-xl font-black text-slate-700">{membershipStats.breakdowns?.STARTER || 0}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Starter Members</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <h4 className="text-xl font-black text-slate-700">{membershipStats.breakdowns?.PRO || 0}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Pro Members</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <h4 className="text-xl font-black text-slate-700">{membershipStats.breakdowns?.ELITE || 0}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Elite Members</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <h4 className="text-xl font-black text-slate-700">{membershipStats.breakdowns?.CHAMPION || 0}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Champion Members</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm flex flex-col justify-center">
                        <h3 className="text-base font-black tracking-tight mb-6">Membership Usage Statistics</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-500">Total Slots Granted</span>
                            <span className="font-black text-slate-800">{membershipStats.usage?.totalSlotsGranted || 0}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-500">Total Slots Used</span>
                            <span className="font-black text-blue-600">{membershipStats.usage?.totalSlotsUsed || 0}</span>
                          </div>
                          <div className="pt-4 border-t border-slate-100">
                            <div className="flex justify-between items-center text-sm mb-2">
                              <span className="font-bold text-slate-500">Usage Rate</span>
                              <span className="font-black text-emerald-600">{membershipStats.usage?.usagePercent || 0}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full transition-all" style={{width: `${membershipStats.usage?.usagePercent || 0}%`}} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm">
                        <h3 className="text-base font-black tracking-tight mb-6">Tier Distribution</h3>
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: "Starter", count: membershipStats.breakdowns?.STARTER || 0 },
                              { name: "Pro", count: membershipStats.breakdowns?.PRO || 0 },
                              { name: "Elite", count: membershipStats.breakdowns?.ELITE || 0 },
                              { name: "Champion", count: membershipStats.breakdowns?.CHAMPION || 0 },
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tick={{fontSize: 10}} />
                              <YAxis tick={{fontSize: 10}} />
                              <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: LOYALTY */}
            {activeTab === "loyalty" && loyaltyStats && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white p-6 rounded-3xl shadow-lg flex flex-col justify-between">
                    <div>
                      <h4 className="text-4xl font-black">{loyaltyStats.totalActivePoints?.toLocaleString()}</h4>
                      <p className="text-xs font-bold uppercase tracking-widest mt-2 opacity-80">Total Active Points</p>
                    </div>
                    <p className="text-[10px] mt-4 opacity-80 font-medium leading-relaxed">
                      The total pool of loyalty points currently sitting unspent in all customers' wallets.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="text-4xl font-black text-slate-900">₹{loyaltyStats.totalDiscountsGiven?.toLocaleString()}</h4>
                      <p className="text-xs font-bold uppercase tracking-widest mt-2 text-slate-500">Value Redeemed</p>
                    </div>
                    <p className="text-[10px] mt-4 text-slate-400 font-medium leading-relaxed">
                      The total Rupee (₹) value of all benefits claimed. Includes coupon discounts, points spent, and free membership slots used.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="text-4xl font-black text-slate-900">{loyaltyStats.totalPointsIssued?.toLocaleString()}</h4>
                      <p className="text-xs font-bold uppercase tracking-widest mt-2 text-slate-500">Total Points Issued</p>
                    </div>
                    <p className="text-[10px] mt-4 text-slate-400 font-medium leading-relaxed">
                      The total number of points ever given to customers over the lifetime of the platform (includes bookings and referrals).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SUPPORT */}
            {activeTab === "support" && supportStats && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                    <h4 className="text-3xl font-black text-blue-600">{supportStats.openTickets}</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">Open Tickets</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                    <h4 className="text-3xl font-black text-yellow-600">{supportStats.pendingTickets}</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">Pending</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                    <h4 className="text-3xl font-black text-green-600">{supportStats.resolvedTickets}</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">Resolved</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
                    <h4 className="text-3xl font-black text-purple-600">{supportStats.averageResponseTime}</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-1">Avg Response</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm overflow-x-auto">
                  <h3 className="text-base font-black tracking-tight mb-6">Recent Tickets</h3>
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Ticket ID</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">User</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Category</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Priority</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Created</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supportStats.recentTickets.map(t => (
                        <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-xs font-bold text-slate-800">{t.ticketId || t.id.substring(0,8)}</td>
                          <td className="py-3 px-4">
                            <p className="text-sm font-bold text-slate-900">{t.user?.name}</p>
                            <p className="text-[10px] text-slate-500">{t.user?.email}</p>
                          </td>
                          <td className="py-3 px-4 text-xs font-bold text-slate-600">{t.category || 'Other'}</td>
                          <td className="py-3 px-4 text-xs">
                            <span className={`px-2 py-0.5 rounded font-black uppercase text-[9px] ${
                              t.priority === 'High' ? 'bg-red-50 text-red-600' : 
                              t.priority === 'Medium' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                            }`}>{t.priority || 'Medium'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 text-[10px] font-black rounded uppercase ${
                              t.status === 'OPEN' ? 'bg-blue-50 text-blue-600' : 
                              t.status === 'PENDING' ? 'bg-orange-50 text-orange-600' : 
                              t.status === 'RESOLVED' ? 'bg-green-50 text-green-600' : 
                              'bg-slate-100 text-slate-600'
                            }`}>{t.status}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right">
                            <button 
                              onClick={() => setSelectedSupportTicket(t)}
                              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded hover:bg-slate-800 transition-colors"
                            >
                              View & Act
                            </button>
                          </td>
                        </tr>
                      ))}
                      {supportStats.recentTickets.length === 0 && (
                        <tr>
                          <td colSpan="7" className="text-center py-6 text-sm text-slate-500">No support tickets found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Ticket Action Modal */}
            {selectedSupportTicket && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white border border-slate-150 rounded-[24px] max-w-2xl w-full p-6 shadow-2xl text-[#0F172A] max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Manage Ticket: {selectedSupportTicket.ticketId || selectedSupportTicket.id.substring(0,8)}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-1">{selectedSupportTicket.subject}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedSupportTicket(null);
                        setAdminTicketResponse("");
                      }}
                      className="text-slate-400 hover:text-slate-700 font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">User Message</p>
                      <p className="text-sm font-medium text-slate-800">{selectedSupportTicket.message}</p>
                    </div>
                    
                    {selectedSupportTicket.attachmentUrl && (
                      <div className="text-sm">
                        <span className="font-bold text-slate-600">Attachment:</span>{" "}
                        <a href={selectedSupportTicket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View File</a>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Admin Reply</label>
                      <textarea 
                        rows={4}
                        value={adminTicketResponse}
                        onChange={(e) => setAdminTicketResponse(e.target.value)}
                        placeholder="Write your response to the user here... (This will be sent via email)"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-[#22C55E]/50"
                      ></textarea>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => handleSupportTicketUpdate(selectedSupportTicket.id, 'OPEN')} className="px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors">
                      Mark Open
                    </button>
                    <button onClick={() => handleSupportTicketUpdate(selectedSupportTicket.id, 'PENDING')} className="px-4 py-2 border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg text-sm font-bold transition-colors">
                      Mark Pending
                    </button>
                    <button onClick={() => handleSupportTicketUpdate(selectedSupportTicket.id, 'RESOLVED')} className="px-4 py-2 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg text-sm font-bold transition-colors">
                      Resolve Ticket
                    </button>
                    <button onClick={() => handleSupportTicketUpdate(selectedSupportTicket.id, 'CLOSED')} className="px-4 py-2 border border-slate-200 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">
                      Close Ticket
                    </button>
                  </div>
                  
                  {selectedSupportTicket.adminResponse && !adminTicketResponse && (
                    <div className="mt-4 text-xs text-slate-500 font-medium">
                      * Previous Response: {selectedSupportTicket.adminResponse}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: REVIEWS */}
            {activeTab === "reviews" && (
              <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm animate-in fade-in duration-500">
                <h3 className="text-base font-black tracking-tight mb-6">Player Reviews ({reviews.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">User / Date</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Branch</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Rating / Review</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map(r => (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{r.userName}</div>
                            <div className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="py-3 px-4 text-xs font-bold text-slate-600">{r.branch?.name || 'Eagle Box'}</td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="flex items-center gap-1 mb-1 text-yellow-400">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-current' : 'text-slate-200'}`} />
                              ))}
                            </div>
                            <p className="text-xs text-slate-600 truncate">{r.message}</p>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-2">
                              <span className={`inline-block px-2 py-1 rounded text-[10px] font-black uppercase w-max ${r.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {r.isApproved ? 'APPROVED' : 'PENDING'}
                              </span>
                              {r.isFeatured && (
                                <span className="inline-block px-2 py-1 rounded text-[10px] font-black uppercase w-max bg-purple-100 text-purple-700">
                                  FEATURED
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await api.patch(`/api/admin/reviews/${r.id}/status`, { isApproved: !r.isApproved });
                                  setReviews(reviews.map(rv => rv.id === r.id ? res.data : rv));
                                  toast.success(res.data.isApproved ? "Review Approved" : "Review Hidden");
                                } catch {
                                  toast.error("Action failed");
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${r.isApproved ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                            >
                              {r.isApproved ? 'Hide' : 'Approve'}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await api.patch(`/api/admin/reviews/${r.id}/status`, { isFeatured: !r.isFeatured });
                                  setReviews(reviews.map(rv => rv.id === r.id ? res.data : rv));
                                  toast.success(res.data.isFeatured ? "Marked as Featured" : "Removed from Featured");
                                } catch {
                                  toast.error("Action failed");
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${r.isFeatured ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                            >
                              {r.isFeatured ? 'Unfeature' : 'Feature'}
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm("Delete this review permanently?")) {
                                  try {
                                    await api.delete(`/api/admin/reviews/${r.id}`);
                                    setReviews(reviews.filter(rv => rv.id !== r.id));
                                    toast.success("Review deleted");
                                  } catch {
                                    toast.error("Delete failed");
                                  }
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {reviews.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-sm text-slate-500">No reviews submitted yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: AUDIT */}
            {activeTab === "audit" && (
              <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm animate-in fade-in duration-500">
                <h3 className="text-base font-black tracking-tight mb-6">System Audit Logs</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Timestamp</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Admin / User</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Action</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => (
                        <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="py-3 px-4 text-xs font-bold text-slate-800">{log.adminName}</td>
                          <td className="py-3 px-4 text-xs font-bold text-blue-600">{log.actionType}</td>
                          <td className="py-3 px-4 text-xs text-slate-600">{log.newValue || log.previousValue || '-'}</td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-sm text-slate-500">No logs generated yet. Wait for a few seconds if you recently performed an action.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: COMMUNICATIONS */}
            {activeTab === "communications" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm flex items-center gap-6">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Emails Sent</p>
                      <p className="text-3xl font-black text-slate-800">{commStats?.totalEmailsSent || 0}</p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm flex items-center gap-6">
                    <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Emails Failed</p>
                      <p className="text-3xl font-black text-slate-800">{commStats?.totalEmailsFailed || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-[#EEEDE8] shadow-sm">
                  <h3 className="text-base font-black tracking-tight mb-6">Recent Automated Emails</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Sent At</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Recipient</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Template</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commStats?.emailLogs?.map(log => (
                          <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="py-3 px-4 text-xs text-slate-600">
                              <span className="font-bold text-slate-800 block">{log.user?.name || '-'}</span>
                              <span>{log.toEmail}</span>
                            </td>
                            <td className="py-3 px-4 text-xs font-bold text-slate-800">{log.template}</td>
                            <td className="py-3 px-4 text-xs">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${
                                log.status === 'SENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(!commStats?.emailLogs || commStats.emailLogs.length === 0) && (
                          <tr>
                            <td colSpan="4" className="text-center py-8 text-sm text-slate-500">No email logs found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: EXPORT */}
            {activeTab === "export" && (
              <div className="bg-white p-8 rounded-3xl border border-[#EEEDE8] shadow-sm animate-in fade-in duration-500">
                <div className="max-w-2xl text-center mx-auto space-y-4 mb-8">
                  <div className="w-16 h-16 bg-[#22C55E]/10 text-[#22C55E] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Download className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Export Data Center</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-semibold">
                    Generate and download real-time reports directly from the database. 
                    Available in PDF, Excel (.xlsx), and CSV formats.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { type: 'users', label: 'Users Report' },
                    { type: 'bookings', label: 'Booking Report' },
                    { type: 'revenue', label: 'Revenue Report' },
                    { type: 'memberships', label: 'Membership Report' },
                    { type: 'rewards', label: 'Rewards Report' },
                    { type: 'referrals', label: 'Referral Report' },
                    { type: 'auditlogs', label: 'Audit Log Report' }
                  ].map(e => (
                    <div 
                      key={e.type}
                      className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all hover:shadow-md"
                    >
                      <span className="font-black text-sm text-slate-800">{e.label}</span>
                      <div className="flex gap-2 w-full">
                        <button 
                          onClick={() => triggerExport(e.type, 'pdf')}
                          className="flex-1 flex flex-col items-center gap-1 bg-white hover:bg-red-50 text-red-600 border border-slate-200 rounded-xl py-2 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="text-[10px] font-bold">PDF</span>
                        </button>
                        <button 
                          onClick={() => triggerExport(e.type, 'excel')}
                          className="flex-1 flex flex-col items-center gap-1 bg-white hover:bg-green-50 text-green-600 border border-slate-200 rounded-xl py-2 transition-colors"
                        >
                          <Table className="w-4 h-4" />
                          <span className="text-[10px] font-bold">EXCEL</span>
                        </button>
                        <button 
                          onClick={() => triggerExport(e.type, 'csv')}
                          className="flex-1 flex flex-col items-center gap-1 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-xl py-2 transition-colors"
                        >
                          <ListOrdered className="w-4 h-4" />
                          <span className="text-[10px] font-bold">CSV</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Booking Details Modal */}
      {selectedBookingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedBookingDetails(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800">Booking Details</h3>
              <button onClick={() => setSelectedBookingDetails(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                <span className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider ${
                  selectedBookingDetails.status === 'CONFIRMED' || selectedBookingDetails.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  selectedBookingDetails.status === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {selectedBookingDetails.status === 'CONFIRMED' ? 'UPCOMING' : selectedBookingDetails.status}
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</div>
                <div className="text-base font-black text-slate-800">{selectedBookingDetails.user?.name}</div>
                <div className="text-sm font-semibold text-slate-500">{selectedBookingDetails.user?.email}</div>
                <div className="text-sm font-semibold text-slate-500">{selectedBookingDetails.user?.phone}</div>
              </div>
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Match Details</div>
                <div className="text-sm font-bold text-slate-700 flex justify-between">
                  <span>Venue:</span>
                  <span className="text-slate-900">{selectedBookingDetails.slot?.branch?.name || 'Eagle Box'}</span>
                </div>
                <div className="text-sm font-bold text-slate-700 flex justify-between">
                  <span>Date:</span>
                  <span className="text-slate-900">{selectedBookingDetails.slot?.date}</span>
                </div>
                <div className="text-sm font-bold text-slate-700 flex justify-between">
                  <span>Time:</span>
                  <span className="text-slate-900">{selectedBookingDetails.slot?.startTime} – {selectedBookingDetails.slot?.endTime}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment</div>
                <div className="text-sm font-bold text-slate-700 flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="text-green-600 font-black">₹{selectedBookingDetails.amountPaid}</span>
                </div>
                {selectedBookingDetails.notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl text-sm text-slate-600 font-medium">
                    <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Notes</span>
                    {selectedBookingDetails.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
