import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { 
  Trophy, Calendar, Clock, 
  LogOut, Bell, Gift, Activity, Loader2, Trash2, Shield, MapPin, User, Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import MockPaymentModal from '../components/MockPaymentModal';

// Helper to robustly parse YYYY-MM-DD and hh:mm AM/PM
const parseSlotDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return new Date(0);
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier && modifier.toUpperCase() === 'PM') hours = parseInt(hours, 10) + 12;
  return new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${minutes}:00`);
};

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
  const [, setLoadingOffers] = useState(true);
  const [coupons, setCoupons] = useState([]);

  // Modals / Dialog states
  const [selectedBookingForView, setSelectedBookingForView] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState(null);

  const [activeBookingsTab, setActiveBookingsTab] = useState("upcoming");
  const [mainTab, setMainTab] = useState("overview");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [, setTick] = useState(0);

  // Support Tickets States
  const [supportTickets, setSupportTickets] = useState([]);
  const [ticketForm, setTicketForm] = useState({ subject: '', category: 'Booking Issue', priority: 'Medium', message: '', attachmentUrl: '' });
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Reviews States
  const [myReviews, setMyReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ bookingId: '', rating: 5, message: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleInitiateMembership = (tier, price) => {
    setSelectedMembership({ tier, amountPaid: price });
    setShowPaymentModal(true);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    // Auto-open membership payment if pending
    const pendingMembershipStr = localStorage.getItem('pending_membership');
    if (pendingMembershipStr) {
      try {
        const pendingMembership = JSON.parse(pendingMembershipStr);
        window.setTimeout(() => {
          handleInitiateMembership(pendingMembership.tier, pendingMembership.amountPaid);
        }, 0);
        localStorage.removeItem('pending_membership');
      } catch (e) {
        console.error("Failed to parse pending membership", e);
      }
    }

    return () => clearInterval(timer);
  }, []);

  const handleMembershipSuccess = async () => {
    console.log(`[Membership] Mock payment successful for ${selectedMembership?.tier}. Activating on backend...`);
    try {
      const res = await api.post('/api/auth/membership/purchase', selectedMembership);
      console.log("[Membership] Backend activation successful. Updating local state...");
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setShowPaymentModal(false); // Close loading modal only after activation succeeds
      console.log("[Membership] Redirecting to Success page...");
      navigate('/customer/membership/success', { state: { tier: selectedMembership.tier, amountPaid: selectedMembership.amountPaid } });
    } catch (err) {
      console.error("[Membership] Activation failed:", err);
      toast.error(err.response?.data?.error || "Failed to process membership.");
      setShowPaymentModal(false);
    }
  };

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

  const handleRedeemPoints = async () => {
    if (user.pointsBalance < 1000) {
      toast.error("You need at least 1000 points to redeem a coupon.");
      return;
    }
    
    // Redeem in multiples of 1000
    const pointsToRedeem = Math.floor(user.pointsBalance / 1000) * 1000;
    
    try {
      const res = await api.post('/api/coupons/redeem', { pointsToRedeem });
      toast.success(`Redeemed ${pointsToRedeem} points for ₹${pointsToRedeem / 10} coupon!`);
      
      // Update local state
      setUser(prev => ({ ...prev, pointsBalance: res.data.pointsBalance }));
      localStorage.setItem('user', JSON.stringify({ ...user, pointsBalance: res.data.pointsBalance }));
      setCoupons(prev => [res.data.coupon, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to redeem points.");
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
        const fetchedBookings = res.data.bookings || [];
        setBookings(fetchedBookings);
        console.log("Total Bookings:", fetchedBookings.length);
        
        // Auto-prompt review if there's a recently completed booking without a review
        const now = new Date();
        const pendingReviewBooking = fetchedBookings.find(b => {
          if (b.reviewGiven) return false;
          const status = (b.status || "").toUpperCase();
          const endDateTime = parseSlotDateTime(b.slot.date, b.slot.endTime);
          return (status === 'COMPLETED' || (status === 'CONFIRMED' && endDateTime <= now));
        });
        
        if (pendingReviewBooking && !localStorage.getItem(`review_prompted_${pendingReviewBooking.id}`)) {
          setTimeout(() => {
            setReviewForm({ bookingId: pendingReviewBooking.id, rating: 5, message: '' });
            setShowReviewModal(true);
            localStorage.setItem(`review_prompted_${pendingReviewBooking.id}`, 'true');
          }, 2000);
        }
      })
      .catch(err => {
        console.error("Failed to fetch bookings:", err);
      });

    // Fetch unread notifications
    api.get('/api/notifications?unread=true')
      .then(res => setNotifications(res.data))
      .catch(err => console.error("Failed to fetch notifications:", err));

    // Fetch coupons
    api.get('/api/coupons')
      .then(res => setCoupons(res.data))
      .catch(err => console.error("Failed to fetch coupons:", err));

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

    // Fetch support tickets
    api.get('/api/support/my-tickets')
      .then(res => setSupportTickets(res.data))
      .catch(err => console.error("Failed to fetch tickets:", err));

    // Fetch my reviews
    api.get('/api/reviews/me')
      .then(res => setMyReviews(res.data))
      .catch(err => console.error("Failed to fetch reviews:", err));
  }, [navigate, user?.id]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setIsSubmittingTicket(true);
    try {
      const res = await api.post('/api/support', ticketForm);
      setSupportTickets([res.data, ...supportTickets]);
      setTicketForm({ subject: '', category: 'Booking Issue', priority: 'Medium', message: '', attachmentUrl: '' });
      toast.success("Support ticket created successfully!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create ticket.");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

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
        toast.success("Booking cancelled successfully. No refund has been issued. Membership slots (if used) remain consumed.");
        setShowCancelModal(false);
        setBookingToCancel(null);
        
        // Refresh bookings and profile
        api.get('/api/auth/profile').then(res => {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        });
        api.get(`/api/bookings/${user.id}`).then(res => setBookings(res.data.bookings));
      })
      .catch(err => {
        toast.error(err.response?.data?.error || "Failed to cancel booking.");
      });
  };



  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#22C55E]" />
      </div>
    );
  }

  const now = new Date();
  
  const upcomingBookings = bookings.filter(b => {
    const status = (b.status || "").toUpperCase();
    const endDateTime = parseSlotDateTime(b.slot.date, b.slot.endTime);
    return status === 'CONFIRMED' && endDateTime > now;
  });

  const historyBookings = bookings.filter(b => {
    const status = (b.status || "").toUpperCase();
    const endDateTime = parseSlotDateTime(b.slot.date, b.slot.endTime);
    return status === 'COMPLETED' || (status === 'CONFIRMED' && endDateTime <= now);
  });

  const cancelledBookings = bookings.filter(b => {
    const status = (b.status || "").toUpperCase();
    return status === 'CANCELLED';
  });

  const activeMemberships = user?.userMemberships?.filter(m => m.status === 'ACTIVE') || [];
  const hasActiveMembership = activeMemberships.length > 0;
  
  const allPurchasedMemberships = user?.userMemberships || [];
  const totalSlots = allPurchasedMemberships.reduce((sum, m) => sum + m.totalSlots, 0);
  const usedSlots = bookings.filter(b => b.bookingType === 'PREPAID' && b.status !== 'CANCELLED').length;
  const remainingSlots = Math.max(0, totalSlots - usedSlots);

  console.log("Total Slots:", totalSlots);
  console.log("Used Slots:", usedSlots);
  console.log("Remaining Slots:", remainingSlots);

  const highestTier = hasActiveMembership ? activeMemberships.reduce((acc, m) => {
    if (m.tier === 'CHAMPION') return 'CHAMPION';
    if (m.tier === 'ELITE' && acc !== 'CHAMPION') return 'ELITE';
    if (m.tier === 'PRO' && acc !== 'CHAMPION' && acc !== 'ELITE') return 'PRO';
    if (m.tier === 'STARTER' && acc === 'NONE') return 'STARTER';
    return acc;
  }, 'NONE') : 'NONE';

  const redeemedPoints = coupons.reduce((sum, c) => sum + (c.discountAmount * 10), 0);
  const availablePoints = user.pointsBalance || 0;
  const totalEarnedPoints = availablePoints + redeemedPoints;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#0F172A]">
      
      {/* 1. NAVBAR */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] w-[95%] mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to={user.role === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard'} onClick={() => setMainTab('overview')} className="text-xl font-black tracking-tight flex items-center gap-1.5 text-slate-900 select-none">
              <span className="text-[#22C55E]">EagleBox</span> Dashboard
            </Link>
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Home</Link>
              <button 
                onClick={() => {
                  setMainTab('overview');
                  setTimeout(() => {
                    const feedEl = document.getElementById("bookings-feed-section");
                    if (feedEl) {
                      feedEl.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
              >
                My Bookings
              </button>
              <button 
                onClick={() => setMainTab('rewards')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
              >
                Rewards
              </button>
              <button 
                onClick={() => setMainTab('membership')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
              >
                Membership
              </button>
              <button 
                onClick={() => setMainTab('support')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
              >
                Support
              </button>
              <button 
                onClick={() => setMainTab('reviews')}
                className={`text-xs font-bold transition-colors border-none bg-transparent cursor-pointer ${mainTab === 'reviews' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                My Reviews
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
                      <div className="flex gap-2">
                        <button 
                          onClick={handleMarkAllRead}
                          className="text-xs text-[#22C55E] hover:underline font-semibold cursor-pointer border-none bg-transparent"
                        >
                          Mark all read
                        </button>
                        <button 
                          onClick={() => {
                            api.delete('/api/notifications/clear').then(() => setNotifications([]));
                          }}
                          className="text-xs text-red-500 hover:underline font-semibold cursor-pointer border-none bg-transparent"
                        >
                          Clear
                        </button>
                      </div>
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
                      <span className="block text-sm font-black text-[#16A34A]">{highestTier}</span>
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
                        setMainTab('rewards');
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
        {mainTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
        
        {/* Welcome Banner Hero Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-150 p-8 sm:p-10 rounded-[28px] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-2 relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Welcome Back, {user.name} 👋
            </h1>
            <p className="text-slate-500 text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
              Your points balance is <strong className="text-[#16A34A] font-extrabold">{user.pointsBalance}</strong>. You are currently a <strong className="text-slate-800 font-extrabold uppercase">{highestTier !== 'NONE' ? highestTier : 'GUEST'}</strong> level member of the EagleBox Wicket Club.
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-6 md:mt-0 shrink-0 relative z-10">
            <button 
              onClick={() => setMainTab('rewards')}
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
            onClick={() => setMainTab('rewards')}
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
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Available Prepaid Slots</div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
                  {remainingSlots}
                  <span className="text-sm text-slate-500 font-bold ml-1">/ {totalSlots}</span>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-[#22C55E]/30 bg-[#22C55E]/10`}>
                <Shield className="w-6 h-6 text-[#22C55E]" />
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-500 mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span>Club Tier: <strong className="text-slate-800 uppercase">{highestTier !== 'NONE' ? highestTier : 'GUEST'}</strong></span>
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

        {/* 4. MEMBERSHIP OVERVIEW */}
        {hasActiveMembership && (
          <div className="bg-white border border-slate-150 p-8 rounded-[24px] shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Trophy size={18} className="text-[#22C55E]" /> Membership Overview
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Quick look at your active EagleBox membership status.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 shrink-0 bg-slate-50 border border-slate-200 px-6 py-4 rounded-xl">
                <div className="text-center sm:text-right sm:border-r border-slate-200 sm:pr-6">
                  <span className="text-lg font-black text-slate-900 block leading-none">{activeMemberships.length} Active Plan{activeMemberships.length !== 1 ? 's' : ''}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#22C55E] block mt-1">Status</span>
                </div>
                <div className="text-center sm:text-right">
                  <span className="text-lg font-black text-slate-900 block leading-none">{activeMemberships.reduce((sum, m) => sum + (m.totalSlots - m.usedSlots), 0)} / {activeMemberships.reduce((sum, m) => sum + m.totalSlots, 0)}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mt-1">Total Slots Remaining</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
                            <MapPin size={12} className="text-slate-400" /> {b.slot.branch?.location || 'Hyderabad'}
                          </div>

                          <div className="space-y-2 mt-4 text-xs font-semibold text-slate-600">
                            <div className="flex items-center gap-2">
                              <Calendar size={13} className="text-[#22C55E]" />
                              <span>{new Date(b.slot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock size={13} className="text-[#22C55E]" />
                              <span>{b.slot.startTime} - {b.slot.endTime}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400 font-mono tracking-widest bg-slate-100 px-2 py-0.5 rounded">ID: {b.id.substring(0, 8).toUpperCase()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-200/60 pt-4 mt-5 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-black text-base text-slate-900">₹{b.amountPaid}</span>
                            {b.bookingType && (
                              <span className={`text-[9px] font-black uppercase mt-0.5 px-1.5 py-0.5 inline-block rounded w-fit ${b.bookingType === 'PREPAID' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                {b.bookingType === 'PREPAID' && b.userMembership?.tier ? `${b.userMembership.tier} PREPAID` : b.bookingType}
                              </span>
                            )}
                          </div>
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
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Booking ID</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {historyBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{b.slot.branch?.name || 'Eagle Box Cricket'}</td>
                            <td className="py-3 px-4 text-slate-600">
                              {new Date(b.slot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}<br/>
                              <span className="text-[10px] text-slate-400">{b.slot.startTime} - {b.slot.endTime}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[10px] text-slate-500 uppercase tracking-wider">{b.id.substring(0, 8)}</td>
                            <td className="py-3 px-4 text-slate-900 font-bold">
                              ₹{b.amountPaid}
                              {b.bookingType && (
                                <div className={`text-[9px] font-black uppercase mt-1 px-1.5 py-0.5 inline-block rounded w-fit ${b.bookingType === 'PREPAID' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                  {b.bookingType === 'PREPAID' && b.userMembership?.tier ? `${b.userMembership.tier} PREPAID` : b.bookingType}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-green-50 text-green-700 border border-green-200 inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded">
                                {b.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button 
                                onClick={() => setSelectedBookingForView(b)}
                                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer mr-2"
                              >
                                Details
                              </button>
                              {!b.reviewGiven ? (
                                <button
                                  onClick={() => {
                                    setReviewForm({ bookingId: b.id, rating: 5, message: '' });
                                    setShowReviewModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                >
                                  ⭐ Rate Your Experience
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-500 font-bold text-xs rounded-lg cursor-not-allowed"
                                >
                                  ✓ Review Submitted
                                </button>
                              )}
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
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Booking ID</th>
                          <th className="py-3 px-4">Refund Status</th>
                          <th className="py-3 px-4">Cancel Date</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {cancelledBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{b.slot.branch?.name || 'Eagle Box Cricket'}</td>
                            <td className="py-3 px-4 text-slate-600">
                              {new Date(b.slot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}<br/>
                              <span className="text-[10px] text-slate-400">{b.slot.startTime} - {b.slot.endTime}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[10px] text-slate-500 uppercase tracking-wider">{b.id.substring(0, 8)}</td>
                            <td className="py-3 px-4 font-bold">
                              <span className="inline-block px-2 py-1 text-[10px] uppercase rounded-full tracking-wider bg-red-100 text-red-700">
                                {b.bookingType === 'PREPAID' ? 'Membership Slot Used' : 'Paid • Non Refundable'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">
                              {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
              <div className="grid grid-cols-2 gap-4">
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
                  onClick={() => setMainTab('rewards')}
                  className="p-6 bg-slate-50 border border-slate-150 rounded-2xl hover:border-[#22C55E]/45 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-center group border-none bg-transparent"
                >
                  <Trophy className="w-7 h-7 text-[#22C55E] mx-auto mb-3" />
                  <span className="block text-xs font-black text-slate-800 group-hover:text-[#22C55E] transition-colors">Redeem Rewards</span>
                </button>

                <button 
                  onClick={() => setMainTab('support')}
                  className="p-6 bg-slate-50 border border-slate-150 rounded-2xl hover:border-[#22C55E]/45 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer text-center group border-none bg-transparent"
                >
                  <User className="w-7 h-7 text-[#22C55E] mx-auto mb-3" />
                  <span className="block text-xs font-black text-slate-800 group-hover:text-[#22C55E] transition-colors">Support Center</span>
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR: OFFERS & CLUB REWARDS */}
          <div className="space-y-8">
            
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
                  <span className="text-slate-800 font-extrabold">eagleboxbookings@gmail.com</span>
                </div>
              </div>
            </div>

          </div>
        </div>
        </div>
        )}

        {/* REWARDS TAB */}
        {mainTab === 'rewards' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-150 p-8 rounded-[24px] shadow-sm">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Loyalty & Rewards</h2>
                <p className="text-slate-500 font-medium mt-1">Earn points on every booking. Redeem them for instant discounts.</p>
              </div>
              <div className="mt-4 md:mt-0 flex flex-col items-end">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Available Points</span>
                <span className="text-4xl font-black text-[#22C55E]">{availablePoints}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-150 p-6 rounded-[24px] shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Points Earned</div>
                <div className="text-2xl font-black text-slate-900">{totalEarnedPoints}</div>
              </div>
              <div className="bg-white border border-slate-150 p-6 rounded-[24px] shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Points Redeemed</div>
                <div className="text-2xl font-black text-slate-900">{redeemedPoints}</div>
              </div>
              <div className="bg-white border border-slate-150 p-6 rounded-[24px] shadow-sm bg-green-500/5 border-green-500/20">
                <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">Redeemable Value</div>
                <div className="text-2xl font-black text-green-700">₹{Math.floor(availablePoints / 1000) * 100}</div>
              </div>
              <div className="bg-white border border-slate-150 p-6 rounded-[24px] shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Lifetime Savings</div>
                <div className="text-2xl font-black text-slate-900">₹{user.lifetimeSavings || 0}</div>
              </div>
            </div>

            <div className="bg-white border border-slate-150 p-8 rounded-[24px] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-bold text-slate-700">Reward Progress</span>
                  <span className="text-xs font-bold text-slate-500">{Math.min(availablePoints, 1000)} / 1000 pts</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-[#22C55E] h-3 rounded-full transition-all duration-1000" style={{ width: `${(Math.min(availablePoints, 1000) / 1000) * 100}%` }}></div>
                </div>
                {availablePoints >= 1000 ? (
                  <p className="text-xs text-[#22C55E] mt-2 font-bold">You have enough points to unlock your next ₹100 coupon!</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-2 font-medium">Earn {1000 - availablePoints} more points to unlock your next ₹100 coupon.</p>
                )}
              </div>
              <button 
                onClick={handleRedeemPoints}
                disabled={availablePoints < 1000}
                className="shrink-0 px-8 py-4 bg-[#22C55E] hover:bg-[#16A34A] text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Generate Coupon
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-slate-150 rounded-[24px] p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-6 border-b border-slate-100 pb-4">Points History</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {[...bookings.filter(b => b.pointsEarned > 0).map(b => ({ date: b.createdAt, activity: 'Slot Booking', points: `+${b.pointsEarned}`, color: 'text-green-600' })),
                    ...coupons.map(c => ({ date: c.createdAt, activity: 'Coupon Redeemed', points: `-${c.discountAmount * 10}`, color: 'text-red-500' }))
                  ].sort((a, b) => new Date(b.date) - new Date(a.date)).map((hist, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{hist.activity}</div>
                        <div className="text-xs font-semibold text-slate-400">{new Date(hist.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                      <div className={`font-black ${hist.color}`}>{hist.points} pts</div>
                    </div>
                  ))}
                  {bookings.filter(b => b.pointsEarned > 0).length === 0 && coupons.length === 0 && (
                    <div className="text-center text-sm text-slate-400 py-4">No points history yet.</div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-150 rounded-[24px] p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-6 border-b border-slate-100 pb-4">🎟 Available Coupons</h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {[
                    ...dbOffers.map(o => ({ 
                      code: o.code, 
                      discount: `${o.discountPercent}%`, 
                      status: getCountdown(o.validTo) === 'Expired' ? 'Expired' : 'Active', 
                      expires: new Date(o.validTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) 
                    })), 
                    ...coupons.filter(c => !c.isUsed).map(c => ({ 
                      code: c.code, 
                      discount: `₹${c.discountAmount}`, 
                      status: 'Active', 
                      expires: 'No Expiry' 
                    }))
                  ].map((c, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm hover:border-[#22C55E]/50 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200/60 pb-4 mb-4">
                        <div>
                          <div className="font-mono text-xl font-black text-slate-800 tracking-wider mb-1">{c.code}</div>
                          <div className="text-sm font-bold text-[#22C55E]">{c.discount} Discount</div>
                        </div>
                        <div className="grid grid-cols-2 sm:flex sm:gap-8 gap-4 w-full sm:w-auto text-left sm:text-right">
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</div>
                            <div className={`text-sm font-black ${c.status === 'Active' ? 'text-[#22C55E]' : 'text-red-500'}`}>{c.status}</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Expires</div>
                            <div className="text-sm font-black text-slate-800">{c.expires}</div>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(c.code);
                          toast.success(`Coupon code "${c.code}" copied! 🎉`);
                        }}
                        disabled={c.status === 'Expired'}
                        className="w-full sm:w-auto px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Copy Coupon
                      </button>
                    </div>
                  ))}
                  {dbOffers.length === 0 && coupons.filter(c => !c.isUsed).length === 0 && (
                    <div className="text-center text-sm text-slate-400 py-4">No coupons available.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MEMBERSHIP TAB */}
        {mainTab === 'membership' && (
          <div className="space-y-8 animate-fadeIn">
            {(!user.userMemberships || user.userMemberships.length === 0) ? (
              <>
                <div className="max-w-3xl mx-auto py-8">
                  <div className="bg-slate-50 border border-slate-200 rounded-[24px] p-8 text-center shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-2xl">🚫</span>
                      </div>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">No Active Membership</h2>
                    <p className="text-slate-600 font-semibold mb-4">You currently do not have an active EagleBox membership.</p>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xl mx-auto mb-6">
                      Purchase a membership below to unlock prepaid slots, priority booking benefits, loyalty rewards, and exclusive member offers. Choose the plan that best fits your playing schedule.
                    </p>
                    <button 
                      onClick={() => {
                        const plansEl = document.getElementById("membership-plans-grid");
                        if (plansEl) plansEl.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Explore Membership Plans ↓
                    </button>
                  </div>
                </div>

                <div id="membership-plans-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1600px] w-full mx-auto mt-4">
                  {[
                    { tier: "STARTER", name: "Starter", price: 3999, desc: "Perfect for weekend warriors.", bg: "bg-white", border: "border-[#EEEDE8] hover:border-[#22C55E]/30", btn: "bg-[#F5F5F0] hover:bg-[#EEEDE8] text-[#1A1A1A]", text: "text-[#1A1A1A]", features: [{t:"4 Prepaid Slots",b:true}, {t:"Valid for 1 Month"}, {t:"Book any available slot"}, {t:"50 Loyalty Points / booking"}] },
                    { tier: "PRO", name: "Pro", price: 10999, desc: "Designed for casual weekly squads.", bg: "bg-white", border: "border-2 border-[#22C55E] shadow-xl hover:shadow-2xl", btn: "bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-lg shadow-green-500/15", text: "text-[#22C55E]", badge: "Most Popular", features: [{t:"12 Prepaid Slots",b:true}, {t:"Valid for 3 Months"}, {t:"Priority booking access"}, {t:"50 Loyalty Points / booking"}] },
                    { tier: "ELITE", name: "Elite", price: 19999, desc: "For teams playing multiple times a week.", bg: "bg-white", border: "border-[#EEEDE8] hover:border-[#3b82f6]/30", btn: "bg-[#F5F5F0] hover:bg-[#EEEDE8] text-[#1A1A1A]", text: "text-[#1A1A1A]", features: [{t:"37 Prepaid Slots",b:true}, {t:"Valid for 6 Months"}, {t:"Exclusive member offers"}, {t:"50 Loyalty Points / booking"}] },
                    { tier: "CHAMPION", name: "Champion", price: 29999, desc: "The ultimate VIP year-round experience.", bg: "bg-[#1A1A1A]", border: "border-[#333] hover:border-[#8b5cf6]/50", btn: "bg-white hover:bg-gray-100 text-[#1A1A1A]", text: "text-white", badge: "Premium", isDark: true, features: [{t:"50 Prepaid Slots",b:true}, {t:"Valid for 12 Months"}, {t:"VIP priority & tournaments"}, {t:"Premium support"}] }
                  ].map((opt) => (
                    <div key={opt.tier} className={`rounded-[24px] p-8 flex flex-col justify-between transition-all relative ${opt.bg} ${opt.border}`}>
                      {opt.badge && (
                        <div className={`absolute top-0 right-1/2 translate-y-[-50%] translate-x-[50%] ${opt.tier === 'CHAMPION' ? 'bg-[#8b5cf6]' : 'bg-[#22C55E]'} text-white text-[10px] font-black tracking-widest uppercase py-1.5 px-4 rounded-full shadow-md whitespace-nowrap`}>
                          {opt.badge}
                        </div>
                      )}
                      <div>
                        <h3 className={`text-xl font-extrabold mb-1 ${opt.isDark ? 'text-white' : 'text-[#1A1A1A]'}`}>{opt.name}</h3>
                        <p className={`text-xs font-semibold mb-6 ${opt.isDark ? 'text-white/60' : 'text-[#8A8A8A]'}`}>{opt.desc}</p>
                        
                        <div className="mb-6 flex items-baseline gap-1">
                          <span className={`text-4xl font-black ${opt.text}`}>₹{opt.price}</span>
                        </div>
                        
                        <ul className={`space-y-4 text-sm font-medium ${opt.isDark ? 'text-white/80' : 'text-[#8A8A8A]'}`}>
                          {opt.features.map((f, i) => (
                            <li key={i} className={`flex items-center gap-2.5 ${f.b && (opt.isDark ? 'text-white' : 'text-[#1A1A1A]')}`}>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${opt.tier === 'CHAMPION' ? 'bg-[#8b5cf6]/20 text-[#a78bfa]' : 'bg-[#22C55E]/10 text-[#22C55E]'}`}>✓</span>
                              {f.b ? <strong>{f.t}</strong> : f.t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        onClick={() => handleInitiateMembership(opt.tier, opt.price)}
                        className={`w-full mt-8 py-3.5 rounded-xl font-bold transition-all text-sm border-none cursor-pointer ${opt.btn}`}
                      >
                        Buy {opt.name}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-white border border-slate-150 p-8 rounded-[24px] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Trophy className="w-6 h-6 text-[#22C55E]" />
                      <h2 className="text-2xl font-black text-slate-900">Your Memberships</h2>
                    </div>
                    <p className="text-slate-500 font-medium">Manage your active subscriptions and benefits.</p>
                  </div>
                </div>

                {user.userMemberships.map((membership) => (
                  <div key={membership.id} className="border border-slate-200 rounded-[24px] overflow-hidden shadow-sm mb-6 bg-white">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                       <h3 className="text-xl font-black text-slate-900 uppercase">{membership.tier} Tier</h3>
                       <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${membership.status === 'ACTIVE' ? 'bg-[#22C55E]/10 text-[#16A34A] border-[#22C55E]/20' : 'bg-red-50 text-red-600 border-red-200'}`}>
                         {membership.status}
                       </span>
                    </div>
                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="bg-slate-50 border border-slate-150 p-6 rounded-[24px] shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Purchased</div>
                        <div className="text-lg font-black text-slate-900">
                          {new Date(membership.purchaseDate || membership.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-150 p-6 rounded-[24px] shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Expires</div>
                        <div className="text-lg font-black text-slate-900">
                           {new Date(membership.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-150 p-6 rounded-[24px] shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Slots</div>
                        <div className="text-lg font-black text-slate-900">{membership.totalSlots}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-150 p-6 rounded-[24px] shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Slots Used</div>
                        <div className="text-lg font-black text-slate-900">{membership.usedSlots}</div>
                      </div>
                      <div className="bg-green-50 border border-green-200 p-6 rounded-[24px] shadow-sm col-span-2 md:col-span-4 flex justify-between items-center">
                        <div className="text-sm font-bold text-green-800 uppercase tracking-widest">Remaining Prepaid Slots</div>
                        <div className="text-3xl font-black text-[#22C55E]">{Math.max(0, membership.totalSlots - membership.usedSlots)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-12 pt-8 border-t border-slate-200">
                  <h3 className="text-2xl font-black text-slate-900 mb-6 text-center">Stack More Memberships</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1600px] w-full mx-auto">
                    {[
                      { tier: "STARTER", name: "Starter", price: 3999, desc: "Perfect for weekend warriors.", bg: "bg-white", border: "border-[#EEEDE8] hover:border-[#22C55E]/30", btn: "bg-[#F5F5F0] hover:bg-[#EEEDE8] text-[#1A1A1A]", text: "text-[#1A1A1A]", features: [{t:"4 Prepaid Slots",b:true}, {t:"Valid for 1 Month"}, {t:"Book any available slot"}, {t:"50 Loyalty Points / booking"}] },
                      { tier: "PRO", name: "Pro", price: 10999, desc: "Designed for casual weekly squads.", bg: "bg-white", border: "border-2 border-[#22C55E] shadow-xl hover:shadow-2xl", btn: "bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-lg shadow-green-500/15", text: "text-[#22C55E]", badge: "Most Popular", features: [{t:"12 Prepaid Slots",b:true}, {t:"Valid for 3 Months"}, {t:"Priority booking access"}, {t:"50 Loyalty Points / booking"}] },
                      { tier: "ELITE", name: "Elite", price: 19999, desc: "For teams playing multiple times a week.", bg: "bg-white", border: "border-[#EEEDE8] hover:border-[#3b82f6]/30", btn: "bg-[#F5F5F0] hover:bg-[#EEEDE8] text-[#1A1A1A]", text: "text-[#1A1A1A]", features: [{t:"37 Prepaid Slots",b:true}, {t:"Valid for 6 Months"}, {t:"Exclusive member offers"}, {t:"50 Loyalty Points / booking"}] },
                      { tier: "CHAMPION", name: "Champion", price: 29999, desc: "The ultimate VIP year-round experience.", bg: "bg-[#1A1A1A]", border: "border-[#333] hover:border-[#8b5cf6]/50", btn: "bg-white hover:bg-gray-100 text-[#1A1A1A]", text: "text-white", badge: "Premium", isDark: true, features: [{t:"50 Prepaid Slots",b:true}, {t:"Valid for 12 Months"}, {t:"VIP priority & tournaments"}, {t:"Premium support"}] }
                    ].map((opt) => (
                      <div key={opt.tier} className={`rounded-[24px] p-8 flex flex-col justify-between transition-all relative ${opt.bg} ${opt.border}`}>
                        {opt.badge && (
                          <div className={`absolute top-0 right-1/2 translate-y-[-50%] translate-x-[50%] ${opt.tier === 'CHAMPION' ? 'bg-[#8b5cf6]' : 'bg-[#22C55E]'} text-white text-[10px] font-black tracking-widest uppercase py-1.5 px-4 rounded-full shadow-md whitespace-nowrap`}>
                            {opt.badge}
                          </div>
                        )}
                        <div>
                          <h3 className={`text-xl font-extrabold mb-1 ${opt.isDark ? 'text-white' : 'text-[#1A1A1A]'}`}>{opt.name}</h3>
                          <p className={`text-xs font-semibold mb-6 ${opt.isDark ? 'text-white/60' : 'text-[#8A8A8A]'}`}>{opt.desc}</p>
                          
                          <div className="mb-6 flex items-baseline gap-1">
                            <span className={`text-4xl font-black ${opt.text}`}>₹{opt.price}</span>
                          </div>
                          
                          <ul className={`space-y-4 text-sm font-medium ${opt.isDark ? 'text-white/80' : 'text-[#8A8A8A]'}`}>
                            {opt.features.map((f, i) => (
                              <li key={i} className={`flex items-center gap-2.5 ${f.b && (opt.isDark ? 'text-white' : 'text-[#1A1A1A]')}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${opt.tier === 'CHAMPION' ? 'bg-[#8b5cf6]/20 text-[#a78bfa]' : 'bg-[#22C55E]/10 text-[#22C55E]'}`}>✓</span>
                                {f.b ? <strong>{f.t}</strong> : f.t}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button
                          onClick={() => handleInitiateMembership(opt.tier, opt.price)}
                          className={`w-full mt-8 py-3.5 rounded-xl font-bold transition-all text-sm border-none cursor-pointer ${opt.btn}`}
                        >
                          Buy {opt.name}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUPPORT TAB */}
        {mainTab === 'support' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-white border border-slate-150 p-8 rounded-[24px] shadow-sm">
              <h2 className="text-3xl font-black text-slate-900 mb-2">Support Center</h2>
              <p className="text-slate-500 font-medium mb-8">Raise a ticket for any issues regarding bookings, payments, or your membership. Our team will get back to you shortly.</p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Ticket Form */}
                <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-200">
                  <h3 className="text-xl font-black text-slate-900 mb-6">Create New Ticket</h3>
                  <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
                      <input 
                        type="text" 
                        required 
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({...ticketForm, subject: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                        placeholder="Brief summary of your issue"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                        <select 
                          value={ticketForm.category}
                          onChange={(e) => setTicketForm({...ticketForm, category: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                        >
                          <option value="Booking Issue">Booking Issue</option>
                          <option value="Payment Issue">Payment Issue</option>
                          <option value="Refund Request">Refund Request</option>
                          <option value="Membership Issue">Membership Issue</option>
                          <option value="Loyalty Points Issue">Loyalty Points Issue</option>
                          <option value="Technical Problem">Technical Problem</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Priority</label>
                        <select 
                          value={ticketForm.priority}
                          onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                      <textarea 
                        required 
                        rows={4}
                        value={ticketForm.message}
                        onChange={(e) => setTicketForm({...ticketForm, message: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold resize-none"
                        placeholder="Please describe your issue in detail..."
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Optional Screenshot URL</label>
                      <input 
                        type="url" 
                        value={ticketForm.attachmentUrl}
                        onChange={(e) => setTicketForm({...ticketForm, attachmentUrl: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                        placeholder="https://..."
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmittingTicket}
                      className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white font-black py-3 rounded-xl transition-colors text-sm disabled:opacity-50"
                    >
                      {isSubmittingTicket ? "Submitting..." : "Submit Ticket"}
                    </button>
                  </form>
                </div>

                {/* Ticket History */}
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-6">My Tickets</h3>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {supportTickets.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50 rounded-[24px] border border-slate-200 border-dashed">
                        <span className="text-slate-400 font-medium">You haven't raised any support tickets yet.</span>
                      </div>
                    ) : (
                      supportTickets.map(ticket => (
                        <div key={ticket.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">{ticket.ticketId} • {new Date(ticket.createdAt).toLocaleDateString()}</span>
                              <h4 className="font-bold text-slate-900 text-sm">{ticket.subject}</h4>
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${
                              ticket.status === 'OPEN' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              ticket.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              ticket.status === 'RESOLVED' ? 'bg-green-50 text-green-700 border-green-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium line-clamp-2 mb-3 bg-slate-50 p-2 rounded-lg">{ticket.message}</p>
                          
                          {ticket.adminResponse && (
                            <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 p-3 rounded-xl mt-3">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#16A34A] block mb-1">Admin Response</span>
                              <p className="text-xs font-bold text-slate-800">{ticket.adminResponse}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REVIEWS TAB */}
        {mainTab === 'reviews' && (
          <div className="bg-white border border-slate-150 rounded-[24px] p-8 shadow-md">
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <Star className="text-[#22C55E]" /> My Reviews
            </h2>
            <p className="text-sm text-slate-500 font-medium mb-8">View and manage all the reviews you've shared about your EagleBox experiences.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myReviews.length === 0 ? (
                <div className="md:col-span-2 text-center py-16 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                  <span className="text-slate-400 font-medium text-sm">You haven't submitted any reviews yet. Complete a match to share your experience!</span>
                </div>
              ) : (
                myReviews.map(review => (
                  <div key={review.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">{review.branch?.name || 'Eagle Box Venue'}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mt-1">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex text-[#22C55E]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 italic bg-slate-50 p-4 rounded-xl">"{review.message}"</p>
                    {review.isApproved && (
                      <span className="inline-block mt-4 bg-green-50 text-green-700 border border-green-200 text-[10px] font-black uppercase px-2 py-1 rounded">
                        Published
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Cancel Booking?</h3>
            <div className="text-xs text-slate-600 mt-4 text-left bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="font-bold mb-2">You are about to cancel this booking. Please note:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
                <li>This cancellation is permanent.</li>
                <li>Your payment is NON-REFUNDABLE.</li>
                <li>If this booking was made using a Membership Plan, the consumed membership slot WILL NOT be restored.</li>
                <li>The booked pitch will become available for other players immediately after cancellation.</li>
              </ul>
              <p className="mt-3 font-bold text-center">Are you sure you want to continue?</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowCancelModal(false);
                  setBookingToCancel(null);
                }}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl border border-slate-200 text-xs transition-colors"
              >
                Cancel
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
                <span>User Name</span>
                <span className="text-slate-800 font-bold">{user.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Booking ID</span>
                <span className="font-mono text-slate-800 text-[10px] uppercase font-bold">{selectedBookingForView.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Ground Name</span>
                <span className="text-slate-800 font-bold">{selectedBookingForView.slot.branch?.name || 'Eagle Box Nagole'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Date</span>
                <span className="text-slate-800 font-bold">{new Date(selectedBookingForView.slot.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Time</span>
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
              
              {/* Additional Cancel Details if Cancelled */}
              {selectedBookingForView.status === 'CANCELLED' && (
                <>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span>Payment Status</span>
                    <span className="text-slate-800 font-bold">Paid</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span>Refund Status</span>
                    <span className="text-red-600 font-bold">Non Refundable</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span>Membership Used</span>
                    <span className="text-slate-800 font-bold">{selectedBookingForView.bookingType === 'PREPAID' ? 'Yes' : 'No'}</span>
                  </div>
                  {selectedBookingForView.bookingType === 'PREPAID' && (
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span>Membership Slot Returned</span>
                      <span className="text-red-600 font-bold">No</span>
                    </div>
                  )}
                </>
              )}

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


      {showPaymentModal && (
        <MockPaymentModal 
          amount={selectedMembership?.amountPaid}
          onSuccess={handleMembershipSuccess}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {/* Write Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-150 rounded-[24px] max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
              <h3 className="text-xl font-black text-slate-900">Rate Your Experience</h3>
              <button 
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingReview(true);
                try {
                  const res = await api.post('/api/reviews', reviewForm);
                  toast.success("Review submitted successfully!");
                  setShowReviewModal(false);
                  
                  // Optimistically update the booking and add to myReviews
                  setBookings(prev => prev.map(b => 
                    b.id === reviewForm.bookingId ? { ...b, reviewGiven: true, review: { rating: reviewForm.rating, message: reviewForm.message } } : b
                  ));
                  setMyReviews(prev => [res.data.review, ...prev]);
                } catch (err) {
                  toast.error(err.response?.data?.error || "Failed to submit review");
                } finally {
                  setIsSubmittingReview(false);
                }
              }} 
              className="space-y-5"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className={`text-3xl ${reviewForm.rating >= star ? 'text-yellow-400' : 'text-slate-200'} transition-colors`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="How was the turf quality? Facility?"
                  value={reviewForm.message}
                  onChange={(e) => setReviewForm({ ...reviewForm, message: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#22C55E]/20 focus:border-[#22C55E] outline-none resize-none transition-all placeholder:text-slate-400"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingReview || !reviewForm.message}
                  className="px-6 py-2.5 bg-[#22C55E] hover:bg-green-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl transition-colors flex items-center gap-2"
                >
                  {isSubmittingReview && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
