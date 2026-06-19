import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Star, ArrowLeft, Check, Loader2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function VenueDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [dbBranch, setDbBranch] = useState(null);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Gallery Viewer States
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Authentication Required modal gate
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }

    // Load DB branches to match ID
    api.get('/api/branches')
      .then(res => {
        setBranches(res.data);
        const match = res.data.find(b => b.name.toLowerCase().includes(id.toLowerCase()) || id.toLowerCase().includes(b.name.toLowerCase().split(' ')[0]));
        if (match) {
          setDbBranch(match);
        } else {
          setDbBranch(res.data[0]);
        }
      })
      .catch(err => {
        console.error(err);
      });
  }, [id]);

  // Load slots for selected date & matched branch
  useEffect(() => {
    if (dbBranch) {
      const loadingTimer = window.setTimeout(() => setLoadingSlots(true), 0);
      api.get(`/api/slots?date=${selectedDate}&branchId=${dbBranch.id}`)
        .then(res => {
          setSlots(res.data);
        })
        .catch(err => {
          console.error(err);
          // Set mock slots if DB is empty
          setSlots([
            { id: 'ms1', startTime: '05:00 PM', endTime: '06:00 PM', status: 'AVAILABLE', price: dbBranch.pricePerHour },
            { id: 'ms2', startTime: '06:00 PM', endTime: '07:00 PM', status: 'BOOKED', price: dbBranch.pricePerHour },
            { id: 'ms3', startTime: '07:00 PM', endTime: '08:00 PM', status: 'AVAILABLE', price: dbBranch.pricePerHour },
            { id: 'ms4', startTime: '08:00 PM', endTime: '09:00 PM', status: 'AVAILABLE', price: dbBranch.pricePerHour },
            { id: 'ms5', startTime: '09:00 PM', endTime: '10:00 PM', status: 'BOOKED', price: dbBranch.pricePerHour },
            { id: 'ms6', startTime: '10:00 PM', endTime: '11:00 PM', status: 'AVAILABLE', price: dbBranch.pricePerHour }
          ]);
        })
        .finally(() => {
          setLoadingSlots(false);
        });
      return () => window.clearTimeout(loadingTimer);
    }
  }, [dbBranch, selectedDate]);

  const handleBookSlotClick = (slotObj) => {
    if (slotObj.status === 'BOOKED') {
      toast.error("This slot is already booked.");
      return;
    }

    const currentBranch = dbBranch || branches[0] || { id: 'nagole', name: 'Eagle Box Cricket Nagole', pricePerHour: slotObj.price };
    
    const pendingBooking = {
      branch: currentBranch,
      date: selectedDate,
      time: `${slotObj.startTime} - ${slotObj.endTime}`,
      duration: 1,
      amount: slotObj.price,
      slotId: slotObj.id
    };

    localStorage.setItem("pending_booking", JSON.stringify(pendingBooking));

    if (user) {
      navigate('/customer/book');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleImageError = (e) => {
    e.target.src = '/eagle_box_venue.png';
  };

  // Static Metadata based on ID
  const venueDetails = {
    jubilee: {
      name: "Eagle Box Jubilee Hills",
      address: "Road No. 36, Jubilee Hills, Near Metro Station, Hyderabad",
      rating: 4.8,
      reviewsCount: 145,
      description: "Our premium box cricket facility in Jubilee Hills features professional turf import standard, shock-absorbent underground cushion pads, and professional twilight floodlight grids. Ideal for fast paced high-bounce matches.",
      images: [
        "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=1200&auto=format&fit=crop"
      ],
      amenities: ["Imported Premium Turf", "Professional Lux Lights", "Seated Spectator Area", "Fresh Drinks Bar", "Changing Rooms & Shower"],
      pricePerHour: 1500,
      rules: [
        "Flat shoes / studs only. No metal spikes allowed.",
        "Kindly report 10 minutes prior to your booked slot.",
        "Rescheduling requests must be placed 4 hours in advance.",
        "Alcohol and smoking inside the turf premises is strictly prohibited."
      ]
    },
    madhapur: {
      name: "Eagle Box Madhapur",
      address: "Behind Hitech City Cyber Towers, Madhapur, Hyderabad",
      rating: 4.6,
      reviewsCount: 112,
      description: "Conveniently located in the tech core of Madhapur, this facility is popular for corporate weekend tournaments and stress-buster leagues. Outstanding net heights and perimeter padding.",
      images: [
        "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop"
      ],
      amenities: ["Standard Polyethylene Turf", "Perimeter Net Security", "24/7 Security Parking", "Cold Drinking Water"],
      pricePerHour: 1200,
      rules: [
        "No outside food or drinks on the turf.",
        "Maintain absolute decorum inside the venue.",
        "Proper sports attire is mandatory.",
        "Damage to nets or light fixtures is fineable."
      ]
    },
    gachibowli: {
      name: "Eagle Box Gachibowli",
      address: "Beside DLF Cyber City, Gachibowli, Hyderabad",
      rating: 4.9,
      reviewsCount: 188,
      description: "Our largest box setup in Hyderabad. Gachibowli features double height net framing and premium density FIFA-grade turf for professional team matches.",
      images: [
        "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop"
      ],
      amenities: ["Double Height Nets", "FIFA Grade Shock Turf", "Changing Room with Locker", "Ample Car Parking", "Drinks & Snacks Pavilion"],
      pricePerHour: 1600,
      rules: [
        "Only non-marking flat sole shoes allowed.",
        "Extension of slots is strictly subject to availability.",
        "Keep the arena clean. Use garbage bins.",
        "First-aid kit is available at the manager cabin."
      ]
    },
    lbnagar: {
      name: "Eagle Box LB Nagar",
      address: "Near Kamineni Hospital, LB Nagar, Hyderabad",
      rating: 4.5,
      reviewsCount: 98,
      description: " LB Nagar branch features standard turf, well suited for local friendly tournaments. Good lighting standard and highly cost effective packages.",
      images: [
        "https://images.unsplash.com/photo-1624526267942-ab0f0b64402b?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop"
      ],
      amenities: ["Standard Turf System", "Light Grid Arrays", "Dedicated Wickets", "Bike Parking Zone"],
      pricePerHour: 1000,
      rules: [
        "Arrive 5 minutes before scheduled slot.",
        "No high arm fast bowling to prevent net wear.",
        "Refusal to clear turf on time leads to penalty fees."
      ]
    },
    nagole: {
      name: "Eagle Box Nagole",
      address: "Beside Metro Station, Nagole, Hyderabad",
      rating: 4.7,
      reviewsCount: 124,
      description: "Located right next to Nagole Metro, this turf is extremely easy to access. Includes clean change room facilities and highly uniform bouncy turf.",
      images: [
        "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=1200&auto=format&fit=crop"
      ],
      amenities: ["Pristine Cricket Turf", "Bright LED Floodlights", "Changing Rooms", "Refreshments Kiosk"],
      pricePerHour: 1100,
      rules: [
        "Proper sports shoes are mandatory.",
        "Outside food is not allowed on the green turf.",
        "Respect the staff and coordinator decisions."
      ]
    },
    kompally: {
      name: "Eagle Box Kompally",
      address: "NH 44, Near Kompally Bypass Road, Hyderabad",
      rating: 4.6,
      reviewsCount: 84,
      description: "Our bypass location in Kompally boasts a massive playing box with thick boundary paddings. Perfect for long-distance range hitting.",
      images: [
        "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1624526267942-ab0f0b64402b?q=80&w=1200&auto=format&fit=crop"
      ],
      amenities: ["Extensive Box Dimensions", "Safety Pads Bordering", "Spectator Seating", "Parking Space"],
      pricePerHour: 1300,
      rules: [
        "Metal studs strictly not allowed.",
        "Booking cancelations subject to terms.",
        "Manage your belongings carefully."
      ]
    }
  };

  const info = venueDetails[id.toLowerCase()] || venueDetails.nagole;

  // Occupancy metrics calculations
  const availableSlotsCount = slots.filter(s => s.status === 'AVAILABLE').length;
  const bookedSlotsCount = slots.filter(s => s.status === 'BOOKED').length;

  const occupancyStatus = (() => {
    if (availableSlotsCount >= 10) return { label: "High Availability", color: "text-green-700 bg-green-50 border-green-200" };
    if (availableSlotsCount >= 5) return { label: "Filling Fast", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { label: "Almost Full", color: "text-red-700 bg-red-50 border-red-200" };
  })();

  const openViewer = (index) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#0F172A]">
      
      {/* Navbar Header */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight flex items-center gap-1.5 text-gray-900">
            <span className="text-[#22C55E]">Eagle Box</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-sm font-semibold text-[#475569] hover:text-[#22C55E]">Home</Link>
            <Link to="/venues" className="text-sm font-semibold text-[#475569] hover:text-[#22C55E]">Locations</Link>
            {user ? (
              <Link to="/customer/dashboard" className="text-sm font-semibold text-[#475569] hover:text-[#22C55E]">Dashboard</Link>
            ) : (
              <Link to="/login/customer" className="text-sm font-semibold text-[#475569] hover:text-[#22C55E]">Login</Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Back Link */}
        <Link to="/venues" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider mb-6">
          <ArrowLeft size={14} /> Back to Venues
        </Link>

        {/* Title & Info Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{info.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#475569] font-medium mt-1">
              <span className="flex items-center gap-1"><MapPin size={14} /> {info.address}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold text-[#0F172A]">
                <Star size={14} className="fill-[#eab308] text-[#eab308]" /> {info.rating} ({info.reviewsCount} reviews)
              </span>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-400 block text-right font-bold uppercase tracking-wider leading-none">Starting Rate</span>
            <span className="text-3xl font-black text-gray-900">₹{info.pricePerHour}<span className="text-sm font-normal text-gray-400">/hr</span></span>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 rounded-2xl overflow-hidden border border-[#E2E8F0] bg-white p-2">
          <div className="md:col-span-2 aspect-[16/10] bg-gray-100 overflow-hidden rounded-xl cursor-pointer" onClick={() => openViewer(0)}>
            <img src={info.images[0]} alt="Primary View" onError={handleImageError} className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300" />
          </div>
          <div className="grid grid-rows-2 gap-4">
            <div className="aspect-[16/10] bg-gray-100 overflow-hidden rounded-xl cursor-pointer" onClick={() => openViewer(1)}>
              <img src={info.images[1]} alt="Gallery View 2" onError={handleImageError} className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300" />
            </div>
            <div className="aspect-[16/10] bg-gray-100 overflow-hidden rounded-xl cursor-pointer relative" onClick={() => openViewer(2)}>
              <img src={info.images[2]} alt="Gallery View 3" onError={handleImageError} className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-sm">
                View All photos
              </div>
            </div>
          </div>
        </div>

        {/* Content Structure */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Columns: Info & Rules */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Description */}
            <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl">
              <h2 className="text-lg font-black text-gray-900 mb-3">About the Arena</h2>
              <p className="text-sm text-gray-650 leading-relaxed font-medium">{info.description}</p>
            </div>

            {/* Amenities Section */}
            <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl">
              <h2 className="text-lg font-black text-gray-900 mb-4">Venue Amenities</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {info.amenities.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm text-[#475569] font-semibold">
                    <div className="w-6.5 h-6.5 rounded-lg bg-green-50 text-[#22C55E] flex items-center justify-center shrink-0 border border-green-100">
                      <Check size={14} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Ground Rules */}
            <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl">
              <h2 className="text-lg font-black text-gray-900 mb-4">Playground Rules</h2>
              <ul className="space-y-3">
                {info.rules.map((rule, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-[#475569] font-medium items-start">
                    <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 text-xs font-bold border border-amber-100">!</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Google Map Mock */}
            <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl">
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="text-[#22C55E]" size={20} /> Location Map
              </h2>
              <div className="h-64 bg-gray-100 border border-gray-200 rounded-xl overflow-hidden relative">
                {/* Mock Map Frame */}
                <div className="absolute inset-0 bg-[#E2E8F0] flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-3xl mb-2">📍</span>
                  <h4 className="font-bold text-[#0F172A]">{info.name}</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">{info.address}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Live Booking Card */}
          <div className="space-y-6">
            
            <div className="bg-white border-2 border-[#22C55E] p-6 rounded-2xl shadow-md sticky top-24">
              
              {/* Header block with occupancy status */}
              <div className="border-b border-gray-100 pb-4 mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Live Schedule</span>
                <h3 className="text-lg font-black text-[#0F172A] mt-0.5">Real-Time Availability</h3>
                
                {/* Occupancy Indicator Badge */}
                <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${occupancyStatus.color}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                  {occupancyStatus.label}
                </div>
              </div>

              {/* Date selection */}
              <div className="space-y-2 mb-6">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Select Play Date</label>
                <input 
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm font-semibold outline-none focus:ring-1 focus:ring-[#22C55E]"
                />
              </div>

              {/* Smart Inventory Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6 bg-[#F8FAFC] p-3 border border-gray-150 rounded-xl text-center">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Available Slots</span>
                  <span className="text-lg font-black text-green-600">{availableSlotsCount}</span>
                </div>
                <div className="border-l border-gray-200">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Booked Slots</span>
                  <span className="text-lg font-black text-gray-500">{bookedSlotsCount}</span>
                </div>
              </div>

              {/* Slots selection */}
              {loadingSlots ? (
                <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-1.5">
                  <Loader2 className="w-6 h-6 animate-spin text-[#22C55E]" />
                  <span className="text-[10px] font-bold">Updating grid...</span>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-6">
                  No slots scheduled for this date.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const isBooked = slot.status === 'BOOKED';
                    return (
                      <div 
                        key={slot.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          isBooked 
                            ? 'bg-red-50/40 border-red-100 text-red-400 opacity-60' 
                            : 'bg-green-50/40 border-green-100 hover:border-[#22C55E] hover:bg-green-50 text-gray-900'
                        }`}
                      >
                        <div>
                          <span className="block font-bold text-xs">{slot.startTime} - {slot.endTime}</span>
                          <span className="block text-[10px] text-gray-400 font-bold mt-0.5">₹{slot.price}</span>
                        </div>
                        {isBooked ? (
                          <span className="text-[10px] font-bold text-red-500 bg-white border border-red-200 px-2.5 py-1 rounded-md">
                            🔴 Booked
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleBookSlotClick(slot)}
                            className="bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            Book Slot
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>

        </div>

      </main>

      {/* Full Screen Image Viewer Modal */}
      {viewerOpen && (
        <div className="fixed inset-0 bg-black/95 z-55 flex flex-col items-center justify-center p-4 animate-fadeInSimple">
          <button 
            onClick={() => setViewerOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 font-bold text-xl cursor-pointer bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
          
          <div className="max-w-4xl w-full aspect-[16/10] bg-black overflow-hidden rounded-2xl border border-white/10">
            <img 
              src={info.images[viewerIndex]} 
              alt="Viewing Full Screen" 
              onError={handleImageError}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Navigation Controls */}
          <div className="flex gap-4 mt-6">
            {info.images.map((img, i) => (
              <button 
                key={i}
                onClick={() => setViewerIndex(i)}
                className={`w-3 h-3 rounded-full transition-all ${viewerIndex === i ? 'bg-[#22C55E] scale-120' : 'bg-gray-650 bg-gray-600 hover:bg-gray-400'}`}
              ></button>
            ))}
          </div>
        </div>
      )}

      {/* Authentication Gateway Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full relative border border-gray-150">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 font-bold text-lg p-1 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Login Required</h3>
              <p className="text-xs text-gray-400 mt-1">Please log in to complete your cricket slot reservation.</p>
            </div>
            <div className="space-y-3">
              <Link to="/login/customer" className="block text-center w-full bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-green-500/10">
                Sign In with Email
              </Link>
              <Link to="/register/customer" className="block text-center w-full bg-white border border-gray-300 hover:border-gray-900 text-gray-750 font-bold py-3 rounded-xl transition-all">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Basic Footer */}
      <footer className="bg-[#0F172A] text-white py-8 px-6 text-center text-xs text-gray-500 border-t border-gray-800 mt-20">
        <div>© 2026 Eagle Box Cricket. All rights reserved. Premium Sports Booking Platform.</div>
      </footer>

    </div>
  );
}
