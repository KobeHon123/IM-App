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
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          pic: string
          thumbnail_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string
          pic: string
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          pic?: string
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      venues: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string
          pic: string
          part_quantities: Json
          thumbnail: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string
          pic: string
          part_quantities?: Json
          thumbnail?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string
          pic?: string
          part_quantities?: Json
          thumbnail?: string | null
          created_at?: string
        }
      }
      parts: {
        Row: {
          id: string
          project_id: string
          parent_part_id: string | null
          name: string
          type: string
          status: string
          description: string
          designer: string | null
          dimensions: Json
          cad_drawing_url: string | null
          picture_urls: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          parent_part_id?: string | null
          name: string
          type: string
          status?: string
          description?: string
          designer?: string | null
          dimensions?: Json
          cad_drawing_url?: string | null
          picture_urls?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          parent_part_id?: string | null
          name?: string
          type?: string
          status?: string
          description?: string
          designer?: string | null
          dimensions?: Json
          cad_drawing_url?: string | null
          picture_urls?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      venue_parts: {
        Row: {
          id: string
          venue_id: string
          part_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          part_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          venue_id?: string
          part_id?: string
          quantity?: number
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          part_id: string
          author: string
          text: string
          is_pending: boolean
          is_completed: boolean
          venue_id: string | null
          venue_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          part_id: string
          author: string
          text: string
          is_pending?: boolean
          is_completed?: boolean
          venue_id?: string | null
          venue_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          part_id?: string
          author?: string
          text?: string
          is_pending?: boolean
          is_completed?: boolean
          venue_id?: string | null
          venue_name?: string | null
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          project_id: string
          event_date: string
          event_type: string
          description: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          event_date: string
          event_type: string
          description?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          event_date?: string
          event_type?: string
          description?: string
          created_at?: string
          updated_at?: string
        }
      }
      event_parts: {
        Row: {
          id: string
          event_id: string
          part_id: string
        }
        Insert: {
          id?: string
          event_id: string
          part_id: string
        }
        Update: {
          id?: string
          event_id?: string
          part_id?: string
        }
      }
      part_type_counters: {
        Row: {
          id: string
          project_id: string
          part_type: string
          counter: number
        }
        Insert: {
          id?: string
          project_id: string
          part_type: string
          counter?: number
        }
        Update: {
          id?: string
          project_id?: string
          part_type?: string
          counter?: number
        }
      }
      timesheets: {
        Row: {
          id: string
          user_id: string
          work_date: string
          period: 'full' | 'am' | 'pm' | 'off'
          location: 'office' | 'polyu' | 'home' | 'site' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_date: string
          period: 'full' | 'am' | 'pm' | 'off'
          location?: 'office' | 'polyu' | 'home' | 'site' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_date?: string
          period?: 'full' | 'am' | 'pm' | 'off'
          location?: 'office' | 'polyu' | 'home' | 'site' | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
