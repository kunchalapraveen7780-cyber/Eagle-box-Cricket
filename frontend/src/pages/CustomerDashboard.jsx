import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { 
  Trophy, Calendar, Clock, 
  LogOut, Bell, Gift, Activity, Loader2, Copy, Trash2, Shield, MapPin, User
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });
  const [bookings, setBookings] = useState([]);
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dbOffers, setDbOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(true);

  // Modals / Dialog states
  const [selectedBookingForView, setSelectedBookingForView] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);

  const [activeBookingsTab, setActiveBookingsTab] = useState("upcoming");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await api.patch('/api/auth/profile', {
        name: editForm.name,
        phone: editForm.phone
      });
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      toast.success("Profile updated successfully!");
      setShowEditProfileModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getMemberSince = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getCountdown = (validTo) => {
    const total = Date.parse(validTo) - Date.parse(new Date());
    if (total <= 0) return "Expired";
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m left`;
    }
    return `${hours}h ${minutes}m ${seconds}s left`;
  };

  // Clipboard toast helper
  const handleCopyCode = () => {
    const code = user?.referralCode || 'EBC-CODE';
    navigator.clipboard.writeText(code);
    toast.success("Referral code copied! 🎉");
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userData || !token) {
      navigate('/login/customer');
      return;
    }

    // Fetch refreshed user profile
    api.get('/api/auth/profile')
      .then(res => {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      })
      .catch(err => {
        console.error("Failed to fetch profile:", err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login/customer');
        }
      });

    // Fetch user bookings
    api.get(`/api/bookings/${user.id}`)
      .then(res => {
        setBookings(res.data);
      })
      .catch(err => {
        console.error("Failed to fetch bookings:", err);
      });

    // Fetch unread notifications
    api.get('/api/notifications?unread=true')
      .then(res => setNotifications(res.data))
      .catch(err => console.error("Failed to fetch notifications:", err));

    // Fetch active offers
    api.get('/api/offers')
      .then(res => {
        setDbOffers(res.data);
        setLoadingOffers(false);
      })
      .catch(err => {
        console.error("Failed to fetch offers:", err);
        setLoadingOffers(false);
      });
  }, [navigate, user?.id]);

  const handleMarkAllRead = () => {
    api.patch('/api/notifications/read-all')
      .then(() => {
        setNotifications([]);
        toast.success("All notifications marked as read!");
      })
      .catch(err => console.error("Failed to mark read all:", err));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success("Signed out successfully.");
    navigate('/');
  };

  const handleCancelBooking = (booking) => {
    setBookingToCancel(booking);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    if (!bookingToCancel) return;
    api.patch(`/api/bookings/${bookingToCancel.id}/cancel`)
      .then(() => {
        toast.success("Booking cancelled successfully!");
        setShowCancelModal(false);
        setBookingToCancel(null);
        
        // Refresh bookings and profile
        api.get('/api/auth/profile').then(res => {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        });
        api.get(`/api/bookings/${user.id}`).then(res => setBookings(res.data));
      })
      .catch(err => {
        toast.error(err.response?.data?.error || "Failed to cancel booking.");
      });
  };

  const handleRedeemPoints = (pointsToRedeem) => {
    setIsRedeemingPoints(true);
    api.post("/api/rewards/redeem", { points: pointsToRedeem })
      .then(res => {
        toast.success(res.data.message + " 🎉 Code: " + res.data.code);
        setShowRedeemModal(false);
        // Refresh profile & offers
        api.get('/api/auth/profile').then(r => {
          setUser(r.data);
          localStorage.setItem('user', JSON.stringify(r.data));
        });
        api.get('/api/offers').then(r => setDbOffers(r.data));
      })
      .catch(err => {
        toast.error(err.response?.data?.error || "Failed to redeem points.");
      })
      .finally(() => {
        setIsRedeemingPoints(false);
      });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#22C55E]" />
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingBookings = bookings.filter(b => b.slot.date >= todayStr && b.status !== 'CANCELLED');
  const historyBookings = bookings.filter(b => b.slot.date < todayStr && b.status !== 'CANCELLED');
  const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');

  // Tier calculation progress logic
  const points = user.pointsBalance || 0;
  let nextTier;
  let progressPercent;
  let pointsNeeded;
  
  if (points < 500) {
    nextTier = "SILVER";
    progressPercent = Math.min(100, Math.max(0, (points / 500) * 100));
    pointsNeeded = 500 - points;
  } else if (points < 1500) {
    nextTier = "GOLD";
    progressPercent = Math.min(100, Math.max(0, ((points - 500) / 1000) * 100));
    pointsNeeded = 1500 - points;
  } else if (points < 3000) {
    nextTier = "PLATINUM";
    progressPercent = Math.min(100, Math.max(0, ((points - 1500) / 1500) * 100));
    pointsNeeded = 3000 - points;
  } else {
    nextTier = "PLATINUM";
    progressPercent = 100;
    pointsNeeded = 0;
  }

  // Ring styling based on tier
  const tierRingClass = (() => {
    if (user.membershipTier === "SILVER") return "ring-4 ring-green-500/30 animate-pulse";
    if (user.membershipTier === "GOLD") return "ring-4 ring-yellow-500/40 animate-pulse";
    if (user.membershipTier === "PLATINUM") return "ring-4 ring-purple-500/50 animate-pulse border-purple-400";
    return "ring-2 ring-white/10";
  })();

  const tierBadgeColor = (() => {
    if (user.membershipTier === "SILVER") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (user.membershipTier === "GOLD") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    if (user.membershipTier === "PLATINUM") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    return "bg-zinc-800 text-slate-500 border-zinc-700";
  })();

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#0F172A]">
      
      {/* 1. NAVBAR */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] w-[95%] mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to={user.role === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard'} className="text-xl font-black tracking-tight flex items-center gap-1.5 text-slate-900 select-none">
              <span className="text-[#22C55E]">EagleBox</span> Dashboard
            </Link>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Home</Link>
              <Link to="/venues" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Locations</Link>
              <button 
                onClick={() => {
                  const feedEl = document.getElementById("bookings-feed-section");
                  if (feedEl) {
                    feedEl.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
              >
                My Bookings
              </button>
              <button 
                onClick={() => setShowRedeemModal(true)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
              >
                Rewards
              </button>
              <button 
                onClick={() => {
                  const supportEl = document.getElementById("club-helpdesk-section");
                  if (supportEl) {
                    supportEl.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
              >
                Support
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-slate-500 hover:text-slate-800 relative p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
                aria-label="Toggle notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-[#0F172A] animate-fadeIn">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Unread Alerts</span>
                    {notifications.length > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-xs text-[#22C55E] hover:underline font-semibold cursor-pointer border-none bg-transparent"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} className="p-3.5 hover:bg-slate-50 transition-colors text-left flex items-start gap-2.5 bg-green-500/5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] mt-2 shrink-0"></span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 leading-normal font-semibold">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs py-8 text-center">No new notifications.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar and Menu Dropdown */}
            <div className="relative pl-4 border-l border-slate-200">
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="focus:outline-none cursor-pointer border-none bg-transparent flex items-center"
                aria-label="Toggle profile menu"
              >
                {localStorage.getItem('google_picture') ? (
                  <img 
                    src={localStorage.getItem('google_picture')} 
                    alt="Profile" 
                    className="w-9 h-9 rounded-full border border-[#22C55E]/30 object-cover hover:opacity-90 transition-opacity" 
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-green-500/20 text-[#22C55E] flex items-center justify-center font-bold text-sm uppercase border border-[#22C55E]/30 hover:bg-green-500/30 transition-colors">
                    {getInitials(user.name)}
                  </div>
                )}
              </button>

              {/* Profile Dropdown Panel */}
              {showProfileDropdown && (
                <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-[#0F172A] p-5 space-y-4 animate-fadeIn">
                  
                  {/* User Info Header */}
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    {localStorage.getItem('google_picture') ? (
                      <img 
                        src={localStorage.getItem('google_picture')} 
                        alt="Profile" 
                        className="w-12 h-12 rounded-full border border-slate-150 object-cover" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-green-500/25 text-[#22C55E] flex items-center justify-center font-black text-base uppercase border border-[#22C55E]/30">
                        {getInitials(user.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-850 truncate text-sm">{user.name}</h4>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Member since {getMemberSince(user.createdAt)}</p>
                    </div>
                  </div>

                  {/* Stats Quick Info */}
                  <div className="grid grid-cols-2 gap-2 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                    <div>
                      <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Points</span>
                      <span className="block text-sm font-black text-slate-800">{user.pointsBalance} pts</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Club Tier</span>
                      <span className="block text-sm font-black text-[#16A34A]">{user.membershipTier}</span>
                    </div>
                  </div>

                  {/* Dropdown Menu actions */}
                  <div className="space-y-1 font-bold text-xs text-slate-600">
                    <button 
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowEditProfileModal(true);
                      }}
                      className="w-full text-left py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                    >
                      Edit Profile details
                    </button>
                    <button 
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setActiveBookingsTab("history");
                        const feedEl = document.getElementById("bookings-feed-section");
                        if (feedEl) feedEl.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full text-left py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                    >
                      Booking History
                    </button>
                    <button 
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setShowRedeemModal(true);
                      }}
                      className="w-full text-left py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                    >
                      Redeem Vouchers
                    </button>
                    <button 
                      onClick={() => {
                        setShowProfileDropdown(false);
                        toast.success("Notification preferences updated!");
                      }}
                      className="w-full text-left py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                    >
                      Notification Settings
                    </button>
                    <button 
                      onClick={() => {
                        setShowProfileDropdown(false);
                        toast.error("Please change your credentials via your Google account page or registration manager.");
                      }}
                      className="w-full text-left py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                    >
                      Change Password
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-end">
                    <button 
                      onClick={() => {
                        setShowProfileDropdown(false);
                        handleLogout();
                      }}
                      className="text-xs font-black text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer border-none bg-transparent"
                    >
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. BODY CONTAINER */}
      <div className="max-w-[1600px] w-[95%] mx-auto py-10 space-y-8 animate-fadeIn">
        
        {/* Welcome Banner Hero Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-150 p-8 sm:p-10 rounded-[28px] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-2 relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Welcome Back, {user.name} 👋
            </h1>
            <p className="text-slate-500 text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
              Your points balance is <strong className="text-[#16A34A] font-extrabold">{user.pointsBalance}</strong>. You are currently a <strong className="text-slate-800 font-extrabold uppercase">{user.membershipTier}</strong> level member of the EagleBox Wicket Club.
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-6 md:mt-0 shrink-0 relative z-10">
            <button 
              onClick={() => setShowRedeemModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer border-none"
            >
              View Rewards
            </button>
            <Link 
              to="/customer/book" 
              className="bg-[#22C55E] hover:bg-[#16A34A] text-white px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-green-500/15 hover:scale-[1.01] transition-all"
            >
              Book a Pitch
            </Link>
          </div>
        </div>

        {/* 3. OVERALL STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Loyalty Points */}
          <div 
            onClick={() => setShowRedeemModal(true)}
            className="bg-white border border-slate-150 p-8 rounded-[24px] flex flex-col justify-between hover:border-[#22C55E]/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer shadow-md min-h-[160px] relative overflow-hidden group"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Points Balance</div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 flex items-baseline gap-2">
                  {user.pointsBalance}
                  <span className="text-[10px] bg-green-500/10 text-[#22C55E] border border-green-500/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">REDEEM</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-500/10 text-[#22C55E] rounded-2xl flex items-center justify-center shrink-0 border border-green-500/20">
                <Trophy className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-500 mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
              <span className="text-[#22C55E] font-black">↑ +15%</span> gained this calendar month
            </div>
          </div>

          {/* Card 2: Active Bookings */}
          <div 
            onClick={() => {
              const feedEl = document.getElementById("bookings-feed-section");
              if (feedEl) feedEl.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-white border border-slate-150 p-8 rounded-[24px] flex flex-col justify-between hover:border-[#22C55E]/40 hover:-translate-y-1 transition-all duration-300 shadow-md min-h-[160px] cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Scheduled Bookings</div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
                  {upcomingBookings.length} Active
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
            <div className="text-[10px] font-black text-[#22C55E] hover:underline mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
              View upcoming scheduler →
            </div>
          </div>

          {/* Card 3: Membership Status */}
          <div className="bg-white border border-slate-150 p-8 rounded-[24px] flex flex-col justify-between hover:border-[#22C55E]/40 hover:-translate-y-1 transition-all duration-300 shadow-md min-h-[160px]">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Club Tier</div>
                <div className="mt-3">
                  <span className={`inline-block text-xs font-black uppercase px-3 py-1 rounded-md border ${tierBadgeColor}`}>
                    {user.membershipTier} Member
                  </span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${tierRingClass}`}>
                <Shield className="w-6 h-6 text-[#22C55E]" />
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-500 mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
              Tier yields up to 15% discount rules
            </div>
          </div>

          {/* Card 4: Referrals */}
          <div className="bg-white border border-slate-150 p-8 rounded-[24px] flex flex-col justify-between hover:border-[#22C55E]/40 hover:-translate-y-1 transition-all duration-300 shadow-md min-h-[160px]">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Referral Program</div>
                <div className="font-mono text-lg font-black text-slate-800 tracking-wider mt-3 uppercase">{user.referralCode || 'EBC-CODE'}</div>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center shrink-0 border border-purple-500/20">
                <Gift className="w-6 h-6" />
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
              <button 
                onClick={handleCopyCode}
                className="text-[10px] font-black text-[#22C55E] hover:underline cursor-pointer border-none bg-transparent flex items-center gap-1"
              >
                Copy Code
              </button>
              <button 
                onClick={() => {
                  const shareText = `Join me on EagleBox Wicket Arena! Use my code ${user.referralCode || 'EBC-CODE'} to sign up: http://localhost:5173/register/customer`;
                  navigator.clipboard.writeText(shareText);
                  toast.success("Referral link copied! 🚀");
                }}
                className="text-[10px] font-black text-slate-500 hover:text-slate-800 cursor-pointer border-none bg-transparent"
              >
                Share Link
              </button>
            </div>
          </div>

        </div>

        {/* 4. TIER PROGRESS SHINE BAR - Rewards Journey */}
        <div className="bg-white border border-slate-150 p-8 rounded-[24px] shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">Rewards Journey</h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Earn points through turf bookings and referral codes to rank up.</p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-3xl font-black text-slate-900">{Math.round(progressPercent)}%</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mt-0.5">Completed</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* The multi-node indicator progress bar */}
            <div className="relative">
              <div className="w-full bg-slate-100 border border-slate-200 h-5 rounded-full overflow-hidden relative">
                {/* Shimmer shining effect */}
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-green-500 h-full rounded-full transition-all duration-500 relative shimmer" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {/* Milestone Indicator Nodes overlay */}
              <div className="absolute inset-0 flex justify-between items-center px-1 pointer-events-none">
                {[
                  { name: "BRONZE", value: 0 },
                  { name: "SILVER", value: 500 },
                  { name: "GOLD", value: 1500 },
                  { name: "PLATINUM", value: 3000 }
                ].map((tierNode, idx) => {
                  const pointsCount = user.pointsBalance || 0;
                  const reached = pointsCount >= tierNode.value;
                  return (
                    <div key={idx} className="flex flex-col items-center select-none">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        reached 
                          ? 'bg-[#22C55E] border-white shadow-sm scale-110' 
                          : 'bg-white border-slate-350 shadow-sm'
                      }`}></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Labels under nodes */}
            <div className="flex justify-between items-start text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              <div>
                <span className="block text-slate-800 font-black">Bronze</span>
                <span className="block mt-0.5">0 pts</span>
              </div>
              <div className="text-center">
                <span className={`block font-black ${user.pointsBalance >= 500 ? 'text-[#16A34A]' : 'text-slate-400'}`}>Silver</span>
                <span className="block mt-0.5">500 pts</span>
              </div>
              <div className="text-center">
                <span className={`block font-black ${user.pointsBalance >= 1500 ? 'text-[#16A34A]' : 'text-slate-400'}`}>Gold</span>
                <span className="block mt-0.5">1500 pts</span>
              </div>
              <div className="text-right">
                <span className={`block font-black ${user.pointsBalance >= 3000 ? 'text-[#16A34A]' : 'text-slate-400'}`}>Platinum</span>
                <span className="block mt-0.5">3000 pts</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>Current Status: <strong className="text-slate-800 font-extrabold uppercase">{user.membershipTier}</strong></span>
            <span>{pointsNeeded > 0 ? `${pointsNeeded} points needed for ${nextTier} tier rank` : "Highest platinum tier secured! 🌟"}</span>
          </div>
        </div>

        {/* 5. MAIN CONTENT LAYOUT */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* LEFT PORTAL: ACTIVE CARD FEED */}
          <div className="xl:col-span-2 space-y-8">
            
            <div id="bookings-feed-section" className="bg-white border border-slate-150 rounded-[24px] p-8 shadow-md">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#22C55E]" /> Active Bookings Feed
                </h2>
                
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start sm:self-auto">
                  <button 
                    onClick={() => setActiveBookingsTab("upcoming")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none bg-transparent ${
                      activeBookingsTab === 'upcoming' 
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Upcoming ({upcomingBookings.length})
                  </button>
                  <button 
                    onClick={() => setActiveBookingsTab("history")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none bg-transparent ${
                      activeBookingsTab === 'history' 
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    History ({historyBookings.length})
                  </button>
                  <button 
                    onClick={() => setActiveBookingsTab("cancelled")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none bg-transparent ${
                      activeBookingsTab === 'cancelled' 
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Cancelled ({cancelledBookings.length})
                  </button>
                </div>
              </div>

              {/* Dynamic tab contents */}
              {activeBookingsTab === "upcoming" ? (
                upcomingBookings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {upcomingBookings.map((b) => (
                      <div key={b.id} className="bg-slate-50 border border-slate-150 p-6 rounded-2xl flex flex-col justify-between hover:border-[#22C55E]/40 transition-colors shadow-sm">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-extrabold text-sm text-slate-900 truncate">{b.slot.branch?.name || 'Eagle Box Cricket'}</h3>
                            <span className="bg-green-50 text-green-700 border border-green-100 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                              {b.status}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-500 mt-1.5 flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" /> {b.slot.branch?.location || 'Bangalore'}
                          </div>

                          <div className="space-y-2 mt-4 text-xs font-semibold text-slate-600">
                            <div className="flex items-center gap-2">
                              <Calendar size={13} className="text-[#22C55E]" />
                              <span>{new Date(b.slot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock size={13} className="text-[#22C55E]" />
                              <span>{b.slot.startTime} - {b.slot.endTime} (1 hr)</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-200/60 pt-4 mt-5 flex items-center justify-between">
                          <span className="font-black text-base text-slate-900">₹{b.amountPaid}</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedBookingForView(b)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Details
                            </button>
                            <button 
                              onClick={() => handleCancelBooking(b)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100/50 border border-red-200 text-red-600 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col items-center justify-center p-6 space-y-4">
                    <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <div className="text-xs text-slate-400 font-semibold">No upcoming pitch bookings scheduled.</div>
                    <Link to="/customer/book" className="bg-[#22C55E] hover:bg-[#16A34A] text-white px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide shadow-md shadow-green-500/10">Book a slot now</Link>
                  </div>
                )
              ) : activeBookingsTab === "history" ? (
                historyBookings.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Venue</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Time Window</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {historyBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{b.slot.branch?.name || 'Eagle Box Cricket'}</td>
                            <td className="py-3 px-4 text-slate-600">{new Date(b.slot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                            <td className="py-3 px-4 text-slate-600">{b.slot.startTime} - {b.slot.endTime}</td>
                            <td className="py-3 px-4 text-slate-900 font-bold">₹{b.amountPaid}</td>
                            <td className="py-3 px-4">
                              <span className="bg-green-50 text-green-700 border border-green-200 inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded">
                                {b.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button 
                                onClick={() => setSelectedBookingForView(b)}
                                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col items-center justify-center p-6 space-y-4">
                    <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div className="text-xs text-slate-400 font-semibold">No past booking records found.</div>
                  </div>
                )
              ) : (
                cancelledBookings.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Venue</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Time Window</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {cancelledBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{b.slot.branch?.name || 'Eagle Box Cricket'}</td>
                            <td className="py-3 px-4 text-slate-600">{new Date(b.slot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                            <td className="py-3 px-4 text-slate-600">{b.slot.startTime} - {b.slot.endTime}</td>
                            <td className="py-3 px-4 text-slate-900 font-bold">₹{b.amountPaid}</td>
                            <td className="py-3 px-4">
                              <span className="inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
                                {b.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button 
                                onClick={() => setSelectedBookingForView(b)}
                                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col items-center justify-center p-6 space-y-4">
                    <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div className="text-xs text-slate-400 font-semibold">No cancelled bookings recorded.</div>
                  </div>
                )
              )}
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="bg-white border border-slate-150 rounded-[24px] p-8 shadow-md">
              <h2 className="text-xl font-black text-slate-900 mb-6">Quick Tools</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => navigate('/customer/book')}
                  className="p-6 bg-slate-50 border border-slate-150 rounded-2xl hover:border-[#22C55E]/45 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-center group"
                >
                  <Calendar className="w-7 h-7 text-[#22C55E] mx-auto mb-3" />
                  <span className="block text-xs font-black text-slate-800 group-hover:text-[#22C55E] transition-colors">Book a Slot</span>
                </button>
                <button 
                  onClick={() => {
                    setActiveBookingsTab("history");
                    const feedEl = document.getElementById("bookings-feed-section");
                    if (feedEl) feedEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-6 bg-slate-50 border border-slate-150 rounded-2xl hover:border-[#22C55E]/45 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-center group border-none bg-transparent"
                >
                  <Activity className="w-7 h-7 text-[#22C55E] mx-auto mb-3" />
                  <span className="block text-xs font-black text-slate-800 group-hover:text-[#22C55E] transition-colors">View History</span>
                </button>
                <button 
                  onClick={() => setShowRedeemModal(true)}
                  className="p-6 bg-slate-50 border border-slate-150 rounded-2xl hover:border-[#22C55E]/45 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-center group border-none bg-transparent"
                >
                  <Trophy className="w-7 h-7 text-[#22C55E] mx-auto mb-3" />
                  <span className="block text-xs font-black text-slate-800 group-hover:text-[#22C55E] transition-colors">Redeem Rewards</span>
                </button>
                <button 
                  onClick={handleCopyCode}
                  className="p-6 bg-slate-50 border border-slate-150 rounded-2xl hover:border-[#22C55E]/45 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-center group border-none bg-transparent"
                >
                  <Gift className="w-7 h-7 text-[#22C55E] mx-auto mb-3" />
                  <span className="block text-xs font-black text-slate-800 group-hover:text-[#22C55E] transition-colors">Refer Friends</span>
                </button>
                <button 
                  onClick={() => {
                    const supportEl = document.getElementById("club-helpdesk-section");
                    if (supportEl) supportEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-6 bg-slate-50 border border-slate-150 rounded-2xl hover:border-[#22C55E]/45 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-center group border-none bg-transparent"
                >
                  <User className="w-7 h-7 text-[#22C55E] mx-auto mb-3" />
                  <span className="block text-xs font-black text-slate-800 group-hover:text-[#22C55E] transition-colors">Support Center</span>
                </button>
                <button 
                  onClick={() => {
                    toast.success("Downloading transaction receipts. Invoice locked! 📄");
                  }}
                  className="p-6 bg-slate-50 border border-slate-150 rounded-2xl hover:border-[#22C55E]/45 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-center group border-none bg-transparent"
                >
                  <Shield className="w-7 h-7 text-[#22C55E] mx-auto mb-3" />
                  <span className="block text-xs font-black text-slate-800 group-hover:text-[#22C55E] transition-colors">Download Invoice</span>
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR: OFFERS & CLUB REWARDS */}
          <div className="space-y-8">
            
            {/* Rewards & Offers dynamic Countdown */}
            <div className="bg-white border border-slate-150 rounded-[24px] p-8 shadow-md">
              <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#22C55E]" /> Active Promo Vouchers
              </h2>
              <p className="text-xs text-slate-500 mb-6 font-medium">Use these code triggers during checkouts for instant discounts.</p>
              
              {loadingOffers ? (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-[#22C55E]" />
                </div>
              ) : dbOffers.length > 0 ? (
                <div className="space-y-4">
                  {dbOffers.map((offer) => {
                    const countdown = getCountdown(offer.validTo);
                    const isExpired = countdown === "Expired";
                    return (
                      <div 
                        key={offer.id}
                        className={`bg-slate-50 border rounded-2xl p-6 flex flex-col justify-between gap-3 ${isExpired ? 'border-slate-100 opacity-55' : 'border-slate-150 hover:border-[#22C55E]/30'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-[10px] font-black uppercase px-2 py-0.5 rounded">
                              {offer.discountPercent}% OFF
                            </span>
                            <span className="block text-sm font-black text-slate-800 font-mono tracking-widest mt-2">{offer.code}</span>
                          </div>
                          
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(offer.code);
                              toast.success(`Coupon code "${offer.code}" copied!`);
                            }}
                            disabled={isExpired}
                            className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed border-none bg-transparent"
                            aria-label="Copy Coupon"
                          >
                            <Copy size={14} />
                          </button>
                        </div>

                        <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                          <span className={isExpired ? 'text-slate-400' : 'text-red-500 font-extrabold animate-pulse'}>
                            {countdown}
                          </span>
                          <button 
                            onClick={() => navigate("/customer/book")}
                            disabled={isExpired}
                            className="text-[#22C55E] hover:underline font-black cursor-pointer border-none bg-transparent"
                          >
                            Use Now
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 border border-slate-150 rounded-xl text-xs text-slate-500 font-medium">
                  No active coupon campaigns currently.
                </div>
              )}
            </div>

            {/* Support section */}
            <div id="club-helpdesk-section" className="bg-white border border-slate-150 rounded-[24px] p-8 shadow-md space-y-4">
              <h2 className="text-xl font-black text-slate-900">Club Helpdesk</h2>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">Have inquiries regarding slot reschedule timings or membership benefits? Get priority access to our support hotline.</p>
              <div className="text-xs text-slate-500 font-bold space-y-2 border-t border-slate-200 pt-4">
                <div className="flex justify-between">
                  <span>Hotline</span>
                  <span className="text-slate-800 font-extrabold">+91 98765 43210</span>
                </div>
                <div className="flex justify-between">
                  <span>Support Email</span>
                  <span className="text-slate-800 font-extrabold">support@eaglebox.com</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-55 p-4 animate-fadeIn">
          <form onSubmit={handleUpdateProfile} className="bg-white border border-slate-150 rounded-[24px] max-w-md w-full p-6 shadow-2xl text-[#0F172A]">
            <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
              <h3 className="text-lg font-black text-slate-900">Edit Profile Details</h3>
              <button 
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Full Name</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 transition-all outline-none font-bold text-xs focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Mobile Number</label>
                <input 
                  type="tel" 
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 transition-all outline-none font-bold text-xs focus:bg-white"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button 
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-xs rounded-xl border-none transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Booking Cancellation Confirmation Modal */}
      {showCancelModal && bookingToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-[24px] max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Cancel Reservation?</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
              Are you sure you want to cancel your booking at <strong>{bookingToCancel.slot.branch?.name || 'Eagle Box Cricket'}</strong> on {new Date(bookingToCancel.slot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ({bookingToCancel.slot.startTime})?
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowCancelModal(false);
                  setBookingToCancel(null);
                }}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl border border-slate-200 text-xs transition-colors"
              >
                No, Keep Booking
              </button>
              <button 
                onClick={handleConfirmCancel}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-red-600/15"
              >
                Yes, Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details View Modal */}
      {selectedBookingForView && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white border border-slate-150 rounded-[24px] max-w-md w-full p-6 shadow-2xl text-[#0F172A]">
            <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
              <h3 className="text-lg font-black text-slate-900">Booking Transaction Details</h3>
              <button 
                onClick={() => setSelectedBookingForView(null)}
                className="text-slate-400 hover:text-slate-700 text-sm border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-500">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Transaction Ref</span>
                <span className="font-mono text-slate-800 text-[10px] uppercase font-bold">{selectedBookingForView.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Venue Name</span>
                <span className="text-slate-800 font-bold">{selectedBookingForView.slot.branch?.name || 'Eagle Box Indiranagar'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Date</span>
                <span className="text-slate-800 font-bold">{new Date(selectedBookingForView.slot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Timing Window</span>
                <span className="text-slate-800 font-bold">{selectedBookingForView.slot.startTime} - {selectedBookingForView.slot.endTime}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Total Amount Paid</span>
                <span className="text-green-600 font-extrabold text-sm">₹{selectedBookingForView.amountPaid}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Points Awarded</span>
                <span className="text-yellow-600 font-bold">+{selectedBookingForView.pointsEarned} pts</span>
              </div>
              <div className="flex justify-between">
                <span>Booking Status</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                  selectedBookingForView.status === 'CONFIRMED'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {selectedBookingForView.status}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedBookingForView(null)}
              className="w-full mt-6 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl border border-slate-200 text-xs transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Rewards Redeem Center Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-55 p-4 animate-fadeIn">
          <div className="bg-white border border-slate-150 rounded-[24px] max-w-lg w-full p-6 shadow-2xl max-h-[85vh] flex flex-col text-[#0F172A]">
            <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-4 shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900">Milestone Voucher Center</h3>
                <p className="text-xs text-slate-500 mt-0.5">Voucher pool balance: <strong className="text-yellow-600 font-extrabold">{user.pointsBalance} pts</strong></p>
              </div>
              <button 
                onClick={() => setShowRedeemModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm border-none bg-transparent cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 pr-1 py-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { points: 500, discount: "10%", desc: "10% off next booking" },
                  { points: 1000, discount: "20%", desc: "20% off next booking" },
                  { points: 1500, discount: "30%", desc: "30% off next booking" }
                ].map((opt) => {
                  const canRedeem = user.pointsBalance >= opt.points;
                  return (
                    <div key={opt.points} className={`border rounded-xl p-4 flex flex-col items-center justify-between text-center transition-all bg-slate-50 ${
                      canRedeem ? 'border-green-500/30' : 'border-slate-200 opacity-60'
                    }`}>
                      <div className="w-8 h-8 bg-[#22C55E]/10 rounded-full flex items-center justify-center text-sm mb-2 text-[#22C55E]">
                        🏆
                      </div>
                      <span className="font-extrabold text-slate-800 text-base">{opt.discount} Off</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 mb-3">{opt.desc}</span>
                      <button
                        onClick={() => handleRedeemPoints(opt.points)}
                        disabled={!canRedeem || isRedeemingPoints}
                        className={`w-full py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer border-none ${
                          canRedeem 
                            ? 'bg-[#22C55E] hover:bg-green-600 text-white shadow-sm' 
                            : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                        }`}
                      >
                        {opt.points} pts
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end shrink-0 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setShowRedeemModal(false)}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
