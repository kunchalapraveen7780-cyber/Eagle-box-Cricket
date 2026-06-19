import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trophy, CheckCircle, ShieldCheck, Zap, ArrowRight, Home } from 'lucide-react';
import ReactConfetti from 'react-confetti';

export default function MembershipSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowDimension, setWindowDimension] = useState({ width: window.innerWidth, height: window.innerHeight });

  const { tier = "GOLD", amountPaid = 0 } = location.state || {};

  useEffect(() => {
    const detectSize = () => setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', detectSize);
    
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    
    return () => {
      window.removeEventListener('resize', detectSize);
      clearTimeout(timer);
    };
  }, []);

  const getTierDetails = (tier) => {
    switch (tier) {
      case 'CHAMPION':
        return {
          color: 'bg-purple-500',
          textColor: 'text-purple-600',
          borderColor: 'border-purple-200',
          bgColor: 'bg-purple-50',
          benefits: [
            "50 Prepaid Slots added to balance",
            "Valid for 12 Months",
            "VIP priority & tournaments",
            "Premium customer support",
            "50 Loyalty Points per booking"
          ]
        };
      case 'ELITE':
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-200',
          bgColor: 'bg-blue-50',
          benefits: [
            "37 Prepaid Slots added to balance",
            "Valid for 6 Months",
            "Exclusive member offers",
            "Priority customer support",
            "50 Loyalty Points per booking"
          ]
        };
      case 'PRO':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-600',
          borderColor: 'border-green-200',
          bgColor: 'bg-green-50',
          benefits: [
            "12 Prepaid Slots added to balance",
            "Valid for 3 Months",
            "Priority booking access",
            "50 Loyalty Points per booking"
          ]
        };
      case 'STARTER':
      default:
        return {
          color: 'bg-slate-400',
          textColor: 'text-slate-600',
          borderColor: 'border-slate-200',
          bgColor: 'bg-slate-50',
          benefits: [
            "4 Prepaid Slots added to balance",
            "Valid for 1 Month",
            "Standard booking access",
            "50 Loyalty Points per booking"
          ]
        };
    }
  };

  const details = getTierDetails(tier);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {showConfetti && (
        <ReactConfetti
          width={windowDimension.width}
          height={windowDimension.height}
          recycle={false}
          numberOfPieces={400}
          gravity={0.15}
        />
      )}

      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden relative z-10 animate-fadeIn">
        {/* Header */}
        <div className={`p-8 text-center ${details.bgColor} border-b ${details.borderColor}`}>
          <div className="flex justify-center mb-4">
            <div className={`w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center ${details.textColor}`}>
              <Trophy size={40} className={tier === 'PLATINUM' ? 'animate-bounce' : ''} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Welcome to {tier}!</h1>
          <p className="text-slate-600 font-medium">Your membership has been successfully activated.</p>
        </div>

        {/* Receipt Details */}
        <div className="p-8">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-[#22C55E]" size={24} />
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Payment Status</p>
                <p className="font-black text-slate-900">Successful</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Amount Paid</p>
              <p className="font-black text-slate-900 text-xl">₹{amountPaid}</p>
            </div>
          </div>

          <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck size={20} className={details.textColor} />
            Your New Benefits
          </h3>

          <ul className="space-y-4 mb-8">
            {details.benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-center gap-3 text-slate-700 font-medium">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${details.bgColor} ${details.textColor}`}>
                  <Zap size={14} />
                </div>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-slate-100">
            <button 
              onClick={() => navigate('/customer/book')}
              className="flex-1 bg-[#22C55E] hover:bg-green-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
            >
              Book a Slot Now <ArrowRight size={18} />
            </button>
            <button 
              onClick={() => navigate('/customer/dashboard')}
              className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Home size={18} /> Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
