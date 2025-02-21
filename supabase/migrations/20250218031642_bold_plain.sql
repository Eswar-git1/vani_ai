/*
  # Fix Classroom RLS Policies - Final Version

  1. Changes
    - Simplify and fix RLS policies for classrooms table
    - Separate policies for different operations
    - Ensure proper teacher access for CRUD operations

  2. Security
    - Teachers can create and manage their own classrooms
    - Students can only view active classrooms
    - Clear separation of concerns for each operation
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "teacher_full_access" ON classrooms;
DROP POLICY IF EXISTS "student_read_access" ON classrooms;
DROP POLICY IF EXISTS "Teachers can manage own classrooms" ON classrooms;
DROP POLICY IF EXISTS "Students can view active classrooms" ON classrooms;
DROP POLICY IF EXISTS "Teachers can create classrooms" ON classrooms;
DROP POLICY IF EXISTS "Teachers can update own classrooms" ON classrooms;
DROP POLICY IF EXISTS "Anyone can view active classrooms" ON classrooms;

-- Create separate policies for each operation
CREATE POLICY "teachers_insert" ON classrooms
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  )
);

CREATE POLICY "teachers_select" ON classrooms
FOR SELECT TO authenticated
USING (
  (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
      AND teacher_id = auth.uid()
    )
  )
);

CREATE POLICY "teachers_update" ON classrooms
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND teacher_id = auth.uid()
  )
);

CREATE POLICY "teachers_delete" ON classrooms
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND teacher_id = auth.uid()
  )
);

CREATE POLICY "students_select" ON classrooms
FOR SELECT TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'student'
  )
);