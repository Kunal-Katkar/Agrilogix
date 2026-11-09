import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './AppRoutes';

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </DataProvider>
    </ToastProvider>
  );
}
