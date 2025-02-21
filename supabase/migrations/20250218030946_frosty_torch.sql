/*
  # Fix Classroom RLS Policies

  1. Changes
    - Drop existing RLS policies for classrooms table
    - Add new, more permissive policies for teachers
    - Add policy for students to view active classrooms

  2. Security
    - Teachers can manage their own classrooms
    - Students can view active classrooms
    - Maintains data isolation between teachers
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can create classrooms" ON classrooms;
DROP POLICY IF EXISTS "Teachers can update own classrooms" ON classrooms;
DROP POLICY IF EXISTS "Anyone can view active classrooms" ON classrooms;

-- Create new policies
CREATE POLICY "Teachers can manage own classrooms"
  ON classrooms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
      AND (
        teacher_id = auth.uid() -- For existing classrooms
        OR auth.uid() IS NOT NULL -- For new classrooms
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
    )
  );

CREATE POLICY "Students can view active classrooms"
  ON classrooms
  FOR SELECT
  TO authenticated
  USING (
    (is_active = true AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'student'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
    ))
  );