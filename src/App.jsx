import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import DestinationsPage from './pages/DestinationsPage';
import StayDetailsPage from './pages/StayDetailsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import FavoritesPage from './pages/FavoritesPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { AdminProvider } from './contexts/AdminContext';
import AccessibilityFeatures from './components/AccessibilityFeatures';
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <FavoritesProvider>
      <AdminProvider>
        <Router>
          <div className="min-h-screen bg-white">
            <Routes>
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route 
                path="/admin/dashboard" 
                element={
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                } 
              />
              
              {/* Public Routes */}
              <Route path="/*" element={
                <>
                  <Header />
                  <AnimatePresence mode="wait">
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/destinations" element={<DestinationsPage />} />
                      <Route path="/stay/:id" element={<StayDetailsPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/favorites" element={<FavoritesPage />} />
                    </Routes>
                  </AnimatePresence>
                  <Footer />
                  <AccessibilityFeatures />
                </>
              } />
            </Routes>
          </div>
        </Router>
      </AdminProvider>
    </FavoritesProvider>
  );
}

export default App;