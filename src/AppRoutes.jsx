import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TrackingPage from './pages/TrackingPage';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import FarmerListings from './pages/farmer/FarmerListings';
import FarmerOrders from './pages/farmer/FarmerOrders';
import FarmerStorage from './pages/farmer/FarmerStorage';
import FarmerTransport from './pages/farmer/FarmerTransport';
import FarmerProfile from './pages/farmer/FarmerProfile';
import Marketplace from './pages/customer/Marketplace';
import Farmers from './pages/customer/Farmers';
import FarmerPublicProfile from './pages/customer/FarmerPublicProfile';
import ListingDetail from './pages/customer/ListingDetail';
import CustomerOrders from './pages/customer/CustomerOrders';
import TransportDashboard from './pages/transport/TransportDashboard';
import TransportVehicles from './pages/transport/TransportVehicles';
import TransportRequests from './pages/transport/TransportRequests';
import TransportShipments from './pages/transport/TransportShipments';
import StorageDashboard from './pages/storage/StorageDashboard';
import StorageFacilities from './pages/storage/StorageFacilities';
import StorageRequests from './pages/storage/StorageRequests';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminUsers from './pages/admin/AdminUsers';
import AdminKyc from './pages/admin/AdminKyc';
import AdminActivity from './pages/admin/AdminActivity';
import AdminPayments from './pages/admin/AdminPayments';
import PaymentsPage from './pages/payments/PaymentsPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Each role has its own guarded area inside the shared layout (SRS AU-5, AU-6, AU-7) */}
      <Route path="/farmer" element={<AppLayout role="Farmer" />}>
        <Route index element={<FarmerDashboard />} />
        <Route path="listings" element={<FarmerListings />} />
        <Route path="orders" element={<FarmerOrders />} />
        <Route path="storage" element={<FarmerStorage />} />
        <Route path="transport" element={<FarmerTransport />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="profile" element={<FarmerProfile />} />
        <Route path="preview/:farmerId" element={<FarmerPublicProfile />} />
        <Route path="track/:trackingId" element={<TrackingPage />} />
      </Route>

      <Route path="/customer" element={<AppLayout role="Customer" />}>
        <Route index element={<Marketplace />} />
        <Route path="farmers" element={<Farmers />} />
        <Route path="farmers/:farmerId" element={<FarmerPublicProfile />} />
        <Route path="listings/:listingId" element={<ListingDetail />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="track/:trackingId" element={<TrackingPage />} />
      </Route>

      <Route path="/transport" element={<AppLayout role="Transporter" />}>
        <Route index element={<TransportDashboard />} />
        <Route path="vehicles" element={<TransportVehicles />} />
        <Route path="requests" element={<TransportRequests />} />
        <Route path="shipments" element={<TransportShipments />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="track/:trackingId" element={<TrackingPage />} />
      </Route>

      <Route path="/storage" element={<AppLayout role="StorageOwner" />}>
        <Route index element={<StorageDashboard />} />
        <Route path="facilities" element={<StorageFacilities />} />
        <Route path="requests" element={<StorageRequests />} />
        <Route path="payments" element={<PaymentsPage />} />
      </Route>

      <Route path="/admin" element={<AppLayout role="Admin" />}>
        <Route index element={<AdminDashboard />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="kyc" element={<AdminKyc />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="activity" element={<AdminActivity />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
