// src/pages/ClassroomTeacher.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslationStore } from '../store/translationStore';
import { useAuthStore } from '../store/authStore';
import { Mic, MicOff, Users, Settings, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ClassroomTeacher() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    isRecording,
    transcription,
    error,
    startRecording,
    stopRecording,
    setSessionId,
  } = useTranslationStore();

  const [activeStudents, setActiveStudents] = useState<Array<{ id: string; name: string; language: string }>>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [sessionId, localSetSessionId] = useState<string | null>(null);

  // Presence subscription
  useEffect(() => {
    if (!classroomId) return;
    const channel = supabase.channel(`classroom:${classroomId}`);

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const students: Array<{ id: string; name: string; language: string }> = [];
      Object.values(state).forEach((arr: any) => {
        arr.forEach((presence: any) => {
          if (presence.role === 'student') {
            students.push({
              id: presence.user_id,
              name: presence.name,
              language: presence.language,
            });
          }
        });
      });
      setActiveStudents(students);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && user) {
        let teacherName = 'Teacher';
        try {
          const { data: teacherData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', user.id)
            .single();
          if (teacherData?.full_name) {
            teacherName = teacherData.full_name;
          }
        } catch (err) {
          console.error('Failed to fetch teacher full_name', err);
        }
        await channel.track({
          user_id: user.id,
          name: teacherName,
          language: user.user_metadata?.preferred_language || 'en',
          role: 'teacher',
        });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [classroomId, user]);

  // Create a new session
  const createClassSession = async (): Promise<{ id: string } | null> => {
    try {
      const { data, error } = await supabase
        .from('class_sessions')
        .insert({
          classroom_id: classroomId,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Session creation failed', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Error creating session:', err);
      return null;
    }
  };

  // Finalize session
  const finalizeClassSession = async (id: string) => {
    try {
      // fetch started_at
      const { data: sessionRow, error: fetchError } = await supabase
        .from('class_sessions')
        .select('started_at')
        .eq('id', id)
        .single();
      if (fetchError || !sessionRow) {
        console.error('Error fetching session row:', fetchError);
        return;
      }

      const startTime = new Date(sessionRow.started_at).getTime();
      const endTime = Date.now();
      const actualDuration = Math.floor((endTime - startTime) / 60000);

      const { error: updateError } = await supabase
        .from('class_sessions')
        .update({
          ended_at: new Date(endTime).toISOString(),
          student_count: activeStudents.length,
          duration_minutes: actualDuration,
        })
        .eq('id', id);

      if (updateError) {
        console.error('Session update failed:', updateError);
      } else {
        console.log(`Session ${id} finalized with duration_minutes = ${actualDuration}`);
      }
    } catch (err) {
      console.error('Error finalizing session:', err);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
      if (sessionId) {
        await finalizeClassSession(sessionId);
        localSetSessionId(null);
        setSessionId(null);
      }
    } else {
      await startRecording();
      const newSession = await createClassSession();
      if (newSession && newSession.id) {
        localSetSessionId(newSession.id);
        setSessionId(newSession.id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showParticipants && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg relative">
            <h2 className="text-xl font-bold mb-4">Participants</h2>
            {activeStudents.length === 0 ? (
              <p className="text-gray-600">No students joined yet.</p>
            ) : (
              <ul className="space-y-2">
                {activeStudents.map((student) => (
                  <li key={student.id} className="text-gray-700">
                    {student.name} ({student.language})
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setShowParticipants(false)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Live Classroom</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/teacher/profile')}
                className="p-2 text-gray-600 hover:text-gray-900 transition"
              >
                <Settings className="w-6 h-6" />
              </button>
              <button
                onClick={() => setShowParticipants(true)}
                className="p-2 text-gray-600 hover:text-gray-900 transition"
                title="View Participants"
              >
                <Eye className="w-6 h-6" />
              </button>
              <div className="flex items-center text-gray-600">
                <Users className="w-6 h-6 mr-2" />
                <span>{activeStudents.length} Students</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                {error}
              </div>
            )}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Teacher Speech</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap min-h-[50px]">
                  {transcription || 'Waiting for you to start speaking...'}
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                onClick={toggleRecording}
                className={`
                  flex items-center justify-center gap-2 px-6 py-3 rounded-full
                  transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                `}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    Start Recording
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
