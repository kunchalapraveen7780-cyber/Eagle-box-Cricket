import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Star, Calendar, Clock, Loader2, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function VenuesPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }

    // Fetch branches from database
    api.get('/api/branches')
      .then(res => {
        setBranches(res.data);
      })
      .catch(err => {
        console.error("Failed to load branches from DB:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleBookNowClick = (branchName, pricePerHour) => {
    // Attempt to match selected branch text to loaded db branches
    const matchedBranch = branches.find(b => b.name.includes(branchName) || branchName.includes(b.name)) || branches[0];
    
    const pendingBooking = {
      branch: matchedBranch || { id: 'nagole', name: 'Eagle Box Cricket Nagole', pricePerHour: pricePerHour },
      date: new Date().toISOString().split("T")[0],
      time: "",
      duration: 1,
      amount: pricePerHour,
      slotId: ""
    };

    localStorage.setItem("pending_booking", JSON.stringify(pendingBooking));
    navigate('/customer/book');
  };

  const handleImageError = (e) => {
    e.target.src = '/eagle_box_venue.png';
  };

  const staticVenues = [
    {
      id: "indiranagar",
      name: "Eagle Box Indiranagar",
      location: "Indiranagar, Bangalore",
      rating: 4.8,
      reviewsCount: 145,
      price: 1200,
      slotsRemaining: 6,
      image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=600&auto=format&fit=crop",
      amenities: ["Floodlights", "Turf", "Parking"]
    },
    {
      id: "koramangala",
      name: "Eagle Box Koramangala",
      location: "Koramangala, Bangalore",
      rating: 4.6,
      reviewsCount: 112,
      price: 1000,
      slotsRemaining: 9,
      image: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=600&auto=format&fit=crop",
      amenities: ["Floodlights", "Turf", "Refreshments"]
    },
    {
      id: "hsrlayout",
      name: "Eagle Box HSR Layout",
      location: "HSR Layout, Bangalore",
      rating: 4.9,
      reviewsCount: 188,
      price: 1500,
      slotsRemaining: 4,
      image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=600&auto=format&fit=crop",
      amenities: ["Floodlights", "Turf", "Parking", "Changing Rooms"]
    },
    {
      id: "whitefield",
      name: "Eagle Box Whitefield",
      location: "Whitefield, Bangalore",
      rating: 4.7,
      reviewsCount: 98,
      price: 1100,
      slotsRemaining: 12,
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop",
      amenities: ["Floodlights", "Turf", "Parking"]
    },
    {
      id: "jayanagar",
      name: "Eagle Box Jayanagar",
      location: "Jayanagar, Bangalore",
      rating: 4.6,
      reviewsCount: 124,
      price: 1300,
      slotsRemaining: 7,
      image: "https://images.unsplash.com/photo-1624526267942-ab0f0b64402b?q=80&w=600&auto=format&fit=crop",
      amenities: ["Floodlights", "Turf", "Refreshments"]
    },
    {
      id: "marathahalli",
      name: "Eagle Box Marathahalli",
      location: "Marathahalli, Bangalore",
      rating: 4.5,
      reviewsCount: 84,
      price: 1250,
      slotsRemaining: 8,
      image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=600&auto=format&fit=crop",
      amenities: ["Floodlights", "Turf", "Parking"]
    }
  ];

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
            <Link to="/venues" className="text-sm font-bold text-[#22C55E]">Locations</Link>
            {user ? (
              <Link to="/customer/dashboard" className="text-sm font-semibold text-[#475569] hover:text-[#22C55E]">Dashboard</Link>
            ) : (
              <Link to="/login/customer" className="text-sm font-semibold text-[#475569] hover:text-[#22C55E]">Login</Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Title Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Our Arenas</h1>
          <p className="text-[#475569] mt-1 text-sm">Select a venue, check live availability, and play immediately at our modern box cricket facilities.</p>
        </div>

        {/* Directory Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm h-[400px]">
                <div className="w-full h-48 shimmer-placeholder"></div>
                <div className="p-6 space-y-4">
                  <div className="h-6 w-3/4 shimmer-placeholder rounded"></div>
                  <div className="h-4 w-1/2 shimmer-placeholder rounded"></div>
                  <div className="h-8 w-full shimmer-placeholder rounded"></div>
                  <div className="h-10 w-full shimmer-placeholder rounded mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {staticVenues.map((venue) => (
              <div key={venue.id} className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 flex flex-col group h-[450px]">
                
                {/* Venue Photo */}
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <img 
                    src={venue.image} 
                    alt={venue.name} 
                    onError={handleImageError}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-gray-150 flex items-center gap-1 font-bold text-xs text-[#0F172A]">
                    <Star size={12} className="fill-[#eab308] text-[#eab308]" /> {venue.rating} <span className="text-gray-400 font-normal">({venue.reviewsCount})</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-[#0F172A]">{venue.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold mt-1">
                      <MapPin size={12} /> {venue.location}
                    </div>

                    {/* Amenities Checklist */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {venue.amenities.map((item, i) => (
                        <span key={i} className="text-[10px] bg-[#F8FAFC] border border-gray-200 text-[#475569] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">
                          {item === "Floodlights" && "💡 "}
                          {item === "Parking" && "🅿 "}
                          {item === "Changing Rooms" && "🚿 "}
                          {item === "Refreshments" && "🥤 "}
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    {/* Live Availability Status */}
                    <div className="text-xs font-bold text-green-700 flex items-center gap-1.5 mt-4">
                      <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
                      🟢 Available Today ({venue.slotsRemaining} Slots Remaining)
                    </div>

                    {/* Bottom Pricing & CTAs */}
                    <div className="border-t border-[#E2E8F0] pt-4 mt-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider leading-none">Starting From</span>
                        <span className="text-lg font-black text-gray-900">₹{venue.price}<span className="text-xs font-normal text-gray-400">/hr</span></span>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/venues/${venue.id}`} className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl border border-gray-300 transition-colors">
                          View Details
                        </Link>
                        <button 
                          onClick={() => handleBookNowClick(venue.name, venue.price)}
                          className="px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-green-500/10 hover:scale-[1.02] cursor-pointer"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* Basic Footer */}
      <footer className="bg-[#0F172A] text-white py-8 px-6 text-center text-xs text-gray-500 border-t border-gray-800 mt-20">
        <div>© 2026 Eagle Box Cricket. All rights reserved. Premium Sports Booking Platform.</div>
      </footer>

    </div>
  );
}
