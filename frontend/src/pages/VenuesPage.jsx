import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import PremiumVenueCard from '../components/PremiumVenueCard';
import VenuePreviewModal from '../components/VenuePreviewModal';

export default function VenuesPage() {
  const [user, setUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPreviewVenue, setSelectedPreviewVenue] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
            {branches.map((branch) => (
              <PremiumVenueCard key={branch.id} branch={branch} onImageClick={(b) => setSelectedPreviewVenue(b)} />
            ))}
          </div>
        )}
      </main>

      {/* Preview Modal */}
      {selectedPreviewVenue && (
        <VenuePreviewModal 
          branch={selectedPreviewVenue} 
          onClose={() => setSelectedPreviewVenue(null)} 
        />
      )}

      {/* Basic Footer */}
      <footer className="bg-[#0F172A] text-white py-8 px-6 text-center text-xs text-gray-500 border-t border-gray-800 mt-20">
        <div>© 2026 Eagle Box Cricket. All rights reserved. Premium Sports Booking Platform.</div>
      </footer>

    </div>
  );
}
