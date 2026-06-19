import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MockPaymentModal({ amount, onSuccess, onCancel }) {
  const [status, setStatus] = useState('PROCESSING'); // PROCESSING, SUCCESS, FAILED

  const onSuccessRef = React.useRef(onSuccess);
  
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    console.log(`[MockPayment] Processing started for amount: ₹${amount}`);
    let isMounted = true;
    
    // Simulate payment processing (1-2 seconds)
    const processingTime = Math.floor(Math.random() * 1000) + 1000; 

    const timer1 = setTimeout(() => {
      if (!isMounted) return;
      // 95% success rate simulation
      if (Math.random() > 0.05) {
        console.log("[MockPayment] Payment mock successful.");
        setStatus('SUCCESS');
        setTimeout(() => {
          if (isMounted) onSuccessRef.current();
        }, 500); // 0.5s to show success before callback
      } else {
        console.error("[MockPayment] Payment mock failed.");
        setStatus('FAILED');
      }
    }, processingTime);

    // Timeout protection: if stuck for 10 seconds, force error
    const timeoutTimer = setTimeout(() => {
      if (isMounted && status === 'PROCESSING') {
        console.error("[MockPayment] Processing exceeded 10 seconds timeout!");
        setStatus('FAILED');
        toast.error("Payment timed out. Please try again.");
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(timer1);
      clearTimeout(timeoutTimer);
    };
  }, [amount, status]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl relative overflow-hidden">
        {status === 'PROCESSING' && (
          <div className="flex flex-col items-center animate-fadeIn">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-[#22C55E] rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Processing Payment</h3>
            <p className="text-slate-500 text-sm">Please do not close or refresh this window.</p>
            <div className="mt-6 font-extrabold text-2xl text-slate-900">₹{amount}</div>
          </div>
        )}

        {status === 'SUCCESS' && (
          <div className="flex flex-col items-center animate-fadeIn">
            <CheckCircle className="w-20 h-20 text-[#22C55E] mb-4 animate-bounce" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">Payment Successful!</h3>
            <p className="text-slate-500 text-sm">Your transaction was completed.</p>
          </div>
        )}

        {status === 'FAILED' && (
          <div className="flex flex-col items-center animate-fadeIn">
            <XCircle className="w-20 h-20 text-red-500 mb-4" />
            <h3 className="text-2xl font-black text-slate-800 mb-2">Payment Failed</h3>
            <p className="text-slate-500 text-sm mb-6">Something went wrong with your bank. Please try again.</p>
            <button
              onClick={onCancel}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition-colors"
            >
              Close & Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
