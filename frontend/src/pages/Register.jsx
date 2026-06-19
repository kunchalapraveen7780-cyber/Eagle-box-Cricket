import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { User, Mail, Lock, Phone, Eye, EyeOff, Loader2, Gift, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Blur validation errors
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const navigate = useNavigate();

  const validateField = (name, val) => {
    let err = '';
    if (name === 'name') {
      if (!val.trim()) err = 'Full name is required';
    } else if (name === 'email') {
      if (!val) {
        err = 'Email is required';
      } else {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(val)) err = 'Invalid email address';
      }
    } else if (name === 'phone') {
      if (!val) {
        err = 'Phone number is required';
      } else {
        const regex = /^[0-9]{10}$/;
        if (!regex.test(val)) err = 'Phone must be exactly 10 digits';
      }
    } else if (name === 'password') {
      if (!val) {
        err = 'Password is required';
      } else if (val.length < 8) {
        err = 'Password must be at least 8 characters';
      }
    } else if (name === 'confirmPassword') {
      if (val !== formData.password) {
        err = 'Passwords do not match';
      }
    }
    return err;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error dynamically when typing
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Trigger validation for all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Touch all fields
      const allTouched = {};
      Object.keys(formData).forEach(key => { allTouched[key] = true; });
      setTouched(allTouched);
      toast.error("Please fix validation errors first.");
      return;
    }

    setIsLoading(true);
    try {
      // Register request
      await api.post('/api/auth/register', { 
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        referralCode: formData.referralCode
      });
      
      toast.success('Registration successful! Logging in...');

      // Auto login post registration
      const loginRes = await api.post('/api/auth/login', {
        email: formData.email,
        password: formData.password
      });

      localStorage.setItem('token', loginRes.data.token);
      localStorage.setItem('user', JSON.stringify(loginRes.data.user));

      toast.success(`Welcome to EagleBox, ${loginRes.data.user.name}!`);

      const pendingBooking = localStorage.getItem('pending_booking');
      if (pendingBooking) {
        navigate('/customer/book');
      } else {
        navigate('/customer/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-[#0F172A]">
      
      {/* LEFT COLUMN: Benefits Section (white/light design with green features) */}
      <div className="hidden md:flex md:w-1/2 bg-white border-r border-slate-100 p-16 flex-col justify-between relative overflow-hidden">
        {/* Soft decorative grid pattern */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:30px_30px]"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#22C55E]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <Link to="/" className="text-2xl font-black tracking-tight text-[#0F172A] flex items-center gap-1.5 hover:opacity-90 transition-opacity">
            <span className="text-[#22C55E]">EagleBox</span> Cricket
          </Link>
        </div>

        <div className="my-auto relative z-10 max-w-lg">
          <h2 className="text-4xl font-black tracking-tight text-[#0F172A] mb-5 leading-tight">
            Elevate Your Cricket Booking Experience
          </h2>
          <p className="text-slate-500 text-base mb-10 leading-relaxed font-medium">
            Create an account in less than 30 seconds to lock in premium Hyderabad box wickets and schedule competitive club sessions.
          </p>

          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#16A34A] border-l-2 border-[#22C55E] pl-2.5">
              Membership Highlights
            </h3>
            <ul className="space-y-4">
              {[
                { title: "200 Welcome Loyalty Points", desc: "Instantly claim 200 points upon profile registration to apply on upcoming slots." },
                { title: "Frictionless Checkout Coupons", desc: "Gain eligibility for special promo discount vouchers and tournament brackets." },
                { title: "Advanced Slot Reservations", desc: "Lock in prime weekend matches up to 14 days in advance directly from your command board." }
              ].map((feat, idx) => (
                <li key={idx} className="flex gap-3.5 items-start">
                  <div className="w-6 h-6 bg-green-50 border border-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{feat.title}</h4>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">{feat.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative z-10 text-slate-400 text-xs font-medium">
          © 2026 Eagle Box Cricket. Made with ❤️ in Hyderabad.
        </div>
      </div>

      {/* RIGHT COLUMN: Registration Form Card */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-16 bg-[#F8FAFC] overflow-y-auto">
        <div className="w-full max-w-md bg-white border border-slate-100 shadow-sm rounded-3xl p-8 sm:p-10 space-y-6 my-auto">
          
          <div className="md:hidden text-center">
            <Link to="/" className="text-2xl font-black text-[#0F172A] flex items-center justify-center gap-1">
              <span className="text-[#22C55E]">EagleBox</span> Cricket
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
              Create an Account
            </h1>
            <p className="mt-2 text-xs text-slate-500 font-semibold leading-relaxed">
              Sign up today and receive 200 welcome loyalty points automatically.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`block w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${
                    touched.name && errors.name ? 'border-red-400 focus:ring-red-105' : 'border-slate-200 focus:ring-green-105'
                  } rounded-xl text-[#0F172A] placeholder-slate-400 transition-all outline-none font-bold text-xs focus:bg-white`} 
                  placeholder="John Doe"
                  required 
                />
              </div>
              {touched.name && errors.name && (
                <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`block w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${
                    touched.email && errors.email ? 'border-red-400 focus:ring-red-105' : 'border-slate-200 focus:ring-green-105'
                  } rounded-xl text-[#0F172A] placeholder-slate-400 transition-all outline-none font-bold text-xs focus:bg-white`} 
                  placeholder="name@company.com"
                  required 
                />
              </div>
              {touched.email && errors.email && (
                <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`block w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${
                      touched.phone && errors.phone ? 'border-red-400 focus:ring-red-105' : 'border-slate-200 focus:ring-green-105'
                    } rounded-xl text-[#0F172A] placeholder-slate-400 transition-all outline-none font-bold text-xs focus:bg-white`} 
                    placeholder="9876543210"
                    required
                  />
                </div>
                {touched.phone && errors.phone && (
                  <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Referral Code (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Gift className="h-4 w-4 text-[#16A34A]" />
                  </div>
                  <input 
                    type="text" 
                    name="referralCode"
                    value={formData.referralCode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 transition-all outline-none font-bold text-xs focus:bg-white uppercase focus:ring-1 focus:ring-green-105" 
                    placeholder="EBC-XXXX"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`block w-full pl-10 pr-10 py-2.5 bg-slate-50 border ${
                    touched.password && errors.password ? 'border-red-400 focus:ring-red-105' : 'border-slate-200 focus:ring-green-105'
                  } rounded-xl text-[#0F172A] placeholder-slate-400 transition-all outline-none font-bold text-xs focus:bg-white`} 
                  placeholder="At least 8 characters"
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {touched.password && errors.password && (
                <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.password}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`block w-full pl-10 pr-10 py-2.5 bg-slate-50 border ${
                    touched.confirmPassword && errors.confirmPassword ? 'border-red-400 focus:ring-red-105' : 'border-slate-200 focus:ring-green-105'
                  } rounded-xl text-[#0F172A] placeholder-slate-400 transition-all outline-none font-bold text-xs focus:bg-white`} 
                  placeholder="Confirm password"
                  required 
                />
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> {errors.confirmPassword}
                </p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white py-3.5 px-4 mt-2 rounded-xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer shadow-sm text-xs uppercase tracking-wider hover:translate-y-[-1px] active:translate-y-[0]"
            >
              {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Register & Join'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 font-semibold pt-2">
            Already have an account?{' '}
            <Link to="/login/customer" className="text-[#16A34A] font-extrabold hover:underline transition-colors">
              Log In
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}
