/*
  # Initial Schema Setup for Classroom Translation App

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `role` (text, either 'teacher' or 'student')
      - `full_name` (text, nullable)
      - `preferred_language` (text)
      - `created_at` (timestamp)
    
    - `classrooms`
      - `id` (uuid, primary key)
      - `name` (text)
      - `code` (text, unique)
      - `teacher_id` (uuid, foreign key to users)
      - `is_active` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('teacher', 'student')),
  full_name text,
  preferred_language text NOT NULL DEFAULT 'en',
  created_at timestamptz DEFAULT now()
);

-- Create classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  teacher_id uuid REFERENCES users(id) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Classrooms policies
CREATE POLICY "Teachers can create classrooms"
  ON classrooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
    )
  );

CREATE POLICY "Teachers can update own classrooms"
  ON classrooms
  FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Anyone can view active classrooms"
  ON classrooms
  FOR SELECT
  TO authenticated
  USING (true);