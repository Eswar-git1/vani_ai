export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'teacher' | 'student'
          full_name: string | null
          preferred_language: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'teacher' | 'student'
          full_name?: string | null
          preferred_language?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'teacher' | 'student'
          full_name?: string | null
          preferred_language?: string
          created_at?: string
        }
      }
      classrooms: {
        Row: {
          id: string
          name: string
          code: string
          teacher_id: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          teacher_id: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          teacher_id?: string
          is_active?: boolean
          created_at?: string
        }
      }
    }
  }
}