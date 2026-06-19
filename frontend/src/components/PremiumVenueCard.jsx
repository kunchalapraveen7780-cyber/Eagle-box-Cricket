import { useState, useEffect } from 'react';
import { MapPin, Star, Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const defaultImages = [
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1518091043644-c1d44570a2c9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=800&q=80"
];

const PremiumVenueCard = ({ branch, onImageClick }) => {
  const navigate = useNavigate();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [slotStats, setSlotStats] = useState({ available: 0, booked: 0, total: 16, nextSlot: '' });
  const [, setLoading] = useState(true);

  // Derive images based on branch name loosely
  const images = defaultImages; // In production, map specific images to branches

  useEffect(() => {
    let intervalId;

    const fetchLiveAvailability = () => {
      api.get(`/api/branches/${branch.id}/live-availability`)
        .then(res => {
          setSlotStats({
            available: res.data.availableSlots,
            booked: res.data.bookedSlots,
            total: res.data.totalSlots,
            occupancy: res.data.occupancy,
            nextSlot: res.data.availableSlots > 0 ? 'Available Today' : 'Tomorrow'
          });
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    };

    // Initial fetch
    fetchLiveAvailability();

    // Polling every 30 seconds
    intervalId = setInterval(fetchLiveAvailability, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [branch.id]);

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleBookNow = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('pending_booking', JSON.stringify({
      branch,
      date: today,
      time: "",
      duration: 1,
      amount: branch.pricePerHour,
      slotId: ""
    }));
    navigate('/customer/book');
  };

  const occupancyPercent = slotStats.occupancy || 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Image Carousel */}
      <div className="relative h-64 overflow-hidden cursor-pointer" onClick={() => onImageClick && onImageClick(branch)}>
        <img 
          src={images[currentImgIndex]} 
          alt={branch.name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        {/* Rating Badge */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <Star size={14} className="text-[#F59E0B] fill-[#F59E0B]" />
          <span className="font-extrabold text-xs">4.8</span>
          <span className="text-[10px] text-slate-500 font-bold">(120+ Reviews)</span>
        </div>

        {/* Price Badge */}
        <div className="absolute top-4 right-4 bg-[#22C55E] text-white px-3 py-1.5 rounded-full shadow-lg font-black text-xs">
          ₹{branch.pricePerHour}/hr
        </div>

        {/* Carousel Controls */}
        <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          <ChevronLeft size={18} />
        </button>
        <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          <ChevronRight size={18} />
        </button>

        {/* Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, idx) => (
            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImgIndex ? 'bg-white w-4' : 'bg-white/50'}`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-black text-xl text-slate-900 tracking-tight">{branch.name}</h3>
            <div className="flex items-center gap-1 text-sm text-slate-500 font-medium mt-1">
              <MapPin size={14} className="text-[#22C55E]" /> {branch.location}
            </div>
          </div>
        </div>

        {/* Live Slots Box */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-5">
          <div className="flex items-center mb-3 border-b border-slate-200/60 pb-3">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1.5">
              <Clock size={12} className="text-[#22C55E]" /> Live Availability Today
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Available</span>
              <span className="text-sm font-extrabold text-[#16A34A]">{slotStats.available}</span>
            </div>
            <div className="flex flex-col text-center border-x border-slate-200/60 px-4 mx-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Booked</span>
              <span className="text-sm font-extrabold text-red-500">{slotStats.booked}</span>
            </div>
            <div className="text-right flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block">Occupancy</span>
              <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1 inline-block relative top-0.5">
                <div className="h-full bg-[#F59E0B]" style={{ width: `${occupancyPercent}%` }}></div>
              </div>
              <span className="text-xs font-bold text-slate-600 ml-1">{occupancyPercent}%</span>
            </div>
          </div>
        </div>

        {/* Facilities */}
        <div className="flex gap-2 mt-5 flex-wrap">
          <span className="text-[10px] font-bold bg-[#F8FAFC] border border-slate-200 text-slate-600 px-2 py-1 rounded-md flex items-center gap-1">
            <Check size={10} className="text-[#22C55E]" /> Premium Turf
          </span>
          <span className="text-[10px] font-bold bg-[#F8FAFC] border border-slate-200 text-slate-600 px-2 py-1 rounded-md flex items-center gap-1">
            <Check size={10} className="text-[#22C55E]" /> Floodlights
          </span>
          <span className="text-[10px] font-bold bg-[#F8FAFC] border border-slate-200 text-slate-600 px-2 py-1 rounded-md flex items-center gap-1">
            <Check size={10} className="text-[#22C55E]" /> Parking
          </span>
        </div>

        {/* CTA */}
        <button 
          onClick={handleBookNow}
          className="w-full mt-6 bg-[#22C55E] hover:bg-[#16A34A] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          Book Slot <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PremiumVenueCard;