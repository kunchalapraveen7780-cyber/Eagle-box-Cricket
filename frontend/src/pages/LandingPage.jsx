import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, Trophy, Zap, Gift, Check, ChevronDown, Star, Calendar
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import PremiumVenueCard from '../components/PremiumVenueCard';
import VenuePreviewModal from '../components/VenuePreviewModal';
import { GoogleLogin } from '@react-oauth/google';
import useScrollReveal from '../hooks/useScrollReveal';

// Self-contained CSS Styles Sheet
const styleSheetContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  /* Global variables strictly aligned to the white/green palette */
  :root {
    --primary-green: #22C55E;
    --green-dark: #16A34A;
    --green-glow: rgba(34, 197, 94, 0.12);
    --white: #FFFFFF;
    --cream: #FAFAF7;
    --cream-dark: #F5F5F0;
    --cream-border: #EEEDE8;
    --text-dark: #1A1A1A;
    --text-muted: #8A8A8A;
    --footer-bg: #1A1A1A;
  }

  /* Font reset */
  .landing-page-root {
    font-family: 'Inter', sans-serif !important;
    background-color: var(--white);
    color: var(--text-dark);
    scroll-behavior: smooth;
  }

  /* Grid dot pattern for Hero Section */
  .hero-dot-grid {
    background-image: radial-gradient(circle, rgba(34, 197, 94, 0.12) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  /* Radial green light behind hero title */
  .hero-radial-glow {
    background: radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 60%);
  }

  /* Custom badge glow pulse */
  @keyframes glowPulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
    }
  }

  .pulse-badge {
    animation: glowPulse 2s infinite;
  }

  /* Floating animation for slot booking confirmed card */
  @keyframes floatCard {
    0%, 100% {
      transform: translateY(0) rotate(-3deg);
    }
    50% {
      transform: translateY(-14px) rotate(-3deg);
    }
  }

  .floating-card {
    animation: floatCard 4s ease-in-out infinite;
  }

  /* Live Pulsing Dot indicator */
  @keyframes pulseLive {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
  }

  .pulse-live-dot {
    animation: pulseLive 1.5s infinite;
  }



  /* Button Shine effect */
  @keyframes shine {
    100% { left: 125%; }
  }

  .btn-shine-sweep {
    position: relative;
    overflow: hidden;
  }

  .btn-shine-sweep::after {
    content: '';
    position: absolute;
    top: 0;
    left: -50%;
    width: 30%;
    height: 100%;
    background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0) 100%);
    transform: skewX(-25deg);
    transition: none;
  }

  .btn-shine-sweep:hover::after {
    animation: shine 0.85s ease-in-out;
  }

  /* Underline link animation in Navbar */
  .nav-link {
    position: relative;
    color: var(--text-dark);
    font-weight: 600;
    font-size: 0.875rem;
    transition: color 0.2s ease-in-out;
  }

  .nav-link::after {
    content: '';
    position: absolute;
    width: 100%;
    transform: scaleX(0);
    height: 2px;
    bottom: -4px;
    left: 0;
    background-color: var(--primary-green);
    transform-origin: bottom right;
    transition: transform 0.25s ease-out;
  }

  .nav-link:hover::after {
    transform: scaleX(1);
    transform-origin: bottom left;
  }

  .nav-link:hover {
    color: var(--primary-green);
  }

  .nav-link.active::after {
    transform: scaleX(1);
  }

  .nav-link.active {
    color: var(--green-dark);
  }

  /* Zoom image effect inside cards */
  .img-zoom {
    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .img-zoom:hover {
    transform: scale(1.08);
  }

  /* Card overlay trigger on hover */
  .card-overlay {
    background: linear-gradient(to top, rgba(22, 163, 74, 0.85) 0%, rgba(34, 197, 94, 0.4) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  /* Infinite Scrolling Review Marquee */
  @keyframes scrollLeft {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  @keyframes scrollRight {
    0% { transform: translateX(-50%); }
    100% { transform: translateX(0); }
  }

  .marquee-left {
    display: flex;
    width: max-content;
    animation: scrollLeft 38s linear infinite;
  }

  .marquee-right {
    display: flex;
    width: max-content;
    animation: scrollRight 38s linear infinite;
  }

  .marquee-container:hover .marquee-left,
  .marquee-container:hover .marquee-right {
    animation-play-state: paused;
  }

  /* Fade up reveal transitions handled via scroll hook */
  .fade-up {
    opacity: 0;
    transform: translateY(32px);
    transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .fade-up.visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Why Us Cards hover transitions */
  .why-card {
    background-color: var(--cream);
    border: 1px solid var(--cream-border);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .why-card:hover {
    background-color: var(--white);
    box-shadow: 0 10px 30px -10px rgba(34, 197, 94, 0.25);
    border-color: var(--primary-green);
    transform: translateY(-4px);
  }

  .why-card:hover .icon-glow {
    box-shadow: 0 0 16px rgba(34, 197, 94, 0.55);
  }

  /* Mobile drawer slide from right */
  .mobile-drawer {
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .mobile-drawer.open {
    transform: translateX(0);
  }

  .drawer-overlay {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }

  .drawer-overlay.open {
    opacity: 1;
    pointer-events: auto;
  }

  /* Hide scrollbar for Chrome, Safari and Opera */
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
  /* Hide scrollbar for IE, Edge and Firefox */
  .scrollbar-none {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }

  /* Custom Date Picker override to make the whole wrapper clickable */
  input[type="date"]::-webkit-calendar-picker-indicator {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
`;

export default function LandingPage() {
  const navigate = useNavigate();
  useScrollReveal();

  // Search form state
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  
  // Venue Modal state
  const [selectedPreviewVenue, setSelectedPreviewVenue] = useState(null);

  // Auth & General state
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [, setShowFloatButton] = useState(false);

  const [branchesList, setBranchesList] = useState([]);
  
  // Reviews state
  const [reviews, setReviews] = useState([]);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [modalMode, setModalMode] = useState("login"); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authShowPassword, setAuthShowPassword] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authReferralCode, setAuthReferralCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Animated stats count state
  const [stats, setStats] = useState({ rating: 1.0, bookings: 40000, players: 10000, locations: 1 });
  const statSectionRef = useRef(null);
  const [hasTriggeredStats, setHasTriggeredStats] = useState(false);

  useEffect(() => {
    // Read auth token on mount
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Error parsing stored user:", err);
      }
    }
  }, []);

  // Fetch branches
  useEffect(() => {
    api.get('/api/branches')
      .then(res => {
        setBranchesList(res.data);
      })
      .catch(err => {
        console.error("Error fetching branches:", err);
        const fallbackBranches = [
          { id: 'nagole', name: 'Eagle Box Nagole', location: 'Nagole, Hyderabad', pricePerHour: 800 },
          { id: 'uppal', name: 'Eagle Box Uppal', location: 'Uppal, Hyderabad', pricePerHour: 900 },
          { id: 'gachibowli', name: 'Eagle Box Gachibowli', location: 'Gachibowli, Hyderabad', pricePerHour: 1500 },
          { id: 'kukatpally', name: 'Eagle Box Kukatpally', location: 'Kukatpally, Hyderabad', pricePerHour: 1200 }
        ];
        setBranchesList(fallbackBranches);
      });
  }, []);

  // Fetch reviews
  useEffect(() => {
    api.get('/api/reviews/public')
      .then(res => {
        const fetchedReviews = res.data || [];
        
        // Ensure at least 10 reviews by mixing in demo data
        const demoReviews = [
          { id: 'd1', userName: 'Rahul R.', branch: { name: 'Eagle Box Nagole' }, rating: 5, message: 'Excellent turf quality and smooth booking experience. Highly recommended.', createdAt: new Date().toISOString() },
          { id: 'd2', userName: 'Sandeep K.', branch: { name: 'Eagle Box Uppal' }, rating: 5, message: 'Floodlights are amazing for night matches. Will definitely book again.', createdAt: new Date().toISOString() },
          { id: 'd3', userName: 'Praveen M.', branch: { name: 'Eagle Box Kompally' }, rating: 5, message: 'Clean facilities and good parking space.', createdAt: new Date().toISOString() },
          { id: 'd4', userName: 'Karthik R.', branch: { name: 'Eagle Box Madhapur' }, rating: 5, message: 'Best box cricket experience in Hyderabad.', createdAt: new Date().toISOString() },
          { id: 'd5', userName: 'Naveen P.', branch: { name: 'Eagle Box Kukatpally' }, rating: 5, message: 'Fast booking process and great support team.', createdAt: new Date().toISOString() },
          { id: 'd6', userName: 'Arjun S.', branch: { name: 'Eagle Box Hitech' }, rating: 5, message: 'Eagle Box has the absolute best quality turf. Friendly staff.', createdAt: new Date().toISOString() },
          { id: 'd7', userName: 'Vikram M.', branch: { name: 'Eagle Box Gachibowli' }, rating: 5, message: 'Top notch box setups. Zero dark spots in the play zone.', createdAt: new Date().toISOString() },
          { id: 'd8', userName: 'Sneha G.', branch: { name: 'Eagle Box Kondapur' }, rating: 5, message: 'Our weekly corporate games are held here. Clean drinking water and ample parking.', createdAt: new Date().toISOString() },
          { id: 'd9', userName: 'Manoj K.', branch: { name: 'Eagle Box Gachibowli' }, rating: 5, message: 'A great place to play with corporate friends.', createdAt: new Date().toISOString() },
          { id: 'd10', userName: 'Ravi T.', branch: { name: 'Eagle Box Miyapur' }, rating: 5, message: 'Superb platform! Booking a slot takes only 3 clicks.', createdAt: new Date().toISOString() }
        ];

        if (fetchedReviews.length >= 10) {
          setReviews(fetchedReviews);
        } else {
          setReviews([...fetchedReviews, ...demoReviews.slice(0, 10 - fetchedReviews.length)]);
        }
      })
      .catch(err => console.error("Error fetching reviews:", err));
  }, []);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      api.get('/api/notifications?unread=true')
        .then(res => setNotifications(res.data))
        .catch(err => console.error("Error fetching notifications:", err));
    }
  }, [user]);

  // Float button scroll observer and count-ups trigger
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatButton(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);

    // Dynamic stats IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !hasTriggeredStats) {
        setHasTriggeredStats(true);
        
        let startRating = 1.0;
        let startBookings = 45000;
        let startPlayers = 12000;
        let startLocations = 1;
        
        const duration = 1500; // 1.5 seconds count animation
        const startTime = performance.now();
        
        const animate = (currentTime) => {
          const elapsedTime = currentTime - startTime;
          const progress = Math.min(elapsedTime / duration, 1);
          
          // Easing function
          const easeOutQuad = (x) => 1 - (1 - x) * (1 - x);
          const easedProgress = easeOutQuad(progress);
          
          setStats({
            rating: parseFloat((startRating + easedProgress * 3.8).toFixed(1)),
            bookings: Math.floor(startBookings + easedProgress * 5000),
            players: Math.floor(startPlayers + easedProgress * 3000),
            locations: Math.floor(startLocations + easedProgress * 5)
          });
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.1 });

    const currentRef = statSectionRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasTriggeredStats]);

  // Active section tracker
  useEffect(() => {
    const sections = ["home", "features", "venues", "why-us", "membership"];
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };
    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: "-40% 0px -50% 0px",
      threshold: 0
    });

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleAnchorClick = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileMenuOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!selectedBranch) {
      toast.error("Please select a branch");
      return;
    }

    const mappedBranch = branchesList.find(b => b.name.includes(selectedBranch) || b.id === selectedBranch) || branchesList[0];
    const pendingBooking = {
      branch: mappedBranch,
      date: selectedDate || new Date().toISOString().split("T")[0],
      time: "",
      duration: 1,
      amount: mappedBranch.pricePerHour,
      slotId: ""
    };

    localStorage.setItem("pending_booking", JSON.stringify(pendingBooking));
    
    if (user) {
      navigate('/customer/book');
    } else {
      setModalMode("login");
      setShowAuthModal(true);
    }
  };

  const handleBookNowClick = (branchObj = null) => {
    if (branchObj) {
      const pendingBooking = {
        branch: branchObj,
        date: new Date().toISOString().split("T")[0],
        time: "",
        duration: 1,
        amount: branchObj.pricePerHour,
        slotId: ""
      };
      localStorage.setItem("pending_booking", JSON.stringify(pendingBooking));
    }

    if (user) {
      navigate('/customer/book');
    } else {
      setModalMode("login");
      setShowAuthModal(true);
    }
  };

  const handleMembershipClick = (tier, price) => {
    const pendingMembership = { tier, amountPaid: price };
    localStorage.setItem("pending_membership", JSON.stringify(pendingMembership));

    if (user) {
      navigate('/customer/dashboard');
    } else {
      setModalMode("login");
      setShowAuthModal(true);
    }
  };

  const handleModalLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email: authEmail, password: authPassword });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      setShowAuthModal(false);
      toast.success("Welcome back!");

      if (localStorage.getItem('pending_booking')) {
        navigate('/customer/book');
      } else if (localStorage.getItem('pending_membership')) {
        navigate('/customer/dashboard');
      } else {
        navigate(res.data.user.role === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Check credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleModalRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      await api.post('/api/auth/register', { 
        name: authName,
        email: authEmail,
        phone: authPhone,
        password: authPassword,
        referralCode: authReferralCode
      });
      toast.success('Registration successful! Auto-logging you in...');
      
      const res = await api.post('/api/auth/login', { email: authEmail, password: authPassword });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      
      // Post registration: Apply referral code if present
      if (authReferralCode) {
        try {
          await api.post('/api/referrals/apply', { referralCode: authReferralCode });
          toast.success("Referral code applied! 🎉");
        } catch (refErr) {
          console.error("Referral apply failed:", refErr);
        }
      }

      setShowAuthModal(false);

      if (localStorage.getItem('pending_booking')) {
        navigate('/customer/book');
      } else if (localStorage.getItem('pending_membership')) {
        navigate('/customer/dashboard');
      } else {
        navigate('/customer/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post('/api/auth/google-login', {
        credential: credentialResponse.credential,
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      setShowAuthModal(false);
      toast.success("Google Login Successful!");

      if (localStorage.getItem('pending_booking')) {
        navigate('/customer/book');
      } else if (localStorage.getItem('pending_membership')) {
        navigate('/customer/dashboard');
      } else {
        navigate('/customer/dashboard');
      }
    } catch {
      toast.error('Google Login failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowProfileDropdown(false);
    toast.success("Logged out successfully");
    navigate('/');
  };

  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  let userRole = null;
  if (storedUser) {
    try {
      userRole = JSON.parse(storedUser)?.role;
    } catch {
      // Ignore parsing errors
    }
  }

  const logoLink = token && userRole === 'ADMIN' 
    ? '/admin/dashboard' 
    : (token && userRole === 'CUSTOMER' ? '/customer/dashboard' : '/');



  return (
    <div className="landing-page-root min-h-screen relative selection:bg-[#22C55E]/20 selection:text-black">
      {/* Injected style tag for advanced custom styles */}
      <style dangerouslySetInnerHTML={{ __html: styleSheetContent }} />

      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-[20px] bg-white/85 border-b border-[#EEEDE8] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to={logoLink} className="flex items-center gap-2.5 font-black text-2xl tracking-tight text-[#1A1A1A] group">
            {/* SVG Logo */}
            <svg className="w-8 h-8 text-[#22C55E] transform group-hover:scale-110 transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="8" width="1.5" height="12" rx="0.5" fill="#22C55E" stroke="none" />
              <rect x="11.25" y="8" width="1.5" height="12" rx="0.5" fill="#22C55E" stroke="none" />
              <rect x="13.5" y="8" width="1.5" height="12" rx="0.5" fill="#22C55E" stroke="none" />
              <rect x="8.5" y="6.5" width="7" height="1" rx="0.3" fill="#16A34A" stroke="none" />
              <circle cx="17.5" cy="16.5" r="2.5" fill="#22C55E" stroke="none" />
              <path d="M16 15c0.5-0.5 1.5-0.5 2 0" stroke="#FFFFFF" strokeWidth="0.5" strokeLinecap="round" />
            </svg>
            <span className="font-extrabold tracking-tight">Eagle<span className="text-[#22C55E]">Box</span></span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className={`nav-link ${activeSection === 'features' ? 'active' : ''}`}>Features</a>
            <a href="#venues" onClick={(e) => handleAnchorClick(e, 'venues')} className={`nav-link ${activeSection === 'venues' ? 'active' : ''}`}>Venues</a>
            <a href="#why-us" onClick={(e) => handleAnchorClick(e, 'why-us')} className={`nav-link ${activeSection === 'why-us' ? 'active' : ''}`}>Why Us</a>
            <a href="#membership" onClick={(e) => handleAnchorClick(e, 'membership')} className={`nav-link ${activeSection === 'membership' ? 'active' : ''}`}>Membership</a>
            
            {user ? (
              <div className="flex items-center gap-5 border-l border-[#EEEDE8] pl-6">
                
                {/* Green Notification Bell */}
                <div className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-[#22C55E] hover:text-[#16A34A] rounded-full hover:bg-[#F5F5F0] border border-[#EEEDE8] transition-colors">
                    <span className="relative inline-block">
                      <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {notifications.length > 0 && (
                        <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-[#22C55E] ring-2 ring-white" />
                      )}
                    </span>
                  </button>
                  
                  {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 bg-white border border-[#EEEDE8] rounded-2xl shadow-xl z-50 p-2 text-left text-[#1A1A1A]">
                      <div className="px-3 py-2 font-bold border-b border-[#EEEDE8] text-xs text-[#8A8A8A] uppercase tracking-wider">Unread Alerts</div>
                      <div className="max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="text-center text-xs text-[#8A8A8A] py-8">No new alerts</div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className="p-3 rounded-xl text-xs mt-1 transition-colors bg-[#FAFAF7] text-[#1A1A1A] border border-[#EEEDE8]">
                              {n.message}
                            </div>
                          ))
                        )}
                      </div>
                      <Link to="/customer/dashboard" className="block text-center text-xs font-bold text-[#22C55E] pt-2 border-t border-[#EEEDE8] mt-2 pb-1 hover:underline">Open Dashboard</Link>
                    </div>
                  )}
                </div>

                {/* Profile Circle Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-2 text-left focus:outline-none cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#22C55E] text-white flex items-center justify-center font-black text-sm border border-[#16A34A] uppercase shadow-sm">
                      {user.name.charAt(0)}
                    </div>
                    <ChevronDown size={14} className={`text-[#8A8A8A] transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-3 w-52 bg-white border border-[#EEEDE8] rounded-2xl shadow-xl z-50 py-2 text-[#1A1A1A]">
                      <div className="px-4 py-2 border-b border-[#EEEDE8] mb-1">
                        <span className="block text-xs font-bold text-[#1A1A1A] truncate">{user.name}</span>
                        <span className="block text-[10px] text-[#8A8A8A] truncate">{user.email}</span>
                      </div>
                      <Link to={user.role === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard'} className="block px-4 py-2.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#FAFAF7] hover:text-[#22C55E] transition-colors">Dashboard</Link>
                      <button onClick={handleLogout} className="w-full text-left block px-4 py-2.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#FAFAF7] hover:text-[#22C55E] border-t border-[#EEEDE8] mt-1 transition-colors">Sign Out</button>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex items-center gap-4 border-l border-[#EEEDE8] pl-6">
                <button onClick={() => { setModalMode("login"); setShowAuthModal(true); }} className="text-sm font-semibold text-[#1A1A1A] hover:text-[#22C55E] transition-all cursor-pointer bg-transparent border-none">Login</button>
                <button onClick={() => handleBookNowClick()} className="bg-[#22C55E] hover:bg-[#16A34A] px-5 py-2.5 text-sm rounded-full font-bold text-white shadow-lg shadow-green-500/15 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer btn-shine-sweep">Book a Slot</button>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col justify-between w-6 h-4.5 bg-transparent border-none p-0 cursor-pointer z-50 text-[#1A1A1A]"
            aria-label="Toggle Menu"
          >
            <div className={`w-6 h-0.5 bg-[#1A1A1A] rounded transition-transform origin-left ${mobileMenuOpen ? 'rotate-45 translate-y-[-1px]' : ''}`}></div>
            <div className={`w-6 h-0.5 bg-[#1A1A1A] rounded transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`}></div>
            <div className={`w-6 h-0.5 bg-[#1A1A1A] rounded transition-transform origin-left ${mobileMenuOpen ? '-rotate-45 translate-y-[1px]' : ''}`}></div>
          </button>
        </div>

        {/* Mobile Slide Drawer overlay */}
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className={`drawer-overlay fixed inset-0 bg-black/40 z-40 md:hidden ${mobileMenuOpen ? 'open' : ''}`}
        />

        {/* Mobile Navigation Drawer */}
        <div className={`mobile-drawer fixed top-0 right-0 w-72 h-screen bg-[#FAFAF7] border-l border-[#EEEDE8] z-50 p-6 flex flex-col gap-6 md:hidden shadow-2xl ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="flex items-center justify-between border-b border-[#EEEDE8] pb-4">
            <span className="font-extrabold text-[#1A1A1A]">Menu</span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-xl font-bold text-[#8A8A8A] bg-transparent border-none cursor-pointer">✕</button>
          </div>
          
          <div className="flex flex-col gap-4">
            <a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className="font-bold text-[#1A1A1A] py-1 text-sm hover:text-[#22C55E]">Features</a>
            <a href="#venues" onClick={(e) => handleAnchorClick(e, 'venues')} className="font-bold text-[#1A1A1A] py-1 text-sm hover:text-[#22C55E]">Venues</a>
            <a href="#why-us" onClick={(e) => handleAnchorClick(e, 'why-us')} className="font-bold text-[#1A1A1A] py-1 text-sm hover:text-[#22C55E]">Why Us</a>
            <a href="#membership" onClick={(e) => handleAnchorClick(e, 'membership')} className="font-bold text-[#1A1A1A] py-1 text-sm hover:text-[#22C55E]">Membership</a>
          </div>

          <div className="mt-auto border-t border-[#EEEDE8] pt-6 flex flex-col gap-3">
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#22C55E] text-white flex items-center justify-center font-bold">{user.name.charAt(0)}</div>
                  <span className="font-bold text-[#1A1A1A] text-xs truncate">{user.name}</span>
                </div>
                <Link to={user.role === 'ADMIN' ? '/admin/dashboard' : '/customer/dashboard'} onClick={() => setMobileMenuOpen(false)} className="bg-[#22C55E] text-white text-center py-2.5 rounded-full font-bold text-sm">Dashboard</Link>
                <button onClick={handleLogout} className="border border-[#EEEDE8] text-[#1A1A1A] text-center py-2.5 rounded-full font-bold text-sm bg-white">Sign Out</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button onClick={() => { setMobileMenuOpen(false); setModalMode("login"); setShowAuthModal(true); }} className="w-full text-center py-2.5 border border-[#EEEDE8] rounded-full font-bold text-sm text-[#1A1A1A] bg-white">Login</button>
                <button onClick={() => { setMobileMenuOpen(false); handleBookNowClick(); }} className="bg-[#22C55E] w-full text-center py-2.5 rounded-full font-bold text-sm text-white">Book Now</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section id="home" className="relative pt-16 pb-32 px-6 overflow-hidden bg-[#FAFAF7] border-b border-[#EEEDE8] min-h-[85vh] flex flex-col items-center justify-center">
        {/* Subtle dot pattern and radial green glow */}
        <div className="absolute inset-0 hero-dot-grid pointer-events-none opacity-40 z-0"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] hero-radial-glow pointer-events-none z-0"></div>

        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column */}
          <div className="lg:col-span-7 text-left space-y-8 fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full text-xs font-black text-[#16A34A] uppercase tracking-wider pulse-badge">
              ⚡ Premium Cricket Tech
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none text-[#1A1A1A] clamp-headline" style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}>
              Book. Play. <br />
              <span className="text-[#22C55E]">Dominate.</span>
            </h1>

            <p className="text-base md:text-lg text-[#8A8A8A] font-medium max-w-xl leading-relaxed">
              Experience box cricket on premium pitches. Instant slot booking under state-of-the-art shadowless floodlights. Register today and start earning loyalty reward points instantly.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button 
                onClick={() => handleBookNowClick()} 
                className="bg-[#22C55E] hover:bg-[#16A34A] text-white py-4 px-8 rounded-full font-bold shadow-lg shadow-green-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all text-base cursor-pointer btn-shine-sweep"
              >
                Book a Slot 🏏
              </button>
              <a 
                href="#venues" 
                onClick={(e) => handleAnchorClick(e, 'venues')} 
                className="border-2 border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E]/10 py-4 px-8 rounded-full font-bold hover:-translate-y-0.5 active:translate-y-0 transition-all text-base inline-block text-center"
              >
                View Venues
              </a>
            </div>
          </div>

          {/* Right Column: Floating confirmation card */}
          <div className="lg:col-span-5 flex items-center justify-center fade-up">
            <div className="relative w-full max-w-sm mx-auto floating-card hidden lg:block z-10">
              <div className="bg-white border border-[#EEEDE8] rounded-[24px] shadow-xl overflow-hidden transform rotate-[-3deg]">
                {/* Header */}
                <div className="bg-[#22C55E] px-6 py-4 flex items-center justify-between text-white">
                  <span className="font-extrabold text-sm tracking-wide">✓ SLOT CONFIRMED</span>
                  <div className="text-[9px] bg-white/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                    Paid via UPI
                  </div>
                </div>
                {/* Body */}
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] text-[#8A8A8A] font-bold uppercase tracking-wider block">Venue</span>
                      <span className="text-sm font-extrabold text-[#1A1A1A]">Eagle Box Indiranagar</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-[#8A8A8A] font-bold uppercase tracking-wider block">Pitch</span>
                      <span className="text-xs font-bold text-[#1A1A1A]">Arena Alpha (A)</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-[#EEEDE8] pt-3 flex justify-between">
                    <div>
                      <span className="text-[9px] text-[#8A8A8A] font-bold uppercase tracking-wider block">Date</span>
                      <span className="text-xs font-bold text-[#1A1A1A]">Saturday, 20 June</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-[#8A8A8A] font-bold uppercase tracking-wider block">Time</span>
                      <span className="text-xs font-bold text-[#1A1A1A]">07:00 PM - 08:00 PM</span>
                    </div>
                  </div>

                  <div className="border-t border-[#EEEDE8] pt-3 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-[#8A8A8A] font-bold uppercase tracking-wider block">Customer</span>
                      <span className="text-xs font-bold text-[#1A1A1A]">John Doe</span>
                    </div>
                    <div className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#16A34A] text-xs font-black px-3 py-1 rounded-xl">
                      ₹900.00
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Stats counter bar */}
        <div ref={statSectionRef} className="w-full max-w-5xl mx-auto mt-24 py-8 border-y border-[#EEEDE8] bg-white rounded-2xl shadow-sm relative z-10 fade-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">
            <div className="flex flex-col items-center justify-center text-center px-4 md:border-r border-[#EEEDE8]">
              <div className="text-3xl md:text-4xl font-black text-[#1A1A1A] flex items-center gap-1.5 justify-center">
                <span className="text-[#22C55E] text-2xl md:text-3xl">⭐</span> {stats.rating.toFixed(1)}
              </div>
              <div className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-widest mt-1">Google Rating</div>
            </div>
            
            <div className="flex flex-col items-center justify-center text-center px-4 md:border-r border-[#EEEDE8]">
              <div className="text-3xl md:text-4xl font-black text-[#1A1A1A]">
                {stats.bookings.toLocaleString()}+
              </div>
              <div className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-widest mt-1">Bookings Completed</div>
            </div>

            <div className="flex flex-col items-center justify-center text-center px-4 md:border-r border-[#EEEDE8]">
              <div className="text-3xl md:text-4xl font-black text-[#1A1A1A]">
                {stats.players.toLocaleString()}+
              </div>
              <div className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-widest mt-1">Active Players</div>
            </div>

            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="text-3xl md:text-4xl font-black text-[#1A1A1A]">
                {stats.locations} Locations
              </div>
              <div className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-widest mt-1">Across Hyderabad</div>
            </div>
          </div>
        </div>


      </section>

      {/* 3. SMART BOOKING SEARCH */}
      <section className="relative -mt-10 px-6 z-20">
        <div className="max-w-6xl mx-auto bg-white border border-[#EEEDE8] rounded-[32px] shadow-xl p-8 relative overflow-hidden">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end relative z-10">
            <div className="space-y-2">
              <label className="block text-xs font-black text-[#8A8A8A] uppercase tracking-widest">Select Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-[18px] h-5 w-5 text-[#8A8A8A]" />
                <select 
                  className="w-full bg-[#FAFAF7] border border-[#EEEDE8] text-[#1A1A1A] pl-12 pr-4 py-4 rounded-2xl text-base font-bold outline-none focus:border-[#22C55E] appearance-none"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  required
                >
                  <option value="">Select Branch</option>
                  {branchesList.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-[#8A8A8A] uppercase tracking-widest">Select Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-[18px] h-5 w-5 text-[#8A8A8A]" />
                <input 
                  type={selectedDate ? "date" : "text"}
                  placeholder="Select Date"
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => {
                    if (!selectedDate) e.target.type = "text";
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-[#FAFAF7] border border-[#EEEDE8] text-[#1A1A1A] pl-12 pr-4 py-4 rounded-2xl text-base font-bold outline-none focus:border-[#22C55E]"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="md:col-span-1 mt-2">
              <button 
                type="submit" 
                className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white py-4.5 rounded-2xl font-extrabold shadow-lg shadow-green-500/15 transition-all text-base flex items-center justify-center gap-2.5 cursor-pointer btn-shine-sweep"
              >
                Search Available Slots 🔍
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section id="features" className="py-24 px-6 bg-[#FAFAF7] border-t border-[#EEEDE8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3 fade-up">
            <h2 className="text-4xl font-black text-[#1A1A1A] tracking-tight">Why Choose EagleBox?</h2>
            <p className="text-[#8A8A8A] text-sm font-medium">Experience the best box cricket facilities in Hyderabad.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Premium Turf Grounds", desc: "High-quality cricket box grounds with professional turf.", icon: "🏏" },
              { title: "Floodlights", desc: "Play day or night under professional lighting.", icon: "💡" },
              { title: "Instant Online Booking", desc: "Book your preferred slot in seconds.", icon: "📱" },
              { title: "Loyalty Rewards", desc: "Earn points for every booking and redeem rewards.", icon: "🎁" },
              { title: "Membership Plans", desc: "Flexible plans with prepaid slot benefits.", icon: "👥" },
              { title: "Instant Email Confirmation", desc: "Receive booking confirmation immediately.", icon: "📧" },
              { title: "Multiple Hyderabad Locations", desc: "Book grounds across Hyderabad.", icon: "📍" },
              { title: "Secure Reservations", desc: "Prevent double-booking and ensure slot accuracy.", icon: "🔒" }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white border border-[#EEEDE8] hover:border-[#22C55E] p-6 rounded-2xl flex flex-col items-start transition-all hover:shadow-lg hover:-translate-y-1 fade-up">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-black text-[#1A1A1A] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#8A8A8A] font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. VENUE CARDS SECTION */}
      <section id="venues" className="py-24 px-6 bg-[#F5F5F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3 fade-up">
            <h2 className="text-4xl font-black text-[#1A1A1A] tracking-tight">Our Premium Arenas</h2>
            <p className="text-[#8A8A8A] text-sm font-medium">Explore Hyderabad's finest sports box environments designed for champions.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {branchesList.map((branch, idx) => (
              <PremiumVenueCard key={branch.id || idx} branch={branch} onImageClick={(b) => setSelectedPreviewVenue(b)} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. WHY CHOOSE US SECTION */}
      <section id="why-us" className="py-24 px-6 bg-white border-t border-[#EEEDE8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-3 fade-up">
            <h2 className="text-4xl font-black text-[#1A1A1A] tracking-tight">Why Choose Eagle Box?</h2>
            <p className="text-[#8A8A8A] text-sm font-medium">World-class amenities and tech integration tailored for Hyderabad's cricketers.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                title: "Instant Booking", 
                desc: "Say goodbye to phone calls. Reserve and confirm your slots online in under 30 seconds.", 
                icon: <Zap className="w-6 h-6 text-white" /> 
              },
              { 
                title: "Floodlit Venues", 
                desc: "Perfectly aligned shadowless twilight floodlights for crisp visibility all evening.", 
                icon: <Check className="w-6 h-6 text-white" strokeWidth={3} /> 
              },
              { 
                title: "Loyalty Rewards", 
                desc: "Earn loyalty points on every game. Redeem them for discounts, drinks, or free sessions.", 
                icon: <Gift className="w-6 h-6 text-white" /> 
              },
              { 
                title: "Pro Tournaments", 
                desc: "Gain exclusive invitations to corporate leagues, weekend cups, and elite brackets.", 
                icon: <Trophy className="w-6 h-6 text-white" /> 
              }
            ].map((item, idx) => (
              <div key={idx} className="why-card p-8 rounded-2xl flex flex-col items-start fade-up">
                <div className="icon-glow w-14 h-14 bg-gradient-to-tr from-[#22C55E] to-[#16A34A] flex items-center justify-center rounded-[14px] mb-6 transition-all duration-300">
                  {item.icon}
                </div>
                <h3 className="text-lg font-black text-[#1A1A1A] mb-2">{item.title}</h3>
                <p className="text-sm text-[#8A8A8A] leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* 8. MEMBERSHIP PLANS */}
      <section id="membership" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-4 fade-up">
          <h2 className="text-4xl font-black text-[#1A1A1A] tracking-tight">Prepaid Slot Packages</h2>
          <p className="text-[#8A8A8A] text-sm font-medium">Buy slots in bulk, book anytime without worrying about price surges, and earn 50 Loyalty Points on every game.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Starter Plan */}
          <div className="bg-white border border-[#EEEDE8] shadow-sm rounded-[24px] p-8 flex flex-col justify-between hover:border-[#22C55E]/30 transition-all relative fade-up">
            <div>
              <h3 className="text-xl font-extrabold text-[#1A1A1A] mb-1">Starter</h3>
              <p className="text-xs text-[#8A8A8A] font-semibold mb-6">Perfect for weekend warriors.</p>
              
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-[#1A1A1A]">₹3,999</span>
              </div>
              
              <ul className="space-y-4 text-sm text-[#8A8A8A] font-medium">
                <li className="flex items-center gap-2.5 text-[#1A1A1A]">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  <strong>4 Prepaid Slots</strong>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  Valid for 1 Month
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  Book any available slot
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  50 Loyalty Points / booking
                </li>
              </ul>
            </div>
            
            <button onClick={() => handleMembershipClick('STARTER', 3999)} className="w-full mt-8 py-3.5 rounded-xl font-bold transition-all text-sm bg-[#F5F5F0] hover:bg-[#EEEDE8] text-[#1A1A1A] border-none cursor-pointer">
              Buy Starter
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-white border-2 border-[#22C55E] shadow-xl rounded-[24px] p-8 flex flex-col justify-between hover:shadow-2xl transition-all relative fade-up">
            <div className="absolute top-0 right-1/2 translate-y-[-50%] translate-x-[50%] bg-[#22C55E] text-white text-[10px] font-black tracking-widest uppercase py-1.5 px-4 rounded-full shadow-md whitespace-nowrap">
              Most Popular
            </div>
            
            <div>
              <h3 className="text-xl font-extrabold text-[#1A1A1A] mb-1">Pro</h3>
              <p className="text-xs text-[#8A8A8A] font-semibold mb-6">Designed for casual weekly squads.</p>
              
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-[#22C55E]">₹10,999</span>
              </div>
              
              <ul className="space-y-4 text-sm text-[#8A8A8A] font-medium">
                <li className="flex items-center gap-2.5 text-[#1A1A1A]">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  <strong>12 Prepaid Slots</strong>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  Valid for 3 Months
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  Priority booking access
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  50 Loyalty Points / booking
                </li>
              </ul>
            </div>
            
            <button onClick={() => handleMembershipClick('PRO', 10999)} className="w-full mt-8 py-3.5 rounded-xl font-bold transition-all text-sm bg-[#22C55E] hover:bg-[#16A34A] text-white border-none cursor-pointer shadow-lg shadow-green-500/15">
              Buy Pro
            </button>
          </div>

          {/* Elite Plan */}
          <div className="bg-white border border-[#EEEDE8] shadow-sm rounded-[24px] p-8 flex flex-col justify-between hover:border-[#3b82f6]/30 transition-all relative fade-up">
            <div>
              <h3 className="text-xl font-extrabold text-[#1A1A1A] mb-1">Elite</h3>
              <p className="text-xs text-[#8A8A8A] font-semibold mb-6">For teams playing multiple times a week.</p>
              
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-[#1A1A1A]">₹19,999</span>
              </div>
              
              <ul className="space-y-4 text-sm text-[#8A8A8A] font-medium">
                <li className="flex items-center gap-2.5 text-[#1A1A1A]">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  <strong>37 Prepaid Slots</strong>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  Valid for 6 Months
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  Exclusive member offers
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0 font-bold text-xs">✓</span>
                  50 Loyalty Points / booking
                </li>
              </ul>
            </div>
            
            <button onClick={() => handleMembershipClick('ELITE', 19999)} className="w-full mt-8 py-3.5 rounded-xl font-bold transition-all text-sm bg-[#F5F5F0] hover:bg-[#EEEDE8] text-[#1A1A1A] border-none cursor-pointer">
              Buy Elite
            </button>
          </div>

          {/* Champion Plan */}
          <div className="bg-[#1A1A1A] border border-[#333] shadow-sm rounded-[24px] p-8 flex flex-col justify-between hover:border-[#8b5cf6]/50 transition-all relative fade-up">
            <div className="absolute top-0 right-1/2 translate-y-[-50%] translate-x-[50%] bg-[#8b5cf6] text-white text-[10px] font-black tracking-widest uppercase py-1.5 px-4 rounded-full shadow-md whitespace-nowrap">
              Premium
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white mb-1">Champion</h3>
              <p className="text-xs text-white/60 font-semibold mb-6">The ultimate VIP year-round experience.</p>
              
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">₹29,999</span>
              </div>
              
              <ul className="space-y-4 text-sm text-white/80 font-medium">
                <li className="flex items-center gap-2.5 text-white">
                  <span className="w-5 h-5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center text-[#a78bfa] shrink-0 font-bold text-xs">✓</span>
                  <strong>50 Prepaid Slots</strong>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center text-[#a78bfa] shrink-0 font-bold text-xs">✓</span>
                  Valid for 12 Months
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center text-[#a78bfa] shrink-0 font-bold text-xs">✓</span>
                  VIP priority & tournaments
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center text-[#a78bfa] shrink-0 font-bold text-xs">✓</span>
                  Premium support
                </li>
              </ul>
            </div>
            
            <button onClick={() => handleMembershipClick('CHAMPION', 29999)} className="w-full mt-8 py-3.5 rounded-xl font-bold transition-all text-sm bg-white hover:bg-gray-100 text-[#1A1A1A] border-none cursor-pointer">
              Buy Champion
            </button>
          </div>

        </div>
      </section>

      {/* 8.5 REVIEWS SECTION */}
      <section className="py-24 bg-slate-50 border-t border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-black tracking-widest mb-4 border border-green-100">
            <Star className="w-3.5 h-3.5 fill-current" />
            COMMUNITY
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            What Players Say About <span className="text-[#22C55E]">EagleBox</span>
          </h2>
        </div>
        
        <div className="relative w-full overflow-hidden flex marquee-container py-8">
          <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />
          
          <div className="marquee-right gap-6 px-3">
            {reviews.concat(reviews).map((r, idx) => (
              <div key={`rev-${idx}`} className="w-[340px] md:w-[400px] shrink-0 bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-transform duration-300 hover:-translate-y-2 select-none">
                <div className="flex items-center gap-1 mb-4 text-[#22C55E]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < r.rating ? 'fill-current' : 'text-slate-200'}`} />
                  ))}
                </div>
                <p className="text-slate-700 font-medium mb-6 leading-relaxed italic">"{r.message}"</p>
                <div className="flex items-center gap-4 mt-auto pt-6 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {r.userName?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{r.userName || 'Anonymous'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.branch?.name || 'Eagle Box Cricket'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="bg-[#1A1A1A] text-white pt-20 pb-10 px-6">
        
        {/* Top stats bar */}
        <div className="max-w-7xl mx-auto pb-10 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs font-black uppercase tracking-widest text-[#8A8A8A] gap-4">
          <span>🏏 OVER 50,000 PITCHES RESERVED ACROSS HYDERABAD</span>
          <span className="text-[#22C55E]">● 24/7 SUPPORT ACTIVE</span>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 py-16 border-b border-white/10">
          <div className="space-y-4">
            <Link to={logoLink} className="flex items-center gap-2 font-black text-2xl tracking-tight text-white">
              <span className="font-extrabold">Eagle<span className="text-[#22C55E]">Box</span></span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed font-medium">
              EagleBox is Hyderabad's premium cricket box booking platform. Book high-quality turf grounds, manage memberships, earn loyalty rewards, and play instantly across multiple Hyderabad locations.
            </p>
          </div>

          <div>
            <h4 className="font-black text-xs text-white uppercase tracking-widest mb-6">Locations</h4>
            <ul className="space-y-3.5 text-sm font-semibold">
              <li><Link to="/venues" className="text-white/60 hover:text-[#22C55E] transition-colors">Nagole Arena</Link></li>
              <li><Link to="/venues" className="text-white/60 hover:text-[#22C55E] transition-colors">Uppal Arena</Link></li>
              <li><Link to="/venues" className="text-white/60 hover:text-[#22C55E] transition-colors">Gachibowli Arena</Link></li>
              <li><Link to="/venues" className="text-white/60 hover:text-[#22C55E] transition-colors">Kukatpally Arena</Link></li>
              <li><Link to="/venues" className="text-white/60 hover:text-[#22C55E] transition-colors">Madhapur Arena</Link></li>
              <li><Link to="/venues" className="text-white/60 hover:text-[#22C55E] transition-colors">Kompally Arena</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-xs text-white uppercase tracking-widest mb-6">Contact Us</h4>
            <ul className="space-y-3.5 text-sm font-semibold">
              <li><a href="mailto:eagleboxbookings@gmail.com" className="text-white/60 hover:text-[#22C55E] transition-colors">eagleboxbookings@gmail.com</a></li>
              <li className="text-white/60">+91 98765 43210</li>
              <li className="text-white/60">Hyderabad, Telangana, India</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-xs text-white uppercase tracking-widest mb-6">Connect</h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                {/* Social circles */}
                <a href="#" className="w-10 h-10 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E] hover:text-black flex items-center justify-center transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E] hover:text-black flex items-center justify-center transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E] hover:text-black flex items-center justify-center transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                </a>
              </div>
              <p className="text-xs text-white/50 font-bold uppercase tracking-widest">Hyderabad, India</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 font-bold uppercase tracking-widest gap-4">
          <div>Made with 🏏 in Hyderabad</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#22C55E] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#22C55E] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#22C55E] transition-colors">Refunds</a>
            {/* Preview Modal */}
      {selectedPreviewVenue && (
        <VenuePreviewModal 
          branch={selectedPreviewVenue} 
          onClose={() => setSelectedPreviewVenue(null)} 
        />
      )}

    </div>
        </div>
      </footer>

      {/* 11. AUTHENTICATION MODAL GATEWAY */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#EEEDE8] rounded-[24px] shadow-2xl p-6 sm:p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto text-[#1A1A1A]">
            
            <button 
              onClick={() => setShowAuthModal(false)} 
              className="absolute top-4 right-4 text-[#8A8A8A] hover:text-[#1A1A1A] text-sm font-bold w-8 h-8 flex items-center justify-center hover:bg-[#F5F5F0] rounded-full transition-colors border-none cursor-pointer"
            >
              ✕
            </button>

            {modalMode === "login" ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Welcome Back</h3>
                  <p className="text-xs text-[#8A8A8A] font-semibold mt-1">Sign in to complete your pitch reservation.</p>
                </div>

                <form onSubmit={handleModalLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#8A8A8A] uppercase tracking-widest mb-1.5">Email Address</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-slate-400 text-xs">✉</span>
                      <input 
                        type="email" 
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="block w-full pl-9 pr-3 py-3 bg-[#FAFAF7] border border-[#EEEDE8] rounded-xl focus:border-[#22C55E] text-slate-800 text-sm focus:bg-white outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#8A8A8A] uppercase tracking-widest mb-1.5">Password</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-slate-400 text-xs">🔒</span>
                      <input 
                        type={authShowPassword ? 'text' : 'password'} 
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-9 pr-10 py-3 bg-[#FAFAF7] border border-[#EEEDE8] rounded-xl focus:border-[#22C55E] text-slate-800 text-sm focus:bg-white outline-none font-bold"
                      />
                      <button 
                        type="button" 
                        onClick={() => setAuthShowPassword(!authShowPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8A8A8A] hover:text-[#1A1A1A] bg-transparent border-none cursor-pointer"
                      >
                        {authShowPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={authLoading}
                    className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white py-3.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg shadow-green-500/15 btn-shine-sweep"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                  </button>
                </form>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-[#EEEDE8]"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-[#8A8A8A] uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-[#EEEDE8]"></div>
                </div>

                <div className="flex justify-center">
                  <GoogleLogin 
                    onSuccess={handleGoogleSuccess} 
                    onError={() => toast.error('Google Auth Failed')} 
                    theme="outline"
                    shape="pill"
                    size="large"
                    width="100%"
                  />
                </div>

                <p className="text-center text-xs text-[#8A8A8A] font-semibold pt-2">
                  New to EagleBox?{' '}
                  <button onClick={() => setModalMode("register")} className="text-[#22C55E] font-bold hover:underline cursor-pointer bg-transparent border-none">
                    Register Now
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Create Account</h3>
                  <p className="text-xs text-[#8A8A8A] font-semibold mt-1">Get 200 welcome points on registration.</p>
                </div>

                <form onSubmit={handleModalRegister} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#8A8A8A] uppercase tracking-widest mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="John Doe"
                      className="block w-full px-3 py-2.5 bg-[#FAFAF7] border border-[#EEEDE8] rounded-xl focus:border-[#22C55E] text-slate-800 text-sm focus:bg-white outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#8A8A8A] uppercase tracking-widest mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="block w-full px-3 py-2.5 bg-[#FAFAF7] border border-[#EEEDE8] rounded-xl focus:border-[#22C55E] text-slate-800 text-sm focus:bg-white outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#8A8A8A] uppercase tracking-widest mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      required
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      placeholder="9876543210"
                      className="block w-full px-3 py-2.5 bg-[#FAFAF7] border border-[#EEEDE8] rounded-xl focus:border-[#22C55E] text-slate-800 text-sm focus:bg-white outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#8A8A8A] uppercase tracking-widest mb-1">Referral Code (Optional)</label>
                    <input 
                      type="text" 
                      value={authReferralCode}
                      onChange={(e) => setAuthReferralCode(e.target.value)}
                      placeholder="EBC-XXXX"
                      className="block w-full px-3 py-2.5 bg-[#FAFAF7] border border-[#EEEDE8] rounded-xl focus:border-[#22C55E] text-slate-800 text-sm focus:bg-white outline-none font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#8A8A8A] uppercase tracking-widest mb-1">Password</label>
                    <input 
                      type="password" 
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="block w-full px-3 py-2.5 bg-[#FAFAF7] border border-[#EEEDE8] rounded-xl focus:border-[#22C55E] text-slate-800 text-sm focus:bg-white outline-none font-bold"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={authLoading}
                    className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white py-3.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer border-none mt-3 shadow-lg shadow-green-500/15 btn-shine-sweep"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register & Join'}
                  </button>
                </form>

                <p className="text-center text-xs text-[#8A8A8A] font-semibold pt-2">
                  Already have an account?{' '}
                  <button onClick={() => setModalMode("login")} className="text-[#22C55E] font-bold hover:underline cursor-pointer bg-transparent border-none">
                    Log In
                  </button>
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
