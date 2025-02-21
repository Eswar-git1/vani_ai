import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Users, Globe2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-50 flex flex-col">
      <header className="py-12 text-center">
        <h1 className="text-6xl md:text-7xl font-extrabold text-gray-900">
          वाणी AI
        </h1>
        <p className="mt-4 text-2xl md:text-3xl text-gray-700">
          Real-Time Classroom Translation
        </p>
      </header>
      <main className="flex-grow container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Empower your classroom with real-time translation. Break language barriers, connect globally, and foster interactive learning!
          </p>
          <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/auth?role=teacher')}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
            >
              Start Teaching
            </button>
            <button
              onClick={() => navigate('/auth?role=student')}
              className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-lg shadow-md hover:bg-blue-50 transition duration-300"
            >
              Join a Class
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg transform hover:-translate-y-1 transition">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Headphones className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-center">Real-Time Translation</h3>
            <p className="text-gray-600 text-center">
              Instantly translate teacher’s speech into any language for seamless communication.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg transform hover:-translate-y-1 transition">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-center">Interactive Learning</h3>
            <p className="text-gray-600 text-center">
              Engage students in their preferred language and enhance participation.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg transform hover:-translate-y-1 transition">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Globe2 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-center">Global Reach</h3>
            <p className="text-gray-600 text-center">
              Connect classrooms across borders and create a world without language barriers.
            </p>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-gray-500">
        &copy; {new Date().getFullYear()} वाणी AI. All rights reserved.
      </footer>
    </div>
  );
}
