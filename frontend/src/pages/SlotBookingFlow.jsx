import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Clock, ChevronLeft, Check, CreditCard, Tag, Loader2, Sparkles, Trophy } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import MockPaymentModal from '../components/MockPaymentModal';



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
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localDate = `${year}-${month}-${day}`;
    return {
      branch: null,
      date: localDate,
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [user] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });

  // Calculate if user has prepaid slots available
  const activeMemberships = user?.userMemberships?.filter(m => m.status === 'ACTIVE' && m.usedSlots < m.totalSlots) || [];
  const hasPrepaidSlots = activeMemberships.length > 0;
  const [selectedMembershipId, setSelectedMembershipId] = useState(null);
  const [, setLockingSlot] = useState(false);
  const [lockTimer, setLockTimer] = useState(-1);


  // New States for horizontal calendar and segmented switch
  const [datesList] = useState(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      const dayName = nextDate.toLocaleDateString('en-US', { weekday: 'short' });
      const dateNum = nextDate.getDate();
      const monthName = nextDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(nextDate.getDate()).padStart(2, '0');
      const localDate = `${y}-${m}-${d}`;
      dates.push({ dayName, dateNum, monthName, isoDate: localDate });
    }
    return dates;
  });

  const selectedSlotIdRef = React.useRef(booking.slotId);
  useEffect(() => {
    selectedSlotIdRef.current = booking.slotId;
  }, [booking.slotId]);

  const isSlotExpired = (slotDate, startTimeStr) => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const currentDateStr = `${year}-${month}-${day}`;
      
      if (slotDate < currentDateStr) {
        return true;
      }
      if (slotDate > currentDateStr) {
        return false;
      }

      const timeParts = startTimeStr.trim().split(' ');
      if (timeParts.length < 2) return false;
      const time = timeParts[0];
      const meridiem = timeParts[1].toUpperCase();
      
      const hourMin = time.split(':');
      if (hourMin.length < 2) return false;
      let hours = parseInt(hourMin[0]);
      const minutes = parseInt(hourMin[1]);

      if (meridiem === 'PM' && hours !== 12) {
        hours += 12;
      } else if (meridiem === 'AM' && hours === 12) {
        hours = 0;
      }

      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);

      return today >= slotTime;
    } catch (e) {
      console.error("Error checking slot expiration:", e);
      return false;
    }
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.hostname}:5000`;
    let ws;
    let reconnectTimeout;

    function connect() {
      ws = new WebSocket(socketUrl);

      ws.onopen = () => {
        console.log("WebSocket connected for real-time slots");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SLOT_UPDATE') {
            const currentUserStr = localStorage.getItem('user');
            const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
            const isOwnBooking = data.userId && currentUser && data.userId === currentUser.id;

            setSlots(prevSlots => {
              return prevSlots.map(s => {
                if (s.id === data.slotId) {
                  return { ...s, status: data.status };
                }
                return s;
              });
            });

            if (data.status === 'BOOKED' && selectedSlotIdRef.current === data.slotId && !isOwnBooking) {
              toast.error("The slot you selected was just booked by another user! Please select a different slot.");
              setBooking(prev => ({ ...prev, slotId: '', time: '', amount: 0 }));
            }
          }
        } catch (err) {
          console.error("Error handling slot socket message:", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected, reconnecting in 3 seconds...");
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, []);

  useEffect(() => {
    let interval;
    if (lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer(prev => prev - 1);
      }, 1000);
    } else if (lockTimer === 0 && booking.slotId) {
      const resetTimer = window.setTimeout(() => {
        toast.error("Slot reservation expired.");
        setBooking(prev => ({ ...prev, slotId: '', time: '', amount: 0 }));
        setLockTimer(-1);
        setStep(2); // go back to slot selection
        fetchSlots(true); // refresh to show slot is available again
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    return () => clearInterval(interval);
  }, [lockTimer, booking.slotId]);

  const handleBackClick = () => {
    if (step === 5) {
      setStep(2);
    } else {
      setStep(prev => prev - 1);
    }
  };

  const fetchAbortControllerRef = React.useRef(null);

  const fetchSlots = React.useCallback(async (isBackground = false) => {
    if (!booking.date) return;
    
    if (!isBackground) {
      setSlots([]);
      setLoadingSlots(true);
    }

    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    fetchAbortControllerRef.current = controller;

    const url = booking.branch?.id 
      ? `/api/slots?date=${booking.date}&branchId=${booking.branch.id}` 
      : `/api/slots?date=${booking.date}`;
      
    try {
      const res = await api.get(url, { signal: controller.signal });
      const newSlots = res.data || [];
      
      const uniqueMap = new Map();
      newSlots.forEach(slot => {
        if (!uniqueMap.has(slot.startTime) || slot.status !== 'AVAILABLE') {
          uniqueMap.set(slot.startTime, slot);
        }
      });
      setSlots(Array.from(uniqueMap.values()));
    } catch (err) {
      if (err.name !== 'CanceledError' && err.message !== 'canceled') {
        console.error("Error fetching slots:", err);
        if (!isBackground) setSlots([]);
      }
    } finally {
      if (!isBackground) setLoadingSlots(false);
    }
  }, [booking.date, booking.branch?.id]);

  useEffect(() => {
    fetchSlots(false);

    const interval = setInterval(() => {
      fetchSlots(true);
    }, 15000);

    return () => {
      clearInterval(interval);
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
    };
  }, [fetchSlots]);

  useEffect(() => {
    api.get('/api/branches')
      .then(res => {
        setBranchesList(res.data);
        setLoadingBranches(false);
      })
      .catch(err => {
        console.error("Error fetching branches:", err);
        setBranchesList([
          { id: 'nagole', name: 'Eagle Box Nagole', location: 'Nagole, Hyderabad', pricePerHour: 800 },
          { id: 'uppal', name: 'Eagle Box Uppal', location: 'Uppal, Hyderabad', pricePerHour: 900 },
          { id: 'gachibowli', name: 'Eagle Box Gachibowli', location: 'Gachibowli, Hyderabad', pricePerHour: 1500 },
          { id: 'kukatpally', name: 'Eagle Box Kukatpally', location: 'Kukatpally, Hyderabad', pricePerHour: 1200 }
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
        
        if (parsedBooking.time && parsedBooking.slotId) {
          setStep(5);
          toast.success("Welcome back! Continuing your slot reservation.");
        } else {
          setStep(2);
        }
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

  const handleTimeSelect = async (slotId, timeString) => {
    if (booking.slotId && booking.slotId !== slotId) {
      try { await api.delete(`/api/slots/${booking.slotId}/lock`); } catch { console.debug("Unable to release previous slot lock"); }
    }

    setLockingSlot(true);
    const basePrice = booking.branch?.pricePerHour || 1000;
    
    try {
      const res = await api.post(`/api/slots/${slotId}/lock`, {
        date: booking.date,
        time: timeString,
        branchId: booking.branch?.id,
        price: basePrice * booking.duration
      });
      
      const realSlotId = res.data.realSlotId || slotId;
      setBooking(prev => ({ 
        ...prev, 
        slotId: realSlotId, 
        time: timeString, 
        amount: basePrice * booking.duration 
      }));
      setLockTimer(300); // 5 minutes
      setDiscount(0);
      setIsCouponApplied(false);
      setAppliedCouponDetails(null);
      setCouponCode('');
      toast.success("Slot reserved for 5 minutes!");
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.error || err.message || "Failed to lock slot. Someone else might be booking it.");
      setBooking(prev => ({ ...prev, slotId: '', time: '', amount: 0 }));
    } finally {
      setLockingSlot(false);
    }
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

  const handleInitiatePayment = () => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userData || !token) {
      setShowAuthModal(true);
      return;
    }

    if (selectedMembershipId || (booking.amount - discount <= 0)) {
      // Direct booking if 0 cost
      handlePaymentSuccess();
    } else {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setIsConfirming(true);

    const baseAmount = booking.amount;
    let finalAmount = baseAmount;
    let appliedDiscount = 0;

    if (selectedMembershipId) {
      finalAmount = 0;
      appliedDiscount = baseAmount;
    } else if (isCouponApplied) {
      appliedDiscount = discount;
      finalAmount = Math.max(0, baseAmount - appliedDiscount);
    }

    try {
      const res = await api.post('/api/bookings', {
        slotId: booking.slotId,
        amountPaid: finalAmount,
        discountApplied: appliedDiscount,
        date: booking.date,
        time: booking.time,
        branchId: booking.branch.id,
        userMembershipId: selectedMembershipId
      });

      const newBookingId = res.data.id;
      const pointsEarned = res.data.pointsEarned || 50;
      setBooking(prev => ({ 
        ...prev, 
        bookingId: newBookingId,
        finalAmountPaid: finalAmount,
        pointsEarned: pointsEarned,
        membershipUsed: !!selectedMembershipId
      }));
      const userData = localStorage.getItem('user');
      const userObj = JSON.parse(userData);
      
      // Update local slots used if applicable
      if (selectedMembershipId && userObj.userMemberships) {
        const membership = userObj.userMemberships.find(m => m.id === selectedMembershipId);
        if (membership) {
          membership.usedSlots += 1;
        }
      }
      
      userObj.pointsBalance += pointsEarned;
      localStorage.setItem('user', JSON.stringify(userObj));

      toast.success("Reservation confirmed!");
      setStep(6);
      fetchSlots(true); // Trigger explicit refresh after successful booking
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.error || err.message || 'Failed to complete reservation. Try another slot.');
      fetchSlots(true); // Refresh slots in case the slot was snatched
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



            {/* Occupancy and Stats */}
            {slots.length > 0 && !loadingSlots && (() => {
              const totalSlots = slots.length;
              let bookedCount = 0;
              let availableCount = 0;
              let expiredCount = 0;
              slots.forEach(s => {
                if (s.status === 'BOOKED') bookedCount++;
                else if (isSlotExpired(booking.date, s.startTime)) expiredCount++;
                else if (s.status === 'AVAILABLE') availableCount++;
              });

              console.log(`
[Slot Debug Info]
Selected Branch: ${booking.branch?.name || 'None'}
Selected Date: ${booking.date}
Total Slots Returned: ${totalSlots}
Available Count: ${availableCount}
Booked Count: ${bookedCount}
Expired Count: ${expiredCount}
              `);

              const percentOccupied = totalSlots > 0 ? Math.round((bookedCount / totalSlots) * 100) : 0;
              
              return (
                <div className="space-y-6 pt-6 border-t border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Slots</div>
                      <div className="text-xl font-black text-slate-800 flex items-center gap-2 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> {totalSlots}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Available</div>
                      <div className="text-xl font-black text-slate-800 flex items-center gap-2 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]"></span> {availableCount}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Booked</div>
                      <div className="text-xl font-black text-slate-800 flex items-center gap-2 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> {bookedCount}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Remaining</div>
                      <div className="text-xl font-black text-[#16A34A] flex items-center gap-2 mt-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> {availableCount}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                      <span>Occupancy Rate</span>
                      <span>{percentOccupied}% Occupied</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div className="bg-slate-800 h-full rounded-full transition-all duration-500" style={{ width: `${percentOccupied}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Status Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs font-bold text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#22C55E] border border-green-600/25"></span>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#EF4444] border border-red-600/25"></span>
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#F59E0B] border border-amber-500/25"></span>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-slate-200 border border-slate-300"></span>
                <span>Expired</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              {loadingSlots ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(() => {
                    const parseTime = (timeStr) => {
                      const timeParts = timeStr.trim().split(' ');
                      if (timeParts.length < 2) return 0;
                      const time = timeParts[0];
                      const meridiem = timeParts[1].toUpperCase();
                      const hourMin = time.split(':');
                      let hours = parseInt(hourMin[0]);
                      const minutes = parseInt(hourMin[1]);
                      if (meridiem === 'PM' && hours !== 12) hours += 12;
                      else if (meridiem === 'AM' && hours === 12) hours = 0;
                      return hours * 60 + minutes;
                    };
                    const sortedSlots = [...slots].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
                    return sortedSlots.map(s => {
                    const isBooked = s.status === 'BOOKED';
                    const isLocked = s.status === 'LOCKED';
                    const isExpired = isSlotExpired(booking.date, s.startTime);
                    const isSelected = booking.slotId === s.id;
                    
                    const currentUserStr = localStorage.getItem('user');
                    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
                    const isOwnLock = isLocked && s.lockedBy === currentUser?.id;
                    
                    const timeStr = `${s.startTime} - ${s.endTime}`;
                    
                    let buttonClass;
                    let isBtnDisabled = false;
                    let extraLabel = null;

                    if (isExpired) {
                      buttonClass = "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60 line-through";
                      isBtnDisabled = true;
                    } else if (isBooked) {
                      buttonClass = "bg-[#EF4444] border-[#DC2626] text-white cursor-not-allowed opacity-90";
                      isBtnDisabled = true;
                    } else if (isSelected || isOwnLock) {
                      buttonClass = "bg-[#F59E0B] border-[#D97706] text-white shadow-md transform scale-[1.02] font-black";
                    } else if (isLocked) {
                      buttonClass = "bg-yellow-400 border-yellow-500 text-yellow-900 cursor-not-allowed opacity-90 flex-col justify-center items-center";
                      isBtnDisabled = true;
                      extraLabel = <span className="text-[8px] uppercase font-bold mt-1 bg-yellow-500/30 px-1.5 py-0.5 rounded shadow-sm text-yellow-900">Booking in Progress</span>;
                    } else {
                      buttonClass = "bg-[#22C55E] border-[#16A34A] text-white hover:bg-[#16A34A] shadow-sm hover:shadow-md transition-all";
                    }

                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={isBtnDisabled}
                        onClick={() => handleTimeSelect(s.id, timeStr)}
                        className={`py-4 px-2 rounded-xl border text-center flex flex-col items-center justify-center cursor-pointer select-none ${buttonClass}`}
                      >
                        <span className="font-bold text-xs sm:text-sm tracking-tight block">{s.startTime}</span>
                        <span className="text-[10px] opacity-80 block my-0.5">to</span>
                        <span className="font-bold text-xs sm:text-sm tracking-tight block">{s.endTime}</span>
                        {extraLabel}
                      </button>
                    );
                  })})()}
                </div>
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
            
            {lockTimer >= 0 && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2 text-amber-800">
                  <span className="font-bold text-sm">Slot Locked for You</span>
                </div>
                <div className="bg-amber-100 text-amber-900 font-black px-3 py-1 rounded shadow-sm text-lg tabular-nums">
                  {Math.floor(lockTimer / 60).toString().padStart(2, '0')}:{(lockTimer % 60).toString().padStart(2, '0')}
                </div>
              </div>
            )}

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

              <div className="pt-4 flex justify-between items-end border-b border-slate-100 pb-4">
                <div>
                  <span className="text-slate-900 font-extrabold text-base">Original Amount</span>
                </div>
                <span className={`text-xl font-black ${(selectedMembershipId || isCouponApplied) ? 'line-through text-slate-400' : 'text-[#16A34A]'}`}>
                  ₹{booking.amount}
                </span>
              </div>

              {hasPrepaidSlots && (
                <div className="py-4 border-b border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-extrabold text-slate-900 text-sm">Memberships Available</span>
                  </div>
                  <div className="text-sm font-bold text-slate-600 mb-2">Choose Booking Method:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeMemberships.map(m => (
                      <label key={m.id} className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all ${selectedMembershipId === m.id ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-slate-200 hover:border-green-300'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <input type="radio" name="bookingMethod" checked={selectedMembershipId === m.id} onChange={() => setSelectedMembershipId(m.id)} className="text-green-600 focus:ring-green-500" />
                          <span className="font-bold text-slate-900">{m.tier} ({m.totalSlots - m.usedSlots} Left)</span>
                        </div>
                        <span className="text-xs text-slate-500 ml-6">Cost: ₹0 | Expires: {new Date(m.expiryDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                      </label>
                    ))}
                    <label className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all ${!selectedMembershipId ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-slate-200 hover:border-green-300'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <input type="radio" name="bookingMethod" checked={!selectedMembershipId} onChange={() => setSelectedMembershipId(null)} className="text-green-600 focus:ring-green-500" />
                        <span className="font-bold text-slate-900">Pay Normally</span>
                      </div>
                      <span className="text-xs text-slate-500 ml-6">Cost: ₹{booking.amount}</span>
                    </label>
                  </div>
                </div>
              )}

              {(!selectedMembershipId) && (
                <div className="pt-4 pb-4 border-b border-slate-100">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter Coupon Code" 
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={isCouponApplied || isValidatingCoupon}
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold uppercase disabled:opacity-50"
                    />
                    {isCouponApplied ? (
                      <button onClick={handleRemoveCoupon} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold border border-red-200 hover:bg-red-100 transition-colors">
                        Remove
                      </button>
                    ) : (
                      <button onClick={handleApplyCoupon} disabled={!couponCode || isValidatingCoupon} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors">
                        {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedMembershipId && (
                <div className="flex justify-between items-center text-[#16A34A] font-bold text-sm bg-green-50 border border-green-200/50 rounded-xl px-4 py-3 mt-4 animate-fadeIn">
                  <span className="flex flex-col">
                    <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-black">
                      <Trophy size={14} className="text-[#16A34A]" /> {activeMemberships.find(m => m.id === selectedMembershipId)?.tier} Plan
                    </span>
                    <span className="text-[10px] text-green-700 mt-0.5">1 Prepaid Slot Applied</span>
                  </span>
                  <span className="text-lg">-₹{booking.amount}</span>
                </div>
              )}

              {(!selectedMembershipId) && isCouponApplied && (
                <div className="flex justify-between items-center text-[#16A34A] font-bold text-sm bg-green-50 border border-green-200/50 rounded-xl px-4 py-3 mt-4 animate-fadeIn">
                  <span className="flex flex-col">
                    <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-black">
                      <Tag size={14} className="text-[#16A34A]" /> {appliedCouponDetails?.code}
                    </span>
                    <span className="text-[10px] text-green-700 mt-0.5">Coupon Discount Applied</span>
                  </span>
                  <span className="text-lg">-₹{discount}</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-200 pt-4 flex justify-between items-center mt-3">
                <span className="text-slate-900 font-black text-lg">Net Payable Amount</span>
                <span className="text-3xl font-black text-[#16A34A] shadow-sm">
                  ₹{selectedMembershipId ? 0 : Math.max(0, booking.amount - discount)}
                </span>
              </div>
            </div>

            <button 
              onClick={handleInitiatePayment}
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
                <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Amount Paid</span>
                  <span className="font-extrabold text-slate-800 text-xs">₹{booking.finalAmountPaid}</span>
                </div>
                {booking.membershipUsed && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Membership Used</span>
                    <span className="font-extrabold text-[#16A34A] text-xs">1 Prepaid Slot</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Points Earned</span>
                  <span className="font-black text-xs text-[#F59E0B] bg-amber-50 border border-amber-200/50 rounded-full px-2.5 py-0.5">+{booking.pointsEarned} Pts</span>
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

      {showPaymentModal && (
        <MockPaymentModal 
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          amount={selectedMembershipId ? 0 : Math.max(0, booking.amount - discount)}
        />
      )}

    </div>
  );
}
