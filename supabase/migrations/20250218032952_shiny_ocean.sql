/*
  # Fix User Policies and Add Profile Fields

  1. Changes
    - Drop existing user policies
    - Add new policies for user management
    - Ensure proper access control for user profiles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "users_read_own_data" ON users;
DROP POLICY IF EXISTS "users_update_own_data" ON users;
DROP POLICY IF EXISTS "users_insert_own_data" ON users;

-- Create new policies with proper access control
CREATE POLICY "users_read_own_data" ON users
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "users_update_own_data" ON users
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own_data" ON users
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Add default values for new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE users ADD COLUMN full_name text;
  END IF;
END $$;