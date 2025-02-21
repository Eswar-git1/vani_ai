import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowRight } from 'lucide-react';
import { STUDENT_LANGUAGES } from '../lib/constants';

export default function StudentJoin() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  // Set default preferred language to Hindi for testing.
  const [language, setLanguage] = useState('hi');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      // Update student's preferred language in the DB.
      // (Assuming the student is authenticated; use their id.)
      const { error: updateError } = await supabase
        .from('users')
        .update({ preferred_language: language })
        .eq('id', data.id); // Ideally, use the logged-in user's id

      if (updateError) {
        console.error('Error updating preferred language:', updateError);
      }

      navigate(`/student/classroom/${data.id}`);
    } catch (err) {
      setError('Failed to join class');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Join a Class</h2>
          <p className="mt-2 text-gray-600">
            Enter the class code and select your preferred language
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
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

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700">
              Preferred Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              {STUDENT_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
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
