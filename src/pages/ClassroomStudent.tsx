// src/pages/ClassroomStudent.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Users, Volume2, VolumeX, Globe2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { STUDENT_LANGUAGES } from '../lib/constants';
import { useStudentTranslationStore } from '../store/studentTranslationStore';

interface Teacher {
  id: string;
  full_name: string | null;
  preferred_language: string;
  role: string;
  // you can add more fields if needed
}

interface Classroom {
  id: string;
  name: string;
  code: string;
  teacher_id: string;
  teacher: Teacher | null;
  is_active: boolean;
  instructor?: string;       // if stored in DB
  subject?: string;          // if stored in DB
  description?: string;      // if stored in DB
}

export default function ClassroomStudent() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Student translation store
  const {
    displayText,
    teacherTranscription,
    audioUrl,
    audioEnabled,
    setAudioEnabled,
    handleTeacherTranscription,
  } = useStudentTranslationStore();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student count excludes teacher
  const [studentCount, setStudentCount] = useState<number>(0);

  // If teacher is present
  const [teacherPresent, setTeacherPresent] = useState(false);

  // Student’s preferred language
  const [preferredLanguage, setPreferredLanguage] = useState<string>('hi');

  // Audio ref for TTS playback
  const audioRef = useRef<HTMLAudioElement>(null);

  // Attempt to play TTS audio
  useEffect(() => {
    if (audioUrl && audioEnabled && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch((err) => {
        console.warn('Autoplay blocked or audio error:', err);
      });
    }
  }, [audioUrl, audioEnabled]);

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  // Change language => update local state + DB
  const handleLanguageChange = async (newLang: string) => {
    setPreferredLanguage(newLang);
    if (!user) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ preferred_language: newLang })
        .eq('id', user.id);
      if (error) {
        console.error('Error updating preferred language in DB:', error);
      } else {
        console.log('Student language updated to:', newLang);
      }
    } catch (err) {
      console.error('Unexpected error updating language:', err);
    }
  };

  useEffect(() => {
    const fetchClassroom = async () => {
      if (!classroomId || !user) {
        setError('Invalid classroom or user');
        setLoading(false);
        return;
      }
      try {
        // 1) Fetch classroom
        const { data: classroomData, error: classroomError } = await supabase
          .from('classrooms')
          .select(`
            id,
            name,
            code,
            teacher_id,
            is_active,
            instructor,
            subject,
            description,
            teacher:users (
              id,
              full_name,
              preferred_language,
              role
            )
          `)
          .eq('id', classroomId)
          .single();

        if (classroomError) {
          console.error('Classroom fetch error:', classroomError);
          throw new Error('Classroom not found');
        }
        if (!classroomData) {
          setError('Classroom not found');
          setLoading(false);
          return;
        }
        if (!classroomData.is_active) {
          setError('This classroom is no longer active');
          setLoading(false);
          return;
        }

        // If teacher is an array, pick first
        if (classroomData.teacher && Array.isArray(classroomData.teacher)) {
          classroomData.teacher = classroomData.teacher.length > 0 ? classroomData.teacher[0] : null;
        }
        setClassroom(classroomData as Classroom);

        // 2) Fetch student's preferred language
        const { data: userData } = await supabase
          .from('users')
          .select('preferred_language, full_name')
          .eq('id', user.id)
          .single();

        if (userData?.preferred_language) {
          setPreferredLanguage(userData.preferred_language);
        } else {
          setPreferredLanguage('hi');
        }

        // We also might want the student’s full_name from DB:
        const studentFullName = userData?.full_name || 'Student';

        // 3) Realtime presence
        const channel = supabase.channel(`classroom:${classroomId}`);

        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();

          let teacherFound = false;
          let countStudents = 0;

          // presenceState is an object with keys = user_ids, each an array of presences
          Object.values(state).forEach((arr: any) => {
            arr.forEach((presence: any) => {
              if (presence.role === 'teacher') {
                teacherFound = true;
              } else if (presence.role === 'student') {
                countStudents++;
              }
            });
          });

          setTeacherPresent(teacherFound);
          setStudentCount(countStudents);
        });

        channel.on('broadcast', { event: 'transcription' }, async ({ payload }) => {
          const teacherText: string = payload.transcription || '';
          if (teacherText.trim()) {
            try {
              await handleTeacherTranscription(teacherText, preferredLanguage);
            } catch (err) {
              console.error('Error in broadcast handler:', err);
            }
          }
        });

        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // 4) Student calls channel.track => role: 'student'
            await channel.track({
              user_id: user.id,
              name: studentFullName,
              language: userData?.preferred_language || 'en',
              role: 'student',
            });
          }
        });

        setLoading(false);
      } catch (err) {
        console.error('Error loading classroom:', err);
        setError('Failed to load classroom. Please try again.');
        setLoading(false);
      }
    };

    fetchClassroom();
  }, [classroomId, user, preferredLanguage, handleTeacherTranscription]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-md text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Classroom not found'}</p>
          <button
            onClick={() => navigate('/student/join')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Return to Join Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{classroom.name}</h1>
              {/* Show instructor from DB or teacher’s full_name */}
              <p className="text-sm text-gray-500">
                Instructor: {classroom.instructor || classroom.teacher?.full_name || 'N/A'}
              </p>
              {classroom.subject && (
                <p className="text-sm text-gray-500">Subject: {classroom.subject}</p>
              )}
              {classroom.description && (
                <p className="text-sm text-gray-500">Description: {classroom.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleAudio}
                className="p-2 text-gray-600 hover:text-gray-900 transition"
                title={audioEnabled ? 'Mute Audio' : 'Unmute Audio'}
              >
                {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
              <div className="flex items-center text-gray-600">
                <Users className="w-6 h-6 mr-2" />
                <span>{studentCount} Students</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {/* Language Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Language
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {STUDENT_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Display Teacher/Translation */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="text-center text-gray-500 text-sm mb-4">
                {teacherPresent
                  ? 'Teacher joined.'
                  : 'Waiting for teacher...'}
              </div>

              <div className="text-center text-gray-500 text-sm mb-4">
                <Globe2 className="w-5 h-5 inline-block mr-2" />
                {teacherTranscription
                  ? `Translating to ${
                      STUDENT_LANGUAGES.find((l) => l.code === preferredLanguage)?.name
                    }`
                  : 'Waiting for teacher to start speaking...'}
              </div>
              <div className="min-h-[200px] text-xl font-medium text-gray-900 text-center flex items-center justify-center">
                {displayText || teacherTranscription || 'No speech yet...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
