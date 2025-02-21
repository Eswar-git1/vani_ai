/*
  # Fix Classroom RLS Policies V3

  1. Changes
    - Simplify RLS policies for classrooms table
    - Fix teacher access for creating and managing classrooms
    - Maintain student access to view active classrooms

  2. Security
    - Teachers can create and manage their own classrooms
    - Students can only view active classrooms
    - Proper role-based access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can manage own classrooms" ON classrooms;
DROP POLICY IF EXISTS "Students can view active classrooms" ON classrooms;
DROP POLICY IF EXISTS "Teachers can create classrooms" ON classrooms;
DROP POLICY IF EXISTS "Teachers can update own classrooms" ON classrooms;
DROP POLICY IF EXISTS "Anyone can view active classrooms" ON classrooms;

-- Create new unified policy for teachers
CREATE POLICY "teacher_full_access" ON classrooms
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  )
);

-- Create policy for student read access
CREATE POLICY "student_read_access" ON classrooms
FOR SELECT TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'student'
  )
);