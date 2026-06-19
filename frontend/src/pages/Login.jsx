import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../lib/api';
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Blur validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.pathname.includes('admin') ? 'ADMIN' : 'CUSTOMER';

  const validateEmail = (val) => {
    if (!val) {
      return 'Email address is required';
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(val)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (val) => {
    if (!val) {
      return 'Password is required';
    }
    if (val.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return '';
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    setPasswordError(validatePassword(password));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Trigger validation
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    
    if (emailErr || passErr) {
      setEmailError(emailErr);
      setPasswordError(passErr);
      setEmailTouched(true);
      setPasswordTouched(true);
      toast.error("Please fix form errors first.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      toast.success(`Welcome back, ${res.data.user.name}!`);
      
      if (res.data.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        const pendingBooking = localStorage.getItem('pending_booking');
        if (pendingBooking) {
          navigate('/customer/book');
        } else {
          navigate('/customer/dashboard');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Check credentials.');
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      try {
        const decoded = jwtDecode(credentialResponse.credential);
        if (decoded && decoded.picture) {
          localStorage.setItem('google_picture', decoded.picture);
        }
      } catch (e) {
        console.error("Failed to decode Google token:", e);
      }

      const res = await api.post('/api/auth/google-login', {
        credential: credentialResponse.credential,
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      toast.success(`Logged in with Google!`);
      const pendingBooking = localStorage.getItem('pending_booking');
      if (pendingBooking) {
        navigate('/customer/book');
      } else {
        navigate('/customer/dashboard');
      }
    } catch {
      toast.error('Google Login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-[#0F172A]">
      
      {/* LEFT COLUMN: Benefits section (white/light design with green features) */}
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
            Book Premium Turf Grounds in Hyderabad
          </h2>
          <p className="text-slate-500 text-base mb-10 leading-relaxed font-medium">
            Join the elite community of turf cricketers booking slots instantly. Earn loyalty points on every match and claim membership status.
          </p>

          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#16A34A] border-l-2 border-[#22C55E] pl-2.5">
              Player Privileges
            </h3>
            <ul className="space-y-4">
              {[
                { title: "Loyalty Points Back", desc: "Gain point balances for every rupee spent, convertible into discount coupons." },
                { title: "Priority Weekend Bookings", desc: "Unlock booking availability up to 14 days ahead for peak time sessions." },
                { title: "Instant Confirmations", desc: "Automated real-time scheduling. No waiting, no double booking." }
              ].map((feat, idx) => (
                <li key={idx} className="flex gap-3.5 items-start">
                  <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center shrink-0 mt-0.5 border border-green-100">
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

      {/* RIGHT COLUMN: Login Card Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-16 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white border border-slate-100 shadow-sm rounded-3xl p-8 sm:p-10 space-y-8">
          
          {/* Logo showing only on mobile */}
          <div className="md:hidden text-center">
            <Link to="/" className="text-2xl font-black text-[#0F172A] flex items-center justify-center gap-1">
              <span className="text-[#22C55E]">EagleBox</span> Cricket
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">
              {role === 'ADMIN' ? 'Admin command center' : 'Sign in to EagleBox'}
            </h1>
            <p className="mt-2 text-xs text-slate-500 font-semibold leading-relaxed">
              {role === 'ADMIN' 
                ? 'Sign in to access real-time scheduler management.' 
                : 'Manage bookings, check rewards points, and redeem coupons.'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  className={`block w-full pl-10 pr-4 py-3 bg-slate-50 border ${
                    emailTouched && emailError ? 'border-red-400 focus:ring-red-105' : 'border-slate-200 focus:ring-green-105'
                  } rounded-xl text-[#0F172A] placeholder-slate-400 transition-all outline-none font-bold text-xs focus:bg-white`} 
                  placeholder="name@company.com"
                  required 
                />
              </div>
              {emailTouched && emailError && (
                <p className="text-[10px] font-bold text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={10} /> {emailError}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                <a href="#" className="text-xs font-black text-[#16A34A] hover:underline cursor-pointer">Forgot password?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={handlePasswordBlur}
                  className={`block w-full pl-10 pr-10 py-3 bg-slate-50 border ${
                    passwordTouched && passwordError ? 'border-red-400 focus:ring-red-105' : 'border-slate-200 focus:ring-green-105'
                  } rounded-xl text-[#0F172A] placeholder-slate-400 transition-all outline-none font-bold text-xs focus:bg-white`} 
                  placeholder="••••••••"
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              {passwordTouched && passwordError && (
                <p className="text-[10px] font-bold text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={10} /> {passwordError}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <input 
                id="remember-me" 
                name="remember-me" 
                type="checkbox" 
                className="h-4 w-4 rounded border-slate-300 text-[#22C55E] focus:ring-[#22C55E] cursor-pointer" 
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-500 font-semibold cursor-pointer select-none">
                Remember my session details
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white py-3.5 px-4 rounded-xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer shadow-sm text-xs uppercase tracking-wider mt-2"
            >
              {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Log In to Account'}
            </button>
          </form>

          {role === 'CUSTOMER' && (
            <>
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">or continue with</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <div className="flex justify-center">
                <div className="w-full transition-transform hover:scale-[1.01]">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                      toast.error('Google Login Failed');
                    }}
                  />
                </div>
              </div>

              <p className="text-center text-xs text-slate-500 font-semibold pt-4">
                Don't have an account?{' '}
                <Link to="/register/customer" className="text-[#16A34A] font-extrabold hover:underline transition-colors">
                  Create an Account
                </Link>
              </p>
            </>
          )}

        </div>
      </div>

    </div>
  );
}
