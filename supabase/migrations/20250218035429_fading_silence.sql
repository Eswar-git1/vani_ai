/*
  # Add Class Sessions Table

  1. New Tables
    - `class_sessions`
      - `id` (uuid, primary key)
      - `classroom_id` (uuid, references classrooms)
      - `started_at` (timestamp)
      - `ended_at` (timestamp, nullable)
      - `student_count` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for teachers to manage sessions
*/

CREATE TABLE IF NOT EXISTS class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES classrooms(id) NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  student_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own class sessions
CREATE POLICY "teachers_manage_sessions"
ON class_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classrooms c
    JOIN users u ON u.id = c.teacher_id
    WHERE c.id = class_sessions.classroom_id
    AND u.id = auth.uid()
    AND u.role = 'teacher'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classrooms c
    JOIN users u ON u.id = c.teacher_id
    WHERE c.id = class_sessions.classroom_id
    AND u.id = auth.uid()
    AND u.role = 'teacher'
  )
);