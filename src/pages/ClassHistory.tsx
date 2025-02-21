// src/pages/ClassHistory.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { History, Calendar, Users, Clock, Download, FileText, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ClassHistoryRow {
  transcription: string;
  created_at: string;
}

interface ClassSession {
  id: string;
  classroom_id: string;
  started_at: string;
  ended_at: string | null;
  student_count: number;
  duration_minutes: number | null;  // We'll store actual duration here
  classroom: {
    name: string;
    code: string;
    subject?: string | null;
    instructor?: string | null;
  };
  transcriptions?: ClassHistoryRow[];
}

export default function ClassHistory() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<ClassSession[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth?role=teacher');
      return;
    }

    const fetchHistory = async () => {
      try {
        // class_history references session_id
        // We also select duration_minutes from class_sessions
        const { data, error } = await supabase
          .from('class_sessions')
          .select(`
            id,
            classroom_id,
            started_at,
            ended_at,
            student_count,
            duration_minutes,
            classroom:classrooms (
              name,
              code,
              subject,
              instructor
            ),
            transcriptions:class_history!session_id (
              transcription,
              created_at
            )
          `)
          .order('started_at', { ascending: false });

        if (error) throw error;
        setSessions(data || []);
      } catch (err) {
        console.error('Error fetching class history:', err);
        setError('Failed to load class history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, navigate]);

  const exportToCSV = (session: ClassSession) => {
    const csvData = [
      {
        SessionID: session.id,
        ClassName: session.classroom?.name || 'Unknown',
        Instructor: session.classroom?.instructor || 'N/A',
        Subject: session.classroom?.subject || 'N/A',
        StartTime: new Date(session.started_at).toLocaleString(),
        EndTime: session.ended_at ? new Date(session.ended_at).toLocaleString() : 'N/A',
        StudentCount: session.student_count,
        ActualDuration: session.duration_minutes ?? 0,
      },
    ];
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `session_${session.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (session: ClassSession) => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text('Class Session Report', 14, 20);

    const lines = [
      `Session ID: ${session.id}`,
      `Class Name: ${session.classroom?.name || 'Unknown'}`,
      `Instructor: ${session.classroom?.instructor || 'N/A'}`,
      `Subject: ${session.classroom?.subject || 'N/A'}`,
      `Start Time: ${new Date(session.started_at).toLocaleString()}`,
      `End Time: ${session.ended_at ? new Date(session.ended_at).toLocaleString() : 'N/A'}`,
      `Student Count: ${session.student_count}`,
      `Actual Duration: ${session.duration_minutes ?? 0} minutes`,
    ];

    let yPos = 30;
    lines.forEach((line) => {
      doc.text(line, 14, yPos);
      yPos += 8;
    });

    // Show transcripts in a table if any
    if (session.transcriptions && session.transcriptions.length > 0) {
      yPos += 8;
      doc.text('Transcripts:', 14, yPos);
      yPos += 5;

      const tableBody = session.transcriptions.map((t) => [
        new Date(t.created_at).toLocaleString(),
        t.transcription,
      ]);

      (doc as any).autoTable({
        head: [['Time', 'Transcription']],
        body: tableBody,
        startY: yPos,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        headStyles: { fillColor: [22, 155, 255] },
      });
    }

    doc.save(`session_${session.id}.pdf`);
  };

  const deleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    try {
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', sessionId);
      if (error) {
        console.error('Error deleting session:', error);
        alert('Failed to delete session. Check console for details.');
      } else {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } catch (err) {
      console.error('Unexpected error deleting session:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <History className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Class History</h1>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No class sessions found</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {session.classroom?.name || 'Unknown Class'}
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(session.started_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(session.started_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{session.student_count} students</span>
                  </div>
                  <div>
                    Instructor: <span className="text-gray-800 font-medium">
                      {session.classroom?.instructor || 'N/A'}
                    </span>
                  </div>
                  <div>
                    Subject: <span className="text-gray-800 font-medium">
                      {session.classroom?.subject || 'N/A'}
                    </span>
                  </div>
                  <div>
                    Actual Duration: {session.duration_minutes ?? 0} min
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => exportToCSV(session)}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                  <button
                    onClick={() => exportToPDF(session)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
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
