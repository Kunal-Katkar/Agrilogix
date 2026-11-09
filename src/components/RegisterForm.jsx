import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  Truck, 
  Warehouse, 
  Building2, 
  MapPin, 
  Sprout, 
  ShoppingBag,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth, ROLE_META } from '../context/AuthContext';
import { sendOtp, verifyOtp } from '../lib/otp';
import { VEHICLE_TYPES } from '../lib/format';
import KycUpload from './KycUpload';

const roleOptions = [
  { id: 'Farmer', label: 'Farmer', icon: Sprout, desc: 'Produce seller' },
  { id: 'Customer', label: 'Customer', icon: ShoppingBag, desc: 'Retail or bulk buyer' },
  { id: 'Transporter', label: 'Transporter', icon: Truck, desc: 'Freight carrier' },
  { id: 'StorageOwner', label: 'Storage Owner', icon: Warehouse, desc: 'Cold storage / warehouse' },
];

export default function RegisterForm() {
  const [selectedRole, setSelectedRole] = useState('Farmer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Farmer fields
    landDocs: '',
    cropCerts: '',
    // Customer fields
    gstNumber: '',
    deliveryAddress: '',
    // Transporter fields
    vehicleType: 'Refrigerated Truck',
    vehicleReg: '',
    location: '',
    tonnage: '',
    licenseNumber: '',
    // Storage owner fields
    warehouseLocation: '',
    storageCapacity: '',
  });

  const [error, setError] = useState('');
  // OTP step: after the form is valid we email a code and hold the payload until it is verified.
  const [pendingPayload, setPendingPayload] = useState(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { showToast } = useToast();
  const { register, emailExists } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const requestOtp = async (email, name) => {
    setBusy(true);
    const res = await sendOtp(email, name);
    setBusy(false);
    if (!res.ok) { setError(res.error); return false; }
    setError('');
    setCooldown(30);
    showToast(res.delivered === false ? 'Dev mode: the code was printed in the server console.' : `Verification code sent to ${email}.`, 'success');
    return true;
  };

  const finishRegistration = (payload) => {
    const res = register(payload);
    if (!res.ok) return setError(res.error);
    setError('');
    showToast(`Account created. Welcome to AgriLogiX, ${formData.name.trim()}!`, 'success');
    navigate(ROLE_META[selectedRole].path, { replace: true });
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) return setError('Enter the 6-digit code from the email.');
    setBusy(true);
    const res = await verifyOtp(pendingPayload.user.email, otp.trim());
    setBusy(false);
    if (!res.ok) return setError(res.error);
    finishRegistration(pendingPayload);
  };

  const handleResend = async () => {
    await requestOtp(pendingPayload.user.email, pendingPayload.user.name);
  };

  const handleChangeEmail = () => {
    setPendingPayload(null);
    setOtp('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const f = formData;
    if (f.password.length < 6) return setError('Password must be at least 6 characters.');
    if (f.password !== f.confirmPassword) return setError('Passwords do not match.');
    if (!/^[+\d][\d\s-]{7,}$/.test(f.phone.trim())) return setError('Enter a valid mobile number.');
    if (emailExists(f.email)) return setError('An account with this email already exists.');

    // Role-specific details become part of the user record; owners also get a first facility / vehicle.
    const base = { role: selectedRole, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), password: f.password };
    let payload;
    if (selectedRole === 'Farmer') {
      payload = { user: { ...base, location: f.location.trim(), farmName: `${f.name.trim()}'s Farm`, farmSize: '-', mainCrops: [], bio: 'New farmer on AgriLogiX.', kyc: { landProof: f.landDocs || null, organicCert: f.cropCerts || null } } };
    } else if (selectedRole === 'Customer') {
      const summary = [f.gstNumber.trim() && `GSTIN ${f.gstNumber.trim()}`, f.deliveryAddress.trim() && `Delivery address: ${f.deliveryAddress.trim()}`].filter(Boolean).join('. ');
      payload = { user: { ...base, location: f.location.trim(), gstNumber: f.gstNumber.trim(), deliveryAddress: f.deliveryAddress.trim(), kyc: summary ? { summary, submittedAt: new Date().toISOString() } : undefined } };
    } else if (selectedRole === 'Transporter') {
      payload = {
        user: {
          ...base, location: f.location.trim(), company: f.name.trim(), licenseNumber: f.licenseNumber.trim(),
          kyc: f.licenseNumber.trim() ? { summary: `Driving licence / RC ${f.licenseNumber.trim()}. Vehicle ${f.vehicleType}${f.vehicleReg ? `, registration ${f.vehicleReg.trim()}` : ''}${f.tonnage ? `, ${f.tonnage} t payload` : ''}.`, submittedAt: new Date().toISOString() } : undefined,
        },
        vehicle: f.tonnage ? {
          vehicleType: f.vehicleType, regNo: f.vehicleReg.trim() || `REG-${Date.now() % 100000}`, loadCapacity: Number(f.tonnage),
          serviceArea: [f.location.split(',')[0].trim()], pricePerKm: 25, availability: 'Available',
        } : undefined,
      };
    } else {
      const cap = Number(f.storageCapacity) || 0;
      payload = {
        user: {
          ...base, location: f.warehouseLocation.trim(), company: f.name.trim(),
          kyc: f.warehouseLocation.trim() && cap ? { summary: `Facility at ${f.warehouseLocation.trim()}, ${cap} t capacity.`, submittedAt: new Date().toISOString() } : undefined,
        },
        facility: cap ? {
          name: `${f.name.trim()} Storage`, type: 'Warehouse', location: f.warehouseLocation.trim(), totalCapacity: cap,
          availableCapacity: cap, pricePerTonneDay: 15, facilities: ['CCTV'], availability: 'Available',
        } : undefined,
      };
    }
    if (await requestOtp(base.email, base.name)) {
      setOtp('');
      setPendingPayload(payload);
    }
  };

  if (pendingPayload) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-emerald-100 shadow-xl shadow-emerald-950/5">
          <div className="text-center mb-6">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 items-center justify-center mb-3 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-[#1B1B1B] tracking-tight">Verify your email</h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-500">
              We sent a 6-digit code to <strong className="text-zinc-700">{pendingPayload.user.email}</strong>. It expires in 10 minutes.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="••••••"
              aria-label="Verification code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3.5 py-3 text-center text-2xl font-bold tracking-[0.5em] rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
            />

            {error && (
              <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || otp.length !== 6}
              className="w-full py-3.5 px-6 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-emerald-800/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{busy ? 'Verifying…' : 'Verify & Create Account'}</span>
              {!busy && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs">
            <button type="button" onClick={handleChangeEmail} className="font-semibold text-zinc-600 hover:text-zinc-900 underline underline-offset-2 cursor-pointer">
              Change email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={busy || cooldown > 0}
              className="font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Top back link */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50/80 px-3.5 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100/60 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-emerald-100 shadow-xl shadow-emerald-950/5">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 items-center justify-center mb-3 shadow-inner">
            <Sprout className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1B1B1B] tracking-tight">
            Join the AgriLogiX Ecosystem
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-zinc-500">
            Select your stakeholder archetype and complete the onboarding specification.
          </p>
        </div>

        {/* Step 1: Role Selector Radio Cards */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-3">
            Select Your Role
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {roleOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedRole === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedRole(opt.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/90 shadow-md shadow-emerald-700/10 scale-102 ring-2 ring-emerald-500/30'
                      : 'border-zinc-200 bg-zinc-50/40 hover:border-emerald-300 hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-emerald-700 text-white' : 'bg-white text-zinc-600 border border-zinc-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-[#1B1B1B]">{opt.label}</div>
                  <div className="text-[10px] text-zinc-500">{opt.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Common Information */}
          <div className="pt-2 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>General Account Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Full Legal Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Mobile Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Create Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {selectedRole !== 'StorageOwner' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">City and State</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Nashik, Maharashtra"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                />
              </div>
            </div>
          )}

          {/* Section: Role-Specific Dynamic Fields */}
          <div className="pt-4 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 flex items-center justify-between">
              <span>{selectedRole} Specific Details</span>
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm">KYC Compliance</span>
            </h3>

            {/* Farmer specifics */}
            {selectedRole === 'Farmer' && (
              <div className="space-y-3">
                <KycUpload
                  label="Land Ownership Proof (7/12 Extract / RTC)"
                  hint="Upload scanned PDF or JPG (Max 5MB)"
                  value={formData.landDocs || null}
                  onChange={(v) => handleInputChange('landDocs', v)}
                  onError={setError}
                />
                <KycUpload
                  label="Crop & Organic Certifications (Optional)"
                  hint="Upload APEDA / Jaivik Bharat Certificate"
                  value={formData.cropCerts || null}
                  onChange={(v) => handleInputChange('cropCerts', v)}
                  onError={setError}
                />
                <p className="text-[11px] text-zinc-500">
                  Can't upload documents now? You can still register and complete KYC later from <strong>My Profile</strong>.
                </p>
              </div>
            )}

            {/* Customer specifics */}
            {selectedRole === 'Customer' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Business GST Identification Number (Optional)
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      value={formData.gstNumber}
                      onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Primary Warehouse / Delivery Dock Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                    <textarea
                      rows={2}
                      placeholder="Plot No, Industrial Area, City, PIN"
                      value={formData.deliveryAddress}
                      onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Transporter specifics */}
            {selectedRole === 'Transporter' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Vehicle Classification</label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                  >
                    {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Payload Tonnage (Metric Tons)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 8.5"
                    value={formData.tonnage}
                    onChange={(e) => handleInputChange('tonnage', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Vehicle Registration Number</label>
                  <input
                    type="text"
                    placeholder="e.g. MH15 AB 1234"
                    value={formData.vehicleReg}
                    onChange={(e) => handleInputChange('vehicleReg', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Commercial Driver License / RC</label>
                  <input
                    type="text"
                    placeholder="DL-04-2026-00912"
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                  />
                </div>
              </div>
            )}

            {/* Supplier specifics */}
            {selectedRole === 'StorageOwner' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Cold-Storage / Warehouse Location</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Facility address, Mandi Bypass, City"
                      value={formData.warehouseLocation}
                      onChange={(e) => handleInputChange('warehouseLocation', e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Total Usable Storage Capacity (Metric Tons)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={formData.storageCapacity}
                    onChange={(e) => handleInputChange('storageCapacity', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 bg-zinc-50/50"
                  />
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-zinc-400">
            Prototype note: only the names of uploaded documents are kept and nothing is verified; accounts are kept in this browser only.
          </p>

          {error && (
            <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full mt-4 py-3.5 px-6 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed active:scale-98 rounded-xl shadow-md shadow-emerald-800/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{busy ? 'Sending code…' : `Continue as ${selectedRole}`}</span>
            {!busy && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-8 pt-6 border-t border-zinc-100 text-center text-xs text-zinc-600">
          <span>Already have an account? </span>
          <Link
            to="/login"
            className="font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-2"
          >
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
