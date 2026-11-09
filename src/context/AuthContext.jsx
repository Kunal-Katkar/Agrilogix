import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useData } from './DataContext';

// Prototype authentication: credentials are checked against the mock users table and the
// session is a user id kept in local storage. This is NOT real security (SRS NFR-5).
const SESSION_KEY = 'agrilogix_session_v1';
const AuthContext = createContext(null);

export const ROLE_META = {
  Farmer: { label: 'Farmer', path: '/farmer' },
  Customer: { label: 'Customer', path: '/customer' },
  Transporter: { label: 'Transporter', path: '/transport' },
  StorageOwner: { label: 'Storage Owner', path: '/storage' },
  Admin: { label: 'Admin', path: '/admin' },
};

const readSession = () => {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
};

export function AuthProvider({ children }) {
  const { db, run } = useData();
  const [userId, setUserId] = useState(readSession);

  const setSession = (id) => {
    setUserId(id);
    try {
      if (id) localStorage.setItem(SESSION_KEY, id);
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  };

  // A session whose user no longer exists (e.g. after a data reset) is treated as logged out.
  // A suspended account is signed out immediately.
  const user = useMemo(() => {
    const found = db.users.find((u) => u.id === userId);
    return found && found.status !== 'Suspended' ? found : null;
  }, [db.users, userId]);

  const login = useCallback((email, password, role) => {
    const found = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found || found.password !== password) return { ok: false, error: 'Incorrect email or password.' };
    if (found.status === 'Suspended') {
      return { ok: false, error: `This account is suspended${found.statusNote ? `: ${found.statusNote}` : ''}. Contact the platform administrator.` };
    }
    if (found.role !== role) {
      return { ok: false, error: `This account is registered as ${ROLE_META[found.role].label}. Select that role to sign in.` };
    }
    setSession(found.id);
    return { ok: true, user: found };
  }, [db.users]);

  const register = useCallback((payload) => {
    const res = run('addUser', payload);
    if (!res.ok) return res;
    setSession(res.id);
    return res;
  }, [run]);

  const emailExists = useCallback(
    (email) => db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()),
    [db.users],
  );

  const logout = useCallback(() => setSession(null), []);

  const value = useMemo(() => ({ user, login, register, emailExists, logout }), [user, login, register, emailExists, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
