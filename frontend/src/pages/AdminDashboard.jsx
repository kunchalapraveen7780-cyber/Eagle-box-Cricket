import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, Calendar, Users, AlertCircle, LogOut, Loader2, TrendingUp, Plus, Trash } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview, bookings, users, slots
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Slots, Branches, and Revenue chart states
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [branches, setBranches] = useState([]);
  const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
  const [createSlotForm, setCreateSlotForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    price: "",
    branchId: ""
  });
  const [isCreatingSlot, setIsCreatingSlot] = useState(false);

  const fetchSlots = () => {
    setLoadingSlots(true);
    api.get("/api/slots")
      .then((res) => {
        setSlots(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch slots:", err);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  };

  const loadData = () => {
    // Fetch stats
    api.get("/api/admin/dashboard-stats")
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch stats:", err);
        toast.error("Failed to load dashboard statistics.");
        setLoading(false);
      });

    // Fetch bookings
    setLoadingBookings(true);
    api.get("/api/admin/bookings")
      .then((res) => {
        setBookings(res.data);
        setLoadingBookings(false);
      })
      .catch((err) => {
        console.error("Failed to fetch bookings:", err);
        setLoadingBookings(false);
      });

    // Fetch users
    setLoadingUsers(true);
    api.get("/api/admin/users")
      .then((res) => {
        setUsers(res.data);
        setLoadingUsers(false);
      })
      .catch((err) => {
        console.error("Failed to fetch users:", err);
        setLoadingUsers(false);
      });

    // Fetch branches
    api.get("/api/branches")
      .then((res) => {
        setBranches(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch branches:", err);
      });

    // Fetch live revenue trend
    api.get("/api/admin/revenue-chart?days=7")
      .then((res) => {
        setRevenueTrend(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch revenue trend:", err);
      });

    fetchSlots();
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully.");
    navigate("/");
  };

  const handleStatusChange = (bookingId, newStatus) => {
    api.patch(`/api/admin/bookings/${bookingId}/status`, { status: newStatus })
      .then(() => {
        toast.success(`Booking status updated to ${newStatus}!`);
        loadData();
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || "Failed to update booking status.");
      });
  };

  const handleCreateSlot = (e) => {
    e.preventDefault();
    setIsCreatingSlot(true);
    api.post("/api/slots", {
      date: createSlotForm.date,
      startTime: createSlotForm.startTime,
      endTime: createSlotForm.endTime,
      price: createSlotForm.price,
      branchId: createSlotForm.branchId || null
    })
    .then(() => {
      toast.success("Slot created successfully!");
      setShowCreateSlotModal(false);
      setCreateSlotForm({ date: "", startTime: "", endTime: "", price: "", branchId: "" });
      fetchSlots();
      loadData();
    })
    .catch((err) => {
      toast.error(err.response?.data?.error || "Failed to create slot.");
    })
    .finally(() => {
      setIsCreatingSlot(false);
    });
  };

  const handleDeleteSlot = (slotId) => {
    if (!window.confirm("Are you sure you want to delete this slot?")) return;
    api.delete(`/api/slots/${slotId}`)
      .then(() => {
        toast.success("Slot deleted successfully!");
        fetchSlots();
        loadData();
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || "Failed to delete slot.");
      });
  };

  if (loading) {
    return (
      <div className="bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#22C55E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#0F172A]">
      
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight flex items-center gap-1.5 text-slate-850">
            <span className="text-[#22C55E]">EagleBox</span> Admin Console
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-slate-250 hover:border-red-500/30 rounded-lg text-slate-700 hover:text-red-400 font-semibold transition-colors cursor-pointer text-xs"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">Admin Command Center</h1>
          <p className="text-slate-500 text-xs mt-1">Real-time revenue metrics, player registrations, and slot scheduling.</p>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-150 shadow-sm p-6 rounded-2xl flex items-center gap-4 hover:border-[#22C55E]/40 transition-colors duration-300 shadow-xl">
            <div className="w-12 h-12 bg-green-500/10 text-[#22C55E] rounded-xl flex items-center justify-center shrink-0 border border-[#22C55E]/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Revenue</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">₹{stats?.totalRevenue?.toLocaleString() || 0}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-150 shadow-sm p-6 rounded-2xl flex items-center gap-4 hover:border-white/20 transition-colors duration-300 shadow-xl">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/20">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Today's Bookings</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{stats?.todaysBookings || 0}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-150 shadow-sm p-6 rounded-2xl flex items-center gap-4 hover:border-white/20 transition-colors duration-300 shadow-xl">
            <div className="w-12 h-12 bg-yellow-500/10 text-yellow-450 text-yellow-400 rounded-xl flex items-center justify-center shrink-0 border border-yellow-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Approvals</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{stats?.pendingApprovals || 0}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-150 shadow-sm p-6 rounded-2xl flex items-center gap-4 hover:border-white/20 transition-colors duration-300 shadow-xl">
            <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center shrink-0 border border-purple-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Members</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{stats?.activeMembers || 0}</div>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="border-b border-slate-250">
          <div className="flex gap-6">
            {["overview", "bookings", "users", "slots"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 cursor-pointer ${
                  activeTab === tab
                    ? "border-[#22C55E] text-[#22C55E]"
                    : "border-transparent text-slate-400 hover:text-[#0F172A]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Revenue AreaChart */}
            <div className="lg:col-span-2 bg-white border border-slate-150 shadow-sm rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-black text-slate-850 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#22C55E]" /> Revenue Performance (7-Day Area Trend)
              </h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend.length > 0 ? revenueTrend : stats?.trend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#111111", borderColor: "rgba(255,255,255,0.1)" }} />
                    <Area type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="bg-white border border-slate-150 shadow-sm rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-black text-slate-850 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#22C55E]" /> Recent Booking Inflow
              </h2>
              <div className="divide-y divide-white/5 overflow-y-auto max-h-80 space-y-1">
                {loadingBookings ? (
                  <div className="text-center py-12 text-slate-400 text-sm">Loading activity...</div>
                ) : bookings.length > 0 ? (
                  bookings.slice(0, 5).map((b, i) => (
                    <div key={i} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-850 text-sm truncate">{b.user.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{b.slot.startTime} - {b.slot.endTime} • {b.slot.date}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-sm text-[#0F172A]">₹{b.amountPaid}</div>
                        <div className="mt-1">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            b.status === "CONFIRMED"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : b.status === "PENDING"
                                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            {b.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">No activity recorded.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bookings Directory Tab */}
        {activeTab === "bookings" && (
          <div className="bg-white border border-slate-150 shadow-sm rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <h2 className="text-lg font-black text-[#0F172A]">Reservations Directory</h2>
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <input 
                  type="text"
                  placeholder="Search client name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-[#22C55E] min-w-[200px]"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-[#22C55E] text-[#0F172A]"
                >
                  <option value="ALL">All Status</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-250 rounded-xl bg-slate-50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-250 bg-white/5 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Venue Branch</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Change Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-semibold text-slate-700">
                  {loadingBookings ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-400">Loading bookings...</td>
                    </tr>
                  ) : bookings.length > 0 ? (
                    bookings
                      .filter(b => {
                        const matchesName = b.user.name.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
                        return matchesName && matchesStatus;
                      })
                      .map(b => (
                        <tr key={b.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                            {b.user.name}
                            <div className="text-[10px] text-slate-400 font-normal">{b.user.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div>{new Date(b.slot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{b.slot.startTime} - {b.slot.endTime}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{b.slot.branch?.name || 'Eagle Box Cricket'}</td>
                          <td className="py-3.5 px-4 font-extrabold text-[#22C55E]">₹{b.amountPaid}</td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              b.status === "CONFIRMED"
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : b.status === "PENDING"
                                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                  : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={b.status}
                              onChange={(e) => handleStatusChange(b.id, e.target.value)}
                              className="bg-white text-slate-800 border border-slate-250 rounded px-2.5 py-1 text-[10px] font-bold text-[#0F172A] focus:outline-none focus:border-[#22C55E]"
                            >
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="PENDING">PENDING</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-400">No bookings found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Directory Tab */}
        {activeTab === "users" && (
          <div className="bg-white border border-slate-150 shadow-sm rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <h2 className="text-lg font-black text-[#0F172A]">Registered Users Directory</h2>
              <input 
                type="text"
                placeholder="Search name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-[#22C55E] min-w-[240px]"
              />
            </div>

            <div className="overflow-x-auto border border-slate-250 rounded-xl bg-slate-50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-250 bg-white/5 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email / Phone</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Membership Club</th>
                    <th className="py-3 px-4">Loyalty Balance</th>
                    <th className="py-3 px-4 text-center">Bookings Count</th>
                    <th className="py-3 px-4">Join Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-semibold text-slate-700">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-slate-400">Loading users directory...</td>
                    </tr>
                  ) : users.length > 0 ? (
                    users
                      .filter(u => {
                        const query = searchQuery.toLowerCase();
                        return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
                      })
                      .map(u => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#0F172A]">{u.name}</td>
                          <td className="py-3.5 px-4 text-slate-500">
                            <div>{u.email}</div>
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{u.phone || 'No phone'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                              u.role === 'ADMIN' 
                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                              u.membershipTier === 'PLATINUM'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                : u.membershipTier === 'GOLD'
                                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                  : u.membershipTier === 'SILVER'
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : 'bg-zinc-800 text-slate-400 border-zinc-700'
                            }`}>
                              {u.membershipTier}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-[#22C55E]">{u.pointsBalance} pts</td>
                          <td className="py-3.5 px-4 text-center text-[#0F172A] font-extrabold">{u.bookingCount ?? 0} bookings</td>
                          <td className="py-3.5 px-4 text-slate-400 text-[10px]">
                            {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-slate-400">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Slots Directory Tab */}
        {activeTab === "slots" && (
          <div className="bg-white border border-slate-150 shadow-sm rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <h2 className="text-lg font-black text-[#0F172A]">Slot Inventory System</h2>
                <p className="text-xs text-slate-400 mt-0.5">Define slots and manage bookings schedules.</p>
              </div>
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <input 
                  type="date"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-[#22C55E] text-[#0F172A]"
                />
                <button
                  onClick={() => setShowCreateSlotModal(true)}
                  className="px-4 py-2 bg-[#22C55E] hover:bg-green-600 text-black font-black text-xs rounded-xl shadow-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus size={14} /> Create Slot
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-250 rounded-xl bg-slate-50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-250 bg-white/5 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Time Window</th>
                    <th className="py-3 px-4">Branch Venue</th>
                    <th className="py-3 px-4">Hourly Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-semibold text-slate-700">
                  {loadingSlots ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-400">Loading slot records...</td>
                    </tr>
                  ) : slots.length > 0 ? (
                    slots
                      .filter(s => {
                        if (!searchQuery) return true;
                        return s.date === searchQuery;
                      })
                      .map(s => {
                        const branchName = branches.find(b => b.id === s.branchId)?.name || 'Eagle Box Indiranagar';
                        return (
                          <tr key={s.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-[#0F172A]">
                              {new Date(s.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-3.5 px-4 text-[#0F172A] font-bold">{s.startTime} - {s.endTime}</td>
                            <td className="py-3.5 px-4 text-slate-500">{branchName}</td>
                            <td className="py-3.5 px-4 font-extrabold text-[#22C55E]">₹{s.price}</td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                s.status === "AVAILABLE"
                                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                                  : "bg-red-500/10 text-red-400 border-red-500/20"
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => handleDeleteSlot(s.id)}
                                disabled={s.status === "BOOKED"}
                                className={`px-2.5 py-1 font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                                  s.status === "BOOKED"
                                    ? "bg-zinc-800 text-slate-400 cursor-not-allowed border border-slate-100"
                                    : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                                }`}
                              >
                                <Trash size={12} /> Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-400">No slot inventory created.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Slot Modal */}
      {showCreateSlotModal && (
        <div className="fixed inset-0 bg-slate-50/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-slate-150 shadow-sm rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-[#0F172A]">Create New Slot</h3>
              <button 
                onClick={() => setShowCreateSlotModal(false)}
                className="text-slate-500 hover:text-[#0F172A] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Slot Date</label>
                <input 
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={createSlotForm.date}
                  onChange={(e) => setCreateSlotForm({ ...createSlotForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#22C55E] text-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Start Time (HH:MM)</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 09:00"
                    value={createSlotForm.startTime}
                    onChange={(e) => setCreateSlotForm({ ...createSlotForm, startTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#22C55E] text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">End Time (HH:MM)</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 10:00"
                    value={createSlotForm.endTime}
                    onChange={(e) => setCreateSlotForm({ ...createSlotForm, endTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#22C55E] text-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Price (₹)</label>
                <input 
                  type="number"
                  required
                  placeholder="e.g. 1200"
                  value={createSlotForm.price}
                  onChange={(e) => setCreateSlotForm({ ...createSlotForm, price: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#22C55E] text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Branch / Venue</label>
                <select
                  value={createSlotForm.branchId}
                  onChange={(e) => setCreateSlotForm({ ...createSlotForm, branchId: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#22C55E] text-[#0F172A]"
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} (₹{b.pricePerHour}/hr)</option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateSlotModal(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-[#0F172A] font-bold text-xs rounded-xl border border-slate-250 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreatingSlot}
                  className="px-5 py-2.5 bg-[#22C55E] hover:bg-green-600 disabled:opacity-50 text-black font-black text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {isCreatingSlot && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
