import React, { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Sprout, LogOut, Menu, X, LayoutDashboard, Package, ClipboardList, Warehouse, Truck, User, Store, Users,
  ShoppingBag, MapPinned, Route, Inbox, Boxes, RotateCcw, BarChart3, ShieldCheck, ScrollText, Wallet,
} from 'lucide-react';
import { useAuth, ROLE_META } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Avatar, cx } from '../components/common';
import KycBanner from '../components/KycBanner';
import { kycStatus } from '../lib/kyc';
import { duesOf } from '../lib/payments';

const NAV = {
  Farmer: [
    { to: '/farmer', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/farmer/listings', label: 'My Listings', icon: Package },
    { to: '/farmer/orders', label: 'Orders & Enquiries', icon: ClipboardList, badge: 'farmerOrders' },
    { to: '/farmer/storage', label: 'Storage Portal', icon: Warehouse, badge: 'farmerStorage' },
    { to: '/farmer/transport', label: 'Transport Portal', icon: Truck, badge: 'farmerTransport' },
    { to: '/farmer/payments', label: 'Payments', icon: Wallet, badge: 'paymentsDue' },
    { to: '/farmer/profile', label: 'My Profile', icon: User },
  ],
  Customer: [
    { to: '/customer', label: 'Marketplace', icon: Store, end: true },
    { to: '/customer/farmers', label: 'Farmers', icon: Users },
    { to: '/customer/orders', label: 'My Orders', icon: ShoppingBag },
    { to: '/customer/payments', label: 'Payments', icon: Wallet, badge: 'paymentsDue' },
  ],
  Transporter: [
    { to: '/transport', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/transport/vehicles', label: 'My Vehicles', icon: Truck },
    { to: '/transport/requests', label: 'Open Requests', icon: Inbox, badge: 'transporterRequests' },
    { to: '/transport/shipments', label: 'Shipments', icon: Route },
    { to: '/transport/payments', label: 'Payments', icon: Wallet },
  ],
  Admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/kyc', label: 'KYC Reviews', icon: ShieldCheck, badge: 'adminKyc' },
    { to: '/admin/payments', label: 'Payments', icon: Wallet, badge: 'adminPayments' },
    { to: '/admin/activity', label: 'Activity Log', icon: ScrollText },
  ],
  StorageOwner: [
    { to: '/storage', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/storage/facilities', label: 'My Facilities', icon: Boxes },
    { to: '/storage/requests', label: 'Open Requests', icon: Inbox, badge: 'storageRequests' },
    { to: '/storage/payments', label: 'Payments', icon: Wallet },
  ],
};

// Counts shown next to sidebar items: things that are waiting for the current user's attention.
const BADGES = {
  adminKyc: (db) => db.users.filter((x) => x.role !== 'Admin' && kycStatus(x) === 'Under review').length,
  paymentsDue: (db, u) => duesOf(db, u.id).length,
  adminPayments: (db) => db.disputes.filter((d) => d.status === 'Open').length + db.payouts.filter((x) => x.status === 'Processing').length,
  farmerOrders: (db, u) => db.orders.filter((o) => o.farmerId === u.id && o.status === 'Placed').length,
  farmerTransport: (db, u) => {
    const open = new Set(db.transportRequests.filter((r) => r.farmerId === u.id && r.status === 'Open').map((r) => r.id));
    return db.transportBids.filter((b) => open.has(b.requestId) && b.status === 'Pending').length;
  },
  farmerStorage: (db, u) => {
    const open = new Set(db.storageRequests.filter((r) => r.farmerId === u.id && r.status === 'Open').map((r) => r.id));
    return db.storageBids.filter((b) => open.has(b.requestId) && b.status === 'Pending').length;
  },
  transporterRequests: (db, u) => db.transportRequests.filter((r) => r.status === 'Open'
    && !db.transportBids.some((b) => b.requestId === r.id && b.transporterId === u.id && ['Pending', 'Selected'].includes(b.status))).length,
  storageRequests: (db, u) => db.storageRequests.filter((r) => r.status === 'Open'
    && !db.storageBids.some((b) => b.requestId === r.id && b.ownerId === u.id && ['Pending', 'Selected'].includes(b.status))).length,
};

// Route guard + shared shell (navbar, role sidebar, footer) for every authenticated page (SRS AU-5..AU-7, SH-1).
export default function AppLayout({ role }) {
  const { user, logout } = useAuth();
  const { db, resetData } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const denied = Boolean(location.state?.denied);

  useEffect(() => {
    if (denied) showToast('Access restricted: that page belongs to a different role.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denied]);

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) {
    return <Navigate to={ROLE_META[user.role].path} replace state={{ denied: true }} />;
  }

  const handleLogout = () => {
    logout();
    showToast('You have been logged out.', 'success');
    navigate('/login', { replace: true });
  };

  const handleReset = () => {
    if (window.confirm('Reset all demo data to the original seed data? You will be logged out.')) {
      resetData();
      logout();
      showToast('Demo data restored.', 'success');
      navigate('/login', { replace: true });
    }
  };

  const items = NAV[role];
  const sidebar = (
    <nav className="p-3 space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) => cx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors',
            isActive ? 'bg-emerald-700 text-white shadow-sm' : 'text-zinc-600 hover:bg-emerald-50 hover:text-emerald-800',
          )}
        >
          <item.icon className="w-4.5 h-4.5 shrink-0" />
          <span className="flex-1">{item.label}</span>
          {item.badge && BADGES[item.badge](db, user) > 0 && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center" aria-label="waiting">{BADGES[item.badge](db, user)}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FBF7]">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-emerald-100">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-zinc-100 cursor-pointer" onClick={() => setOpen(!open)} aria-label="Toggle menu">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to={ROLE_META[role].path} className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 text-white flex items-center justify-center"><Sprout className="w-5 h-5" /></span>
              <span className="text-xl font-black tracking-tight">Agri<span className="text-emerald-700">LogiX</span></span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <Avatar name={user.name} />
              <div className="leading-tight">
                <div className="text-sm font-bold text-zinc-900">{user.name}</div>
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">{ROLE_META[role].label}</div>
              </div>
            </div>
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-700 border border-zinc-200 rounded-xl px-3 py-2 hover:bg-zinc-50 cursor-pointer">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className={cx('bg-white border-r border-emerald-100 w-60 shrink-0 flex-col justify-between', open ? 'flex fixed top-16 bottom-0 z-30 shadow-xl lg:static lg:shadow-none' : 'hidden lg:flex')}>
          {sidebar}
          <div className="p-3 border-t border-zinc-100">
            <div className="text-[11px] text-zinc-400 px-3 pb-2">Prototype build. All data is simulated.</div>
            <button type="button" onClick={handleReset} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:bg-zinc-50 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />Reset demo data
            </button>
          </div>
        </aside>
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {role !== 'Admin' && <KycBanner user={user} />}
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-emerald-100 bg-white py-5 px-4 sm:px-6 text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 AgriLogiX · B.Tech Major Project, NITK Surathkal</span>
        <span className="flex items-center gap-1.5"><MapPinned className="w-3.5 h-3.5 text-emerald-600" />Prototype: payment gateway, tracking and login are simulated.</span>
      </footer>
    </div>
  );
}
