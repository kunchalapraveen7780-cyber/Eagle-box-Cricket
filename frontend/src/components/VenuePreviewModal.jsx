import { useState } from 'react';
import { X, MapPin, Star, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const defaultImages = [
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1518091043644-c1d44570a2c9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1624526267942-ab0f0b580098?auto=format&fit=crop&w=1200&q=80"
];

const VenuePreviewModal = ({ branch, onClose }) => {
  const navigate = useNavigate();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const images = defaultImages;

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

  if (!branch) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 animate-fadeIn">
      <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors"
        >
          <X size={20} />
        </button>

        {/* Hero Gallery */}
        <div className="relative h-64 md:h-96 w-full bg-slate-100 group">
          <img src={images[currentImgIndex]} alt={branch.name} className="w-full h-full object-cover" />
          
          <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
            <ChevronLeft size={24} />
          </button>
          <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
            <ChevronRight size={24} />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === currentImgIndex ? 'bg-white w-6' : 'bg-white/50 w-2'}`} />
            ))}
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-[#22C55E]/10 text-[#16A34A] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Premium Arena</span>
                <span className="flex items-center gap-1 text-[#F59E0B] font-bold text-sm bg-amber-50 px-3 py-1 rounded-full">
                  <Star size={14} className="fill-[#F59E0B]" /> 4.8 (120+ Reviews)
                </span>
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{branch.name}</h2>
              <p className="flex items-center gap-1.5 text-slate-500 font-medium text-lg">
                <MapPin size={18} className="text-[#22C55E]" /> {branch.location}
              </p>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl min-w-[240px] text-center shrink-0">
              <div className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">Starting From</div>
              <div className="text-3xl font-black text-slate-900 mb-4">₹{branch.pricePerHour}<span className="text-base text-slate-500 font-medium">/hr</span></div>
              <button 
                onClick={handleBookNow}
                className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
              >
                Book Slot Now
              </button>
            </div>
          </div>

          <hr className="my-8 border-slate-100" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-4">About the Arena</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Experience world-class box cricket at {branch.name}. Equipped with professional-grade synthetic turf, high-intensity LED floodlights for night matches, and fully enclosed high netting to keep the game fast-paced and uninterrupted.
              </p>
              
              <h3 className="text-xl font-black text-slate-900 mb-4">Operating Hours</h3>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex justify-between items-center py-2 border-b border-slate-200/50">
                  <span className="text-slate-600 font-bold">Monday - Sunday</span>
                  <span className="text-slate-900 font-black">06:00 AM - 10:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600 font-bold">Slot Duration</span>
                  <span className="text-slate-900 font-black">1 Hour</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-4">Premium Facilities</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'Professional Turf',
                  'LED Floodlights',
                  'High Nets (30ft)',
                  'Ample Parking',
                  'Pavilion Seating',
                  'Changing Rooms',
                  'Drinking Water',
                  'Washrooms',
                  'Equipment Rental'
                ].map((facility, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-700 font-medium">
                    <div className="w-5 h-5 rounded-full bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-[#16A34A]" />
                    </div>
                    {facility}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenuePreviewModal;
