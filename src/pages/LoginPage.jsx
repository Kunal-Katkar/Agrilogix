import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, ROLE_META } from '../context/AuthContext';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  const { user } = useAuth();
  if (user) return <Navigate to={ROLE_META[user.role].path} replace />;
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-amber-50/30 to-[#F9FBF7] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <LoginForm />
      <div className="mt-8 text-center text-xs text-zinc-400">
        © 2026 AgriLogiX. All rights reserved. B.Tech Major Project-I (IT449).
      </div>
    </div>
  );
}
