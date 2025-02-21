import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    navigate(-1);
  };

  const goHome = () => {
    navigate('/');
  };

  // Don't show navigation on home page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goHome}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
              aria-label="Go to home"
            >
              <Home className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="text-xl font-bold text-blue-600">वाणी AI</div>
        </div>
      </div>
    </nav>
  );
}