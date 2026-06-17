import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Clock, ChevronLeft, Check, CreditCard, Tag, X, Loader2, Sparkles, Trophy } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const generateMockSlots = (price) => [
  { id: 'm-ms1', startTime: '08:30 AM', endTime: '09:30 AM', status: 'AVAILABLE', price },
  { id: 'm-ms2', startTime: '09:30 AM', endTime: '10:30 AM', status: 'BOOKED', price },
  { id: 'm-ms3', startTime: '10:30 AM', endTime: '11:30 AM', status: 'AVAILABLE', price },
  { id: 'm-ms4', startTime: '11:30 AM', endTime: '12:30 PM', status: 'AVAILABLE', price },
  { id: 'e-ms1', startTime: '12:30 PM', endTime: '01:30 PM', status: 'AVAILABLE', price },
  { id: 'e-ms2', startTime: '02:00 PM', endTime: '03:00 PM', status: 'BOOKED', price },
  { id: 'e-ms3', startTime: '04:30 PM', endTime: '05:30 PM', status: 'AVAILABLE', price },
  { id: 'e-ms4', startTime: '05:30 PM', endTime: '06:30 PM', status: 'AVAILABLE', price },
  { id: 'e-ms5', startTime: '07:00 PM', endTime: '08:00 PM', status: 'AVAILABLE', price },
];

const SkeletonCard = () => (
  <div className="border border-slate-100 bg-white rounded-xl p-5 animate-pulse shadow-sm">
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 bg-slate-200 rounded-full shrink-0"></div>
      <div className="space-y-3 flex-1">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

const SlotSkeleton = () => (
  <div className="h-12 bg-slate-50 border border-slate-200 rounded-lg animate-pulse"></div>
);

export default function SlotBookingFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState(() => {
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];
    return {
      branch: null,
      date: isoDate,
      time: '',
      duration: 1,
      amount: 0,
      bookingId: '',
      slotId: ''
    };
  });

  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [branchesList, setBranchesList] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCouponDetails, setAppliedCouponDetails] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // New States for horizontal calendar and segmented switch
  const [datesList] = useState(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      const dayName = nextDate.toLocaleDateString('en-US', { weekday: 'short' });
      const dateNum = nextDate.getDate();
      const monthName = nextDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const isoDate = nextDate.toISOString().split('T')[0];
      dates.push({ dayName, dateNum, monthName, isoDate });
    }
    return dates;
  });
  const [timeSegment, setTimeSegment] = useState('morning'); // 'morning' | 'evening'

  const handleBackClick = () => {
    if (step === 5) {
      setStep(2);
    } else {
      setStep(prev => prev - 1);
    }
  };

  useEffect(() => {
    if (booking.date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingSlots(true);
      const url = booking.branch?.id 
        ? `/api/slots?date=${booking.date}&branchId=${booking.branch.id}` 
        : `/api/slots?date=${booking.date}`;
      api.get(url)
        .then(res => {
          if (res.data && res.data.length > 0) {
            setSlots(res.data);
          } else {
            setSlots(generateMockSlots(booking.branch?.pricePerHour || 1000));
          }
        })
        .catch(err => {
          console.error("Error fetching slots:", err);
          setSlots(generateMockSlots(booking.branch?.pricePerHour || 1000));
        })
        .finally(() => {
          setLoadingSlots(false);
        });
    }
  }, [booking.date, booking.branch?.id, booking.branch?.pricePerHour]);

  useEffect(() => {
    api.get('/api/branches')
      .then(res => {
        setBranchesList(res.data);
        setLoadingBranches(false);
      })
      .catch(err => {
        console.error("Error fetching branches:", err);
        setBranchesList([
          { id: 'indiranagar', name: 'Eagle Box Cricket Indiranagar', location: 'Indiranagar, Bengaluru', pricePerHour: 1200 },
          { id: 'koramangala', name: 'Eagle Box Cricket Koramangala', location: 'Koramangala, Bengaluru', pricePerHour: 1000 },
          { id: 'hsr', name: 'Eagle Box Cricket HSR Layout', location: 'HSR Layout, Bengaluru', pricePerHour: 1500 },
          { id: 'whitefield', name: 'Eagle Box Cricket Whitefield', location: 'Whitefield, Bengaluru', pricePerHour: 1100 }
        ]);
        setLoadingBranches(false);
      });
  }, []);

  useEffect(() => {
    const pendingBookingStr = localStorage.getItem('pending_booking');
    const userData = localStorage.getItem('user');
    
    if (pendingBookingStr && userData) {
      try {
        const parsedBooking = JSON.parse(pendingBookingStr);
        localStorage.removeItem('pending_booking');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBooking(parsedBooking);
        setStep(5);
        toast.success("Welcome back! Continuing your slot reservation.");
      } catch (e) {
        console.error("Failed parsing pending booking", e);
      }
    }
  }, []);

  useEffect(() => {
    if (step === 6) {
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#22C55E', '#16A34A', '#FFFFFF']
      });
    }
  }, [step]);

  const nextStep = () => setStep(prev => prev + 1);

  const handleBranchSelect = (branch) => {
    setBooking(prev => ({ ...prev, branch }));
    setDiscount(0);
    setIsCouponApplied(false);
    setAppliedCouponDetails(null);
    setCouponCode('');
    if (step === 1) nextStep();
  };

  const handleTimeSelect = (slotId, timeString) => {
    const basePrice = booking.branch?.pricePerHour || 1000;
    setBooking(prev => ({ 
      ...prev, 
      slotId, 
      time: timeString, 
      amount: basePrice * prev.duration 
    }));
    setDiscount(0);
    setIsCouponApplied(false);
    setAppliedCouponDetails(null);
    setCouponCode('');
  };

  const handleDurationSelect = (duration) => {
    const basePrice = booking.branch?.pricePerHour || 1000;
    setBooking(prev => ({ 
      ...prev, 
      duration, 
      amount: basePrice * duration 
    }));
    setDiscount(0);
    setIsCouponApplied(false);
    setAppliedCouponDetails(null);
    setCouponCode('');
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsValidatingCoupon(true);
    try {
      const res = await api.post('/api/offers/validate', {
        code: couponCode.toUpperCase().trim(),
        bookingAmount: booking.amount
      });
      setDiscount(res.data.discountAmount);
      setAppliedCouponDetails(res.data);
      setIsCouponApplied(true);
      toast.success(`Coupon "${res.data.code}" applied! Save ₹${res.data.discountAmount}.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or expired coupon.');
      setDiscount(0);
      setIsCouponApplied(false);
      setAppliedCouponDetails(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setDiscount(0);
    setIsCouponApplied(false);
    setAppliedCouponDetails(null);
    toast.success('Coupon removed.');
  };

  const handleConfirmBooking = async () => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userData || !token) {
      setShowAuthModal(true);
      return;
    }

    const finalAmount = booking.amount - discount;
    setIsConfirming(true);

    try {
      const res = await api.post('/api/bookings', {
        slotId: booking.slotId,
        amountPaid: finalAmount,
        couponApplied: isCouponApplied ? appliedCouponDetails?.code : null
      });

      const newBookingId = res.data.id;
      setBooking(prev => ({ ...prev, bookingId: newBookingId }));
      
      const userObj = JSON.parse(userData);
      const pointsEarned = res.data.pointsEarned || Math.floor(finalAmount / 10);
      userObj.pointsBalance += pointsEarned;
      localStorage.setItem('user', JSON.stringify(userObj));

      toast.success("Reservation confirmed!");
      setStep(6);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete reservation. Try another slot.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleAuthRedirect = (path) => {
    localStorage.setItem('pending_booking', JSON.stringify(booking));
    navigate(path);
  };

  const getStepperActivePhase = () => {
    if (step === 1) return 1;
    if (step === 2) return 2;
    if (step === 5) return 3;
    return 4;
  };

  const currentPhase = getStepperActivePhase();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-10 px-4 font-sans text-[#0F172A]">
      
      <div className="w-full max-w-6xl flex items-center justify-between mb-8">
        <Link to="/" className="text-2xl font-black tracking-tight text-[#0F172A] flex items-center gap-1 cursor-pointer">
          <span className="text-[#22C55E]">EagleBox</span> Cricket
        </Link>
        {step > 1 && step < 6 && (
          <button 
            onClick={handleBackClick} 
            className="text-slate-600 hover:text-[#0F172A] text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg shadow-sm transition-colors"
          >
            <ChevronLeft size={14} /> Back
          </button>
        )}
      </div>

      <div className="w-full max-w-6xl bg-white border border-slate-100 rounded-2xl p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between">
          {[
            { id: 1, name: "Venue & Date" },
            { id: 2, name: "Slot & Hours" },
            { id: 3, name: "Summary & Pay" },
            { id: 4, name: "Reserved" }
          ].map((phase, idx) => {
            const isCompleted = currentPhase > phase.id;
            const isActive = currentPhase === phase.id;
            return (
              <React.Fragment key={phase.id}>
                <div className="flex flex-col items-center space-y-2 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-[#22C55E] text-white shadow-sm' 
                      : isActive 
                        ? 'bg-green-50 border border-[#22C55E] text-[#16A34A] shadow-sm' 
                        : 'bg-slate-50 border border-slate-200 text-slate-400'
                  }`}>
                    {isCompleted ? <Check size={14} /> : phase.id}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${
                    isActive ? 'text-[#16A34A]' : isCompleted ? 'text-[#0F172A]' : 'text-slate-400'
                  }`}>
                    {phase.name}
                  </span>
                </div>
                {idx < 3 && (
                  <div className="flex-1 h-[2px] bg-slate-100 mx-2 sm:mx-4 relative">
                    <div className={`absolute top-0 left-0 h-[2px] bg-[#22C55E] transition-all duration-500 ${
                      isCompleted ? 'w-full' : 'w-0'
                    }`}></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-6xl space-y-6">
        
        <div className={`bg-white border ${step === 1 ? 'border-[#22C55E]/30 shadow-md' : 'border-slate-100 shadow-sm'} rounded-2xl p-6 transition-all duration-300`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${booking.branch ? 'bg-[#22C55E] text-white' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                {booking.branch ? <Check size={16} /> : '1'}
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-[#0F172A]">Select Venue Branch</h2>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Choose ground location</p>
              </div>
            </div>
            {step > 1 && booking.branch && (
              <button onClick={() => setStep(1)} className="text-xs text-[#22C55E] font-bold hover:underline cursor-pointer">Modify</button>
            )}
          </div>
          
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {loadingBranches ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                branchesList.map(b => (
                  <div 
                    key={b.id} 
                    onClick={() => handleBranchSelect(b)}
                    className="border border-slate-250 bg-slate-50/50 hover:bg-white rounded-xl p-5 cursor-pointer hover:border-[#22C55E] hover:shadow-sm transition-all flex items-start gap-3.5 group"
                  >
                    <MapPin className="text-slate-400 group-hover:text-[#22C55E] mt-0.5 shrink-0 transition-colors" size={20} />
                    <div className="flex-1">
                      <h3 className="font-extrabold text-[#0F172A] text-base group-hover:text-[#22C55E] transition-colors">{b.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{b.location}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pricing</span>
                        <span className="text-[#16A34A] font-black text-sm">₹{b.pricePerHour}/hr</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {step > 1 && booking.branch && (
             <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
               <MapPin size={16} className="text-[#22C55E]" /> {booking.branch.name}
             </div>
          )}
        </div>

        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm space-y-8 transition-all duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">Select Date & Time</h2>
                <p className="text-sm sm:text-base text-slate-400 font-semibold mt-1">Choose turf reservation date, duration, and time slot.</p>
              </div>
            </div>

            {/* Date Selection Carousel Slider */}
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Select Play Date</label>
              <div className="flex items-stretch gap-3 overflow-hidden bg-slate-50 border border-slate-200/60 p-2 rounded-2xl select-none">
                {/* Vertical Month Indicator */}
                <div className="flex flex-col items-center justify-center bg-[#0F172A] text-white py-3 px-4.5 rounded-xl shrink-0 font-black text-xs tracking-widest uppercase">
                  {datesList.length > 0 && (datesList.find(d => d.isoDate === booking.date)?.monthName || 'JUN')}
                </div>

                {/* Horizontal Scrolling Pills */}
                <div className="flex-1 flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1">
                  {datesList.map((d) => {
                    const isSelected = booking.date === d.isoDate;
                    return (
                      <button
                        key={d.isoDate}
                        type="button"
                        onClick={() => {
                          setBooking(prev => ({ ...prev, date: d.isoDate }));
                          setDiscount(0);
                          setIsCouponApplied(false);
                          setAppliedCouponDetails(null);
                          setCouponCode('');
                        }}
                        className={`flex flex-col items-center justify-center py-3 px-5 rounded-xl border shrink-0 min-w-[70px] transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#0F172A] border-[#0F172A] text-white font-extrabold shadow-sm scale-102' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">{d.dayName}</span>
                        <span className="text-lg font-black block mt-1 leading-none">{d.dateNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Duration Step-Counter Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 border-t border-b border-slate-100 bg-[#FAFAF9]/50 px-6 rounded-2xl">
              <div>
                <h3 className="text-base font-black text-[#0F172A]">Duration</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Duration of the slots</p>
              </div>
              
              <div className="flex items-center bg-[#0F172A] text-white rounded-xl p-1.5 shadow-sm">
                <button 
                  type="button" 
                  onClick={() => {
                    if (booking.duration > 0.5) {
                      handleDurationSelect(booking.duration - 0.5);
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg font-black transition-colors border-none text-white cursor-pointer text-lg animate-none"
                >
                  −
                </button>
                <span className="px-5 text-sm font-black tracking-wide min-w-[75px] text-center">
                  {booking.duration} hr
                </span>
                <button 
                  type="button" 
                  onClick={() => {
                    if (booking.duration < 4.0) {
                      handleDurationSelect(booking.duration + 0.5);
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg font-black transition-colors border-none text-white cursor-pointer text-lg animate-none"
                >
                  +
                </button>
              </div>
            </div>

            {/* Morning / Evening Switcher Tab */}
            <div className="space-y-4">
              <div className="relative w-full bg-slate-100 p-1.5 rounded-2xl flex items-center border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setTimeSegment('morning')}
                  className={`flex-1 text-center py-3 text-sm font-black rounded-xl transition-all cursor-pointer border-none z-10 ${
                    timeSegment === 'morning'
                      ? 'bg-white text-[#0F172A] border border-[#0F172A] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Morning
                </button>
                <button
                  type="button"
                  onClick={() => setTimeSegment('evening')}
                  className={`flex-1 text-center py-3 text-sm font-black rounded-xl transition-all cursor-pointer border-none z-10 ${
                    timeSegment === 'evening'
                      ? 'bg-white text-[#0F172A] border border-[#0F172A] shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Evening
                </button>
              </div>

              {/* Slot Cards List */}
              {loadingSlots ? (
                <div className="grid grid-cols-2 gap-4">
                  <SlotSkeleton />
                  <SlotSkeleton />
                  <SlotSkeleton />
                  <SlotSkeleton />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-semibold">
                  No slots available for this branch on the selected date. Check admin panel schedule.
                </div>
              ) : (
                (() => {
                  // Filter morning / evening slots based on start time string
                  const filteredSlots = slots.filter(s => {
                    const startPart = s.startTime.split('-')[0].trim();
                    const isAM = startPart.includes('AM');
                    const hour = parseInt(startPart.split(':')[0]);
                    const isMorning = isAM && (hour !== 12); // 12 AM is midnight, 12 PM is noon
                    return timeSegment === 'morning' ? isMorning : !isMorning;
                  });

                  if (filteredSlots.length === 0) {
                    return (
                      <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] text-xs font-semibold">
                        No {timeSegment} slots available. Try selecting another date.
                      </div>
                    );
                  }

                  return (
                    <div className={`grid gap-4 ${
                      timeSegment === 'morning'
                        ? 'grid-cols-2 sm:grid-cols-3'
                        : 'grid-cols-2'
                    }`}>
                      {filteredSlots.map(s => {
                        const isBooked = s.status === 'BOOKED';
                        const isSelected = booking.slotId === s.id;
                        const timeStr = `${s.startTime} - ${s.endTime}`;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={isBooked}
                            onClick={() => handleTimeSelect(s.id, timeStr)}
                            className={`py-6 px-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer select-none ${
                              isBooked
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                : isSelected
                                  ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-sm transform scale-[1.01]'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-extrabold text-sm sm:text-base tracking-tight">{timeStr}</span>
                            <span className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${
                              isSelected ? 'text-white/80' : 'text-slate-400'
                            }`}>
                              1 turf available
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Stepper continue CTA */}
            {booking.time && (
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  type="button"
                  onClick={() => setStep(5)} 
                  className="w-full sm:w-auto bg-[#22C55E] hover:bg-[#16A34A] text-white font-black py-4 px-8 rounded-2xl transition-all hover:scale-[1.01] cursor-pointer text-sm uppercase tracking-wider shadow-lg shadow-green-500/15"
                >
                  Proceed to Summary & Pay →
                </button>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="bg-white border border-[#22C55E]/30 shadow-lg rounded-2xl p-6 transition-all duration-300">
            <h2 className="text-xl font-black text-[#0F172A] mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#22C55E]" /> Booking Summary
            </h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500">Branch Ground</span>
                <span className="font-extrabold text-slate-900">{booking.branch.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500">Date</span>
                <span className="font-extrabold text-slate-900">
                  {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500">Time Window</span>
                <span className="font-extrabold text-[#16A34A]">{booking.time}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500">Duration</span>
                <span className="font-extrabold text-slate-900">{booking.duration} Hour{booking.duration > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500">Rate Card</span>
                <span className="font-extrabold text-slate-900">₹{booking.branch?.pricePerHour || 1000} / hour</span>
              </div>

              <div className="pt-4 flex justify-between items-end">
                <div>
                  <span className="text-slate-900 font-extrabold text-base">Total Turf Amount</span>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">₹{booking.branch?.pricePerHour || 1000} × {booking.duration} hr</div>
                </div>
                <span className={`text-xl font-black ${isCouponApplied ? 'line-through text-slate-400' : 'text-[#16A34A]'}`}>
                  ₹{booking.amount}
                </span>
              </div>

              {isCouponApplied && (
                <div className="flex justify-between items-center text-[#16A34A] font-bold text-sm bg-green-50 border border-green-200/50 rounded-xl px-4 py-2.5 mt-2 animate-fadeIn">
                  <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Tag size={14} className="text-[#16A34A]" /> Applied: {appliedCouponDetails?.code}
                  </span>
                  <span>-₹{discount}</span>
                </div>
              )}

              {isCouponApplied && (
                <div className="border-t border-dashed border-slate-200 pt-4 flex justify-between items-center mt-3">
                  <span className="text-slate-900 font-black text-lg">Net Payable Amount</span>
                  <span className="text-2xl font-black text-[#16A34A] shadow-sm">₹{booking.amount - discount}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-5 mb-6">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Promo Code Discount</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={isCouponApplied}
                  placeholder="e.g. WELCOME10"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold uppercase outline-none focus:ring-1 focus:ring-[#22C55E] text-xs disabled:opacity-50"
                />
                {isCouponApplied ? (
                  <button 
                    onClick={handleRemoveCoupon}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold border border-red-200 rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer text-xs"
                  >
                    <X size={14} /> Remove
                  </button>
                ) : (
                  <button 
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponCode}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold rounded-xl transition-all disabled:opacity-50 shrink-0 cursor-pointer text-xs"
                  >
                    {isValidatingCoupon ? 'Validating...' : 'Apply Code'}
                  </button>
                )}
              </div>
            </div>

            <button 
              onClick={handleConfirmBooking}
              disabled={isConfirming}
              className="w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 text-white font-black text-sm py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" /> Reserving...
                </>
              ) : (
                <>
                  <CreditCard size={18} /> Confirm & Reserve Ground
                </>
              )}
            </button>
          </div>
        )}

        {step === 6 && (
          <div className="bg-white border border-slate-100 shadow-xl rounded-3xl p-10 text-center relative overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 bg-[#22C55E]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-16 h-16 bg-[#22C55E]/10 text-[#16A34A] border border-green-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Booking Secured!</h2>
            <p className="text-slate-500 text-sm mb-8">We've locked in your turf reservation. Get ready to play.</p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-sm mx-auto text-left relative mb-8">
              <div className="w-4 h-4 rounded-full bg-[#F8FAFC] absolute top-1/2 -translate-y-1/2 -left-2.5 border-r border-slate-200"></div>
              <div className="w-4 h-4 rounded-full bg-[#F8FAFC] absolute top-1/2 -translate-y-1/2 -right-2.5 border-l border-slate-200"></div>

              <div className="space-y-3.5">
                <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Booking ID</span>
                  <span className="font-extrabold text-slate-800 text-xs select-all">{booking.bookingId}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Branch Arena</span>
                  <span className="font-extrabold text-slate-800 text-xs">{booking.branch.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Date</span>
                  <span className="font-extrabold text-slate-800 text-xs">
                    {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Time Slot</span>
                  <span className="font-extrabold text-slate-800 text-xs">{booking.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Status</span>
                  <span className="font-black text-xs text-[#16A34A] bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full px-2.5 py-0.5">Confirmed</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button 
                onClick={() => navigate('/customer/dashboard')} 
                className="w-full sm:w-auto px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Go To Dashboard
              </button>
              <button 
                onClick={() => {
                  setStep(1);
                  setBooking({ branch: null, date: '', time: '', duration: 1, amount: 0, bookingId: '', slotId: '' });
                }} 
                className="w-full sm:w-auto px-6 py-3 bg-[#22C55E] hover:bg-[#16A34A] text-white font-black rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              >
                Book Another Slot
              </button>
            </div>
          </div>
        )}

      </div>

      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full relative shadow-2xl text-[#0F172A]">
            <button 
              onClick={() => setShowAuthModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              ✕
            </button>
            <div className="w-14 h-14 bg-green-50 border border-green-150 rounded-full flex items-center justify-center mx-auto mb-5">
              <Clock className="w-6 h-6 text-[#22C55E]" />
            </div>
            <h3 className="text-xl font-black text-center text-slate-900 mb-2">Authentication Required</h3>
            <p className="text-center text-slate-500 text-xs leading-relaxed mb-8 font-medium">Please Login or Create an Account to secure this ground slot under your name.</p>
            <div className="space-y-3">
              <button 
                onClick={() => handleAuthRedirect('/login/customer')} 
                className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white font-black py-3 rounded-xl transition-colors cursor-pointer text-xs"
              >
                Sign In
              </button>
              <button 
                onClick={() => handleAuthRedirect('/register/customer')} 
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer text-xs"
              >
                Create Account (Get 200 pts)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
