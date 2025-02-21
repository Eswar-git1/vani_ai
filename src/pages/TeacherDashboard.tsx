// src/pages/TeacherDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, History, Settings, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface ClassroomFormData {
  name: string;
  subject: string;
  duration_minutes: number;
  description: string;
  instructor: string;
}

function CreateClassModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: ClassroomFormData) => Promise<void>;
}) {
  const [formData, setFormData] = useState<ClassroomFormData>({
    name: '',
    subject: '',
    duration_minutes: 60,
    description: '',
    instructor: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg relative">
        <h2 className="text-xl font-bold mb-4">Create a New Classroom</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Class Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
            <input
              type="number"
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Instructor Name</label>
            <input
              type="text"
              name="instructor"
              value={formData.instructor}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [teacherName, setTeacherName] = useState('Teacher'); // For welcome message
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth?role=teacher');
      return;
    }

    const checkTeacherRole = async () => {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, full_name')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user role:', userError);
          setError('Failed to verify teacher access.');
          setLoading(false);
          return;
        }

        if (!userData || userData.role !== 'teacher') {
          setError('Access denied. Only teachers can view this dashboard.');
          setLoading(false);
          return;
        }

        setIsTeacher(true);
        setTeacherName(userData.full_name || 'Teacher');
        fetchClassrooms();
      } catch (err) {
        console.error('Error:', err);
        setError('An unexpected error occurred.');
        setLoading(false);
      }
    };

    checkTeacherRole();
  }, [user, navigate]);

  const fetchClassrooms = async () => {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching classrooms:', error);
        setError('Failed to load classrooms. Please try again.');
      } else {
        setClassrooms(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setShowModal(true);
  };

  const closeCreateModal = () => {
    setShowModal(false);
  };

  const handleCreateClass = async (formData: ClassroomFormData) => {
    if (!user || !isTeacher) return;
    setShowModal(false);

    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data, error } = await supabase
        .from('classrooms')
        .insert([
          {
            name: formData.name,
            code,
            teacher_id: user.id,
            subject: formData.subject,
            duration_minutes: formData.duration_minutes,
            description: formData.description,
            instructor: formData.instructor,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating classroom:', error);
        setError('Failed to create new classroom. Please try again.');
        return;
      }

      if (data) {
        setClassrooms([data, ...classrooms]);
        setError(null);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred while creating the classroom.');
    }
  };

  // Delete a classroom
  const deleteClassroom = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this classroom?')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Error deleting classroom:', error);
        alert('Failed to delete classroom. Check console for details.');
      } else {
        setClassrooms((prev) => prev.filter((cls) => cls.id !== id));
      }
    } catch (err) {
      console.error('Unexpected error deleting classroom:', err);
    }
  };

  if (!isTeacher && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            This dashboard is only accessible to teachers. Please contact support if you believe this is an error.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CreateClassModal isOpen={showModal} onClose={closeCreateModal} onSubmit={handleCreateClass} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {teacherName}!</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create New Class
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading your classrooms...</p>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No classes yet. Create your first class to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((classroom) => (
              <div
                key={classroom.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
              >
                <h3 className="text-xl font-semibold mb-2">{classroom.name}</h3>
                <p className="text-gray-500 text-sm mb-1">Subject: {classroom.subject || 'N/A'}</p>
                <p className="text-gray-500 text-sm mb-1">
                  Duration: {classroom.duration_minutes || 60} minutes
                </p>
                <p className="text-gray-500 text-sm mb-1">
                  Instructor: {classroom.instructor || 'N/A'}
                </p>
                {classroom.description && (
                  <p className="text-gray-600 text-sm mb-2">
                    {classroom.description}
                  </p>
                )}
                <p className="text-gray-500 mb-4">Code: {classroom.code}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/teacher/classroom/${classroom.id}`)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Start Class
                  </button>
                  <button
                    onClick={() => navigate('/teacher/history')}
                    className="p-2 text-gray-600 hover:text-gray-900 transition"
                  >
                    <History className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => navigate('/teacher/profile')}
                    className="p-2 text-gray-600 hover:text-gray-900 transition"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteClassroom(classroom.id)}
                    className="p-2 text-gray-600 hover:text-gray-900 transition"
                    title="Delete Classroom"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
