export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          id: string
          is_read: boolean
          is_rush: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          is_rush?: boolean
          message: string
          metadata?: Json | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          is_rush?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_files: {
        Row: {
          created_at: string
          duration: number | null
          file_path: string
          file_size: number
          file_url: string | null
          generation_status: string
          id: string
          lesson_id: string
          updated_at: string
          voice_id: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          file_path: string
          file_size?: number
          file_url?: string | null
          generation_status?: string
          id?: string
          lesson_id: string
          updated_at?: string
          voice_id?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          file_path?: string
          file_size?: number
          file_url?: string | null
          generation_status?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_files_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      client_history: {
        Row: {
          action_type: string
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action_type: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action_type?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "client_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_progress: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          status: string
          step_name: string
          step_number: number
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          step_name: string
          step_number: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          step_name?: string
          step_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          assigned_date: string | null
          client_id: string | null
          completed_date: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          project_id: string | null
          status: string | null
          task_id: string | null
          task_order: number | null
          updated_at: string
        }
        Insert: {
          assigned_date?: string | null
          client_id?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          project_id?: string | null
          status?: string | null
          task_id?: string | null
          task_order?: number | null
          updated_at?: string
        }
        Update: {
          assigned_date?: string | null
          client_id?: string | null
          completed_date?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          project_id?: string | null
          status?: string | null
          task_id?: string | null
          task_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_training_access: {
        Row: {
          access_type: string
          client_id: string
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          package_name: string | null
          training_material_id: string
        }
        Insert: {
          access_type?: string
          client_id: string
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          package_name?: string | null
          training_material_id: string
        }
        Update: {
          access_type?: string
          client_id?: string
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          package_name?: string | null
          training_material_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string
          estimated_delivery_date: string | null
          id: string
          intake_form_submitted: boolean | null
          is_rush: boolean
          name: string
          payment_status: string | null
          phone: string | null
          resume_uploaded: boolean | null
          rush_deadline: string | null
          service_type_id: string | null
          session_booked: boolean | null
          status: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          estimated_delivery_date?: string | null
          id?: string
          intake_form_submitted?: boolean | null
          is_rush?: boolean
          name: string
          payment_status?: string | null
          phone?: string | null
          resume_uploaded?: boolean | null
          rush_deadline?: string | null
          service_type_id?: string | null
          session_booked?: boolean | null
          status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          estimated_delivery_date?: string | null
          id?: string
          intake_form_submitted?: boolean | null
          is_rush?: boolean
          name?: string
          payment_status?: string | null
          phone?: string | null
          resume_uploaded?: boolean | null
          rush_deadline?: string | null
          service_type_id?: string | null
          session_booked?: boolean | null
          status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      course_outlines: {
        Row: {
          approval_status: string
          course_preferences_id: string
          created_at: string
          description: string | null
          ebook_id: string
          id: string
          modules: Json
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          course_preferences_id: string
          created_at?: string
          description?: string | null
          ebook_id: string
          id?: string
          modules?: Json
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          course_preferences_id?: string
          created_at?: string
          description?: string | null
          ebook_id?: string
          id?: string
          modules?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_course_outlines_ebook"
            columns: ["ebook_id"]
            isOneToOne: false
            referencedRelation: "ebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_course_outlines_preferences"
            columns: ["course_preferences_id"]
            isOneToOne: false
            referencedRelation: "course_preferences"
            referencedColumns: ["id"]
          },
        ]
      }
      course_preferences: {
        Row: {
          content_source: string
          course_length: string
          created_at: string
          ebook_id: string
          id: string
          outline_approach: string
          updated_at: string
        }
        Insert: {
          content_source: string
          course_length: string
          created_at?: string
          ebook_id: string
          id?: string
          outline_approach: string
          updated_at?: string
        }
        Update: {
          content_source?: string
          course_length?: string
          created_at?: string
          ebook_id?: string
          id?: string
          outline_approach?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_course_preferences_ebook"
            columns: ["ebook_id"]
            isOneToOne: false
            referencedRelation: "ebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          ebook_id: string
          id: string
          processing_status: string
          title: string
          total_lessons: number
          total_modules: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ebook_id: string
          id?: string
          processing_status?: string
          title: string
          total_lessons?: number
          total_modules?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ebook_id?: string
          id?: string
          processing_status?: string
          title?: string
          total_lessons?: number
          total_modules?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_ebook_id_fkey"
            columns: ["ebook_id"]
            isOneToOne: false
            referencedRelation: "ebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_digest_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          include_due_today: boolean
          include_due_tomorrow: boolean
          include_new_uploads: boolean
          include_overdue: boolean
          send_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          include_due_today?: boolean
          include_due_tomorrow?: boolean
          include_new_uploads?: boolean
          include_overdue?: boolean
          send_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          include_due_today?: boolean
          include_due_tomorrow?: boolean
          include_new_uploads?: boolean
          include_overdue?: boolean
          send_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          approved_at: string | null
          client_id: string
          created_at: string
          delivered_at: string
          document_title: string
          document_type: string
          file_path: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          client_id: string
          created_at?: string
          delivered_at?: string
          document_title: string
          document_type: string
          file_path: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          client_id?: string
          created_at?: string
          delivered_at?: string
          document_title?: string
          document_type?: string
          file_path?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_comments: {
        Row: {
          client_id: string | null
          content: string
          created_at: string
          delivery_id: string
          id: string
          is_admin: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          content: string
          created_at?: string
          delivery_id: string
          id?: string
          is_admin?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          content?: string
          created_at?: string
          delivery_id?: string
          id?: string
          is_admin?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_collaborators: {
        Row: {
          accepted_at: string | null
          document_id: string
          id: string
          invited_at: string
          invited_by: string
          permission_level: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          document_id: string
          id?: string
          invited_at?: string
          invited_by: string
          permission_level: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          document_id?: string
          id?: string
          invited_at?: string
          invited_by?: string
          permission_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_collaborators_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          content: string
          created_at: string
          document_id: string
          id: string
          is_resolved: boolean | null
          parent_comment_id: string | null
          position_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          id?: string
          is_resolved?: boolean | null
          parent_comment_id?: string | null
          position_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          is_resolved?: boolean | null
          parent_comment_id?: string | null
          position_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "document_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_uploads: {
        Row: {
          bucket_name: string
          client_id: string | null
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          intake_form_id: string | null
          metadata: Json | null
          mime_type: string
          original_name: string
          status: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          bucket_name: string
          client_id?: string | null
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          intake_form_id?: string | null
          metadata?: Json | null
          mime_type: string
          original_name: string
          status?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          bucket_name?: string
          client_id?: string | null
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          intake_form_id?: string | null
          metadata?: Json | null
          mime_type?: string
          original_name?: string
          status?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_uploads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploads_intake_form_id_fkey"
            columns: ["intake_form_id"]
            isOneToOne: false
            referencedRelation: "intake_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_summary: string | null
          content: Json
          created_at: string
          created_by: string
          document_id: string
          html_content: string | null
          id: string
          version: number
        }
        Insert: {
          change_summary?: string | null
          content: Json
          created_at?: string
          created_by: string
          document_id: string
          html_content?: string | null
          id?: string
          version: number
        }
        Update: {
          change_summary?: string | null
          content?: Json
          created_at?: string
          created_by?: string
          document_id?: string
          html_content?: string | null
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: Json
          created_at: string
          file_size: number | null
          html_content: string | null
          id: string
          is_template: boolean | null
          owner_id: string
          sharing_permissions: Json | null
          template_category: string | null
          title: string
          updated_at: string
          version: number | null
          word_count: number | null
        }
        Insert: {
          content?: Json
          created_at?: string
          file_size?: number | null
          html_content?: string | null
          id?: string
          is_template?: boolean | null
          owner_id: string
          sharing_permissions?: Json | null
          template_category?: string | null
          title: string
          updated_at?: string
          version?: number | null
          word_count?: number | null
        }
        Update: {
          content?: Json
          created_at?: string
          file_size?: number | null
          html_content?: string | null
          id?: string
          is_template?: boolean | null
          owner_id?: string
          sharing_permissions?: Json | null
          template_category?: string | null
          title?: string
          updated_at?: string
          version?: number | null
          word_count?: number | null
        }
        Relationships: []
      }
      ebooks: {
        Row: {
          author: string | null
          created_at: string
          extracted_text: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          processing_status: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          extracted_text?: string | null
          file_name: string
          file_path: string
          file_size?: number
          file_type: string
          id?: string
          processing_status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          processing_status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          content: string
          created_at: string
          delay_days: number | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          delay_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          delay_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      intake_form_drafts: {
        Row: {
          client_id: string
          created_at: string
          form_data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          form_data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          form_data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intake_forms: {
        Row: {
          created_at: string
          description: string | null
          form_fields: Json | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          form_fields?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          form_fields?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          content: string
          created_at: string
          duration_estimate: number | null
          id: string
          key_points: Json
          lesson_order: number
          module_id: string
          narration_script: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          duration_estimate?: number | null
          id?: string
          key_points?: Json
          lesson_order?: number
          module_id: string
          narration_script?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          duration_estimate?: number | null
          id?: string
          key_points?: Json
          lesson_order?: number
          module_id?: string
          narration_script?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          lesson_count: number
          module_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          lesson_count?: number
          module_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lesson_count?: number
          module_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          id: string
          is_enabled: boolean
          priority: number
          rule_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          priority?: number
          rule_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          priority?: number
          rule_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          email_verified_at: string | null
          failed_login_attempts: number | null
          first_name: string | null
          id: string
          industry: string | null
          job_title: string | null
          last_name: string | null
          last_seen_at: string | null
          linkedin_access_token: string | null
          linkedin_token_expires: string | null
          linkedin_url: string | null
          location: string | null
          locked_until: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone: string | null
          updated_at: string
          website: string | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified_at?: string | null
          failed_login_attempts?: number | null
          first_name?: string | null
          id: string
          industry?: string | null
          job_title?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          linkedin_access_token?: string | null
          linkedin_token_expires?: string | null
          linkedin_url?: string | null
          location?: string | null
          locked_until?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          updated_at?: string
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_verified_at?: string | null
          failed_login_attempts?: number | null
          first_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          linkedin_access_token?: string | null
          linkedin_token_expires?: string | null
          linkedin_url?: string | null
          location?: string | null
          locked_until?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          updated_at?: string
          website?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          actual_delivery_date: string | null
          client_id: string | null
          created_at: string
          estimated_delivery_date: string | null
          id: string
          name: string
          service_type_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          client_id?: string | null
          created_at?: string
          estimated_delivery_date?: string | null
          id?: string
          name: string
          service_type_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          client_id?: string | null
          created_at?: string
          estimated_delivery_date?: string | null
          id?: string
          name?: string
          service_type_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_templates: {
        Row: {
          created_at: string
          delay_hours: number
          id: string
          is_active: boolean
          message_template: string
          name: string
          subject_template: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_hours?: number
          id?: string
          is_active?: boolean
          message_template: string
          name: string
          subject_template: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_hours?: number
          id?: string
          is_active?: boolean
          message_template?: string
          name?: string
          subject_template?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      resume_analyses: {
        Row: {
          analysis_results: Json | null
          created_at: string
          extracted_text: string | null
          file_size: number
          file_url: string
          id: string
          industry: string | null
          job_description: string | null
          job_title: string | null
          original_filename: string
          targeting_method: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_results?: Json | null
          created_at?: string
          extracted_text?: string | null
          file_size?: number
          file_url: string
          id?: string
          industry?: string | null
          job_description?: string | null
          job_title?: string | null
          original_filename: string
          targeting_method: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_results?: Json | null
          created_at?: string
          extracted_text?: string | null
          file_size?: number
          file_url?: string
          id?: string
          industry?: string | null
          job_description?: string | null
          job_title?: string | null
          original_filename?: string
          targeting_method?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_match_tests: {
        Row: {
          analysis_results: Json | null
          company_name: string | null
          content: string
          created_at: string
          file_name: string | null
          file_type: string | null
          id: string
          job_title: string | null
          match_score: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_results?: Json | null
          company_name?: string | null
          content: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          job_title?: string | null
          match_score?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_results?: Json | null
          company_name?: string | null
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          job_title?: string | null
          match_score?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          analysis_results: Json | null
          company_name: string | null
          content: string
          created_at: string
          file_name: string | null
          file_type: string | null
          id: string
          job_description: string | null
          job_title: string | null
          match_score: number | null
          original_match_score: number | null
          original_resume_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_results?: Json | null
          company_name?: string | null
          content: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          match_score?: number | null
          original_match_score?: number | null
          original_resume_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_results?: Json | null
          company_name?: string | null
          content?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          match_score?: number | null
          original_match_score?: number | null
          original_resume_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revision_requests: {
        Row: {
          attachment_urls: string[] | null
          client_id: string
          created_at: string
          custom_reason: string | null
          delivery_id: string
          description: string
          due_date: string | null
          id: string
          reasons: string[]
          status: string
          updated_at: string
        }
        Insert: {
          attachment_urls?: string[] | null
          client_id: string
          created_at?: string
          custom_reason?: string | null
          delivery_id: string
          description: string
          due_date?: string | null
          id?: string
          reasons?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          attachment_urls?: string[] | null
          client_id?: string
          created_at?: string
          custom_reason?: string | null
          delivery_id?: string
          description?: string
          due_date?: string | null
          id?: string
          reasons?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_job_descriptions: {
        Row: {
          all_requirements: Json
          all_responsibilities: Json
          all_skills: Json
          company_mission: string | null
          company_name: string
          created_at: string
          id: string
          job_title: string
          match_score: number | null
          selected_requirements: Json
          selected_responsibilities: Json
          selected_skills: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          all_requirements?: Json
          all_responsibilities?: Json
          all_skills?: Json
          company_mission?: string | null
          company_name: string
          created_at?: string
          id?: string
          job_title: string
          match_score?: number | null
          selected_requirements?: Json
          selected_responsibilities?: Json
          selected_skills?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          all_requirements?: Json
          all_responsibilities?: Json
          all_skills?: Json
          company_mission?: string | null
          company_name?: string
          created_at?: string
          id?: string
          job_title?: string
          match_score?: number | null
          selected_requirements?: Json
          selected_responsibilities?: Json
          selected_skills?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      scheduled_reminders: {
        Row: {
          client_id: string
          created_at: string
          id: string
          reminder_data: Json
          scheduled_for: string
          sent_at: string | null
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          reminder_data?: Json
          scheduled_for: string
          sent_at?: string | null
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          reminder_data?: Json
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_email_templates: {
        Row: {
          created_at: string
          email_template_id: string | null
          id: string
          service_type_id: string | null
        }
        Insert: {
          created_at?: string
          email_template_id?: string | null
          id?: string
          service_type_id?: string | null
        }
        Update: {
          created_at?: string
          email_template_id?: string | null
          id?: string
          service_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_email_templates_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_email_templates_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_intake_forms: {
        Row: {
          created_at: string
          id: string
          intake_form_id: string | null
          is_required: boolean | null
          service_type_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          intake_form_id?: string | null
          is_required?: boolean | null
          service_type_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          intake_form_id?: string | null
          is_required?: boolean | null
          service_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_intake_forms_intake_form_id_fkey"
            columns: ["intake_form_id"]
            isOneToOne: false
            referencedRelation: "intake_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_intake_forms_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tasks: {
        Row: {
          created_at: string
          id: string
          service_type_id: string | null
          task_id: string | null
          task_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          service_type_id?: string | null
          task_id?: string | null
          task_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          service_type_id?: string | null
          task_id?: string | null
          task_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_tasks_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      service_training_materials: {
        Row: {
          created_at: string
          id: string
          service_type_id: string | null
          training_material_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          service_type_id?: string | null
          training_material_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          service_type_id?: string | null
          training_material_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_training_materials_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_training_materials_training_material_id_fkey"
            columns: ["training_material_id"]
            isOneToOne: false
            referencedRelation: "training_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          created_at: string
          default_timeline_days: number | null
          description: string | null
          gpt_form_prompt: string | null
          id: string
          is_active: boolean | null
          name: string
          price_cents: number | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_timeline_days?: number | null
          description?: string | null
          gpt_form_prompt?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_cents?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_timeline_days?: number | null
          description?: string | null
          gpt_form_prompt?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_cents?: number | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          default_order: number | null
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_order?: number | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_order?: number | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_materials: {
        Row: {
          content_url: string | null
          created_at: string
          description: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_active: boolean | null
          mime_type: string | null
          name: string
          thumbnail_url: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          content_url?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          name: string
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          content_url?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          name?: string
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      save_intake_draft: {
        Args: { p_client_id: string; p_user_id: string; p_form_data: Json }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
