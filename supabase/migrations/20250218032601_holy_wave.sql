/*
  # Fix User Policies

  1. Changes
    - Drop existing user policies
    - Add new policies for user access
    - Ensure users can read their own data
    - Allow users to update their own data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create new policies
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