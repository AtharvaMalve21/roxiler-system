import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Dashboard Pages
import AdminDashboard from './pages/dashboard/AdminDashboard';
import UserDashboard from './pages/dashboard/UserDashboard';
import StoreOwnerDashboard from './pages/dashboard/StoreOwnerDashboard';

// User Pages
import Profile from './pages/user/Profile';
import UpdatePassword from './pages/user/UpdatePassword';

// Store Pages
import StoreList from './pages/store/StoreList';
import StoreDetail from './pages/store/StoreDetail';

// Admin Pages
import AdminUsers from './pages/admin/AdminUsers';
import AdminStores from './pages/admin/AdminStores';
import CreateUser from './pages/admin/CreateUser';
import CreateStore from './pages/admin/CreateStore';
import EditUser from './pages/admin/EditUser';
import EditStore from './pages/admin/EditStore';

// Store Owner Pages
import MyStores from './pages/store-owner/MyStores';
import StoreRatings from './pages/store-owner/StoreRatings';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              <Route path="/update-password" element={
                <ProtectedRoute>
                  <UpdatePassword />
                </ProtectedRoute>
              } />
              
              <Route path="/stores" element={
                <ProtectedRoute>
                  <StoreList />
                </ProtectedRoute>
              } />
              
              <Route path="/stores/:id" element={
                <ProtectedRoute>
                  <StoreDetail />
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin/users" element={
                <ProtectedRoute roles={['admin']}>
                  <AdminUsers />
                </ProtectedRoute>
              } />
              
              <Route path="/admin/stores" element={
                <ProtectedRoute roles={['admin']}>
                  <AdminStores />
                </ProtectedRoute>
              } />
              
              <Route path="/admin/users/create" element={
                <ProtectedRoute roles={['admin']}>
                  <CreateUser />
                </ProtectedRoute>
              } />
              
              <Route path="/admin/stores/create" element={
                <ProtectedRoute roles={['admin']}>
                  <CreateStore />
                </ProtectedRoute>
              } />
              
              <Route path="/admin/users/:id/edit" element={
                <ProtectedRoute roles={['admin']}>
                  <EditUser />
                </ProtectedRoute>
              } />
              
              <Route path="/admin/stores/:id/edit" element={
                <ProtectedRoute roles={['admin']}>
                  <EditStore />
                </ProtectedRoute>
              } />
              
              {/* Store Owner Routes */}
              <Route path="/my-stores" element={
                <ProtectedRoute roles={['store_owner']}>
                  <MyStores />
                </ProtectedRoute>
              } />
              
              <Route path="/my-stores/:id/ratings" element={
                <ProtectedRoute roles={['store_owner']}>
                  <StoreRatings />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
          
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

// Dashboard Router Component
function DashboardRouter() {
  const { user } = React.useContext(AuthContext);
  
  if (!user) return <Navigate to="/login" replace />;
  
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'store_owner':
      return <StoreOwnerDashboard />;
    case 'user':
      return <UserDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}

// Import AuthContext for DashboardRouter
const AuthContext = React.createContext();

export default App;