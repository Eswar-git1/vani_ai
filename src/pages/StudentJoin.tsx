// src/pages/StudentJoin.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function StudentJoin() {
  const navigate = useNavigate();
  const { user } = useAuthStore(); // The logged-in user from your auth store
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // We'll store the student's name here to show a welcome message
  const [fullName, setFullName] = useState('Student');

  // If there's no user, redirect to the student auth page
  // Otherwise, fetch the user's full_name from DB
  useEffect(() => {
    if (!user) {
      navigate('/auth?role=student');
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (!error && data?.full_name) {
          setFullName(data.full_name);
        }
      } catch (err) {
        console.error('Error fetching student name:', err);
      }
    })();
  }, [user, navigate]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: classroomError } = await supabase
        .from('classrooms')
        .select('id')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (classroomError || !data) {
        setError('Invalid class code or class is not active');
        setLoading(false);
        return;
      }

      // Navigate directly to the classroom
      navigate(`/student/classroom/${data.id}`);
    } catch (err) {
      console.error('Failed to join class:', err);
      setError('Failed to join class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Join a Class</h2>
          {/* Display the student's full name in a welcome message */}
          <p className="mt-2 text-gray-600">
            Welcome, {fullName}!
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700"
            >
              Class Code
            </label>
            <input
              id="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter 6-digit code"
              maxLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Class'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
