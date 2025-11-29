export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
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
      career_match_reports: {
        Row: {
          created_at: string
          id: string
          intake_data: Json
          report_name: string | null
          role_matches: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intake_data?: Json
          report_name?: string | null
          role_matches?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intake_data?: Json
          report_name?: string | null
          role_matches?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      change_item_options: {
        Row: {
          ats_ok: boolean
          change_item_id: string
          created_at: string
          id: string
          length_ok: boolean
          reasons: Json
          score: number
          selected_bool: boolean
          style_ok: boolean
          text: string
          updated_at: string
        }
        Insert: {
          ats_ok?: boolean
          change_item_id: string
          created_at?: string
          id?: string
          length_ok?: boolean
          reasons?: Json
          score?: number
          selected_bool?: boolean
          style_ok?: boolean
          text: string
          updated_at?: string
        }
        Update: {
          ats_ok?: boolean
          change_item_id?: string
          created_at?: string
          id?: string
          length_ok?: boolean
          reasons?: Json
          score?: number
          selected_bool?: boolean
          style_ok?: boolean
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_change_item_options_change_item_id"
            columns: ["change_item_id"]
            isOneToOne: false
            referencedRelation: "change_items"
            referencedColumns: ["id"]
          },
        ]
      }
      change_items: {
        Row: {
          chosen_option_id: string | null
          created_at: string
          id: string
          instruction_text: string
          length_rules: Json | null
          nearby_bullets: Json | null
          original_text: string
          revision_session_id: string
          scope_rules: Json
          section_context: string | null
          status: string
          style_rules: Json | null
          target_selector: string
          updated_at: string
          user_id: string
          user_tweak_text: string | null
        }
        Insert: {
          chosen_option_id?: string | null
          created_at?: string
          id?: string
          instruction_text: string
          length_rules?: Json | null
          nearby_bullets?: Json | null
          original_text: string
          revision_session_id: string
          scope_rules?: Json
          section_context?: string | null
          status?: string
          style_rules?: Json | null
          target_selector: string
          updated_at?: string
          user_id: string
          user_tweak_text?: string | null
        }
        Update: {
          chosen_option_id?: string | null
          created_at?: string
          id?: string
          instruction_text?: string
          length_rules?: Json | null
          nearby_bullets?: Json | null
          original_text?: string
          revision_session_id?: string
          scope_rules?: Json
          section_context?: string | null
          status?: string
          style_rules?: Json | null
          target_selector?: string
          updated_at?: string
          user_id?: string
          user_tweak_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_change_items_chosen_option_id"
            columns: ["chosen_option_id"]
            isOneToOne: false
            referencedRelation: "change_item_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_change_items_revision_session_id"
            columns: ["revision_session_id"]
            isOneToOne: false
            referencedRelation: "revision_sessions"
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
          next_action: string | null
          payment_status: string | null
          phone: string | null
          resume_uploaded: boolean | null
          rush_deadline: string | null
          service_type_id: string | null
          session_booked: boolean | null
          start_date: string | null
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
          next_action?: string | null
          payment_status?: string | null
          phone?: string | null
          resume_uploaded?: boolean | null
          rush_deadline?: string | null
          service_type_id?: string | null
          session_booked?: boolean | null
          start_date?: string | null
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
          next_action?: string | null
          payment_status?: string | null
          phone?: string | null
          resume_uploaded?: boolean | null
          rush_deadline?: string | null
          service_type_id?: string | null
          session_booked?: boolean | null
          start_date?: string | null
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
          cover_image_path: string | null
          cover_image_url: string | null
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
          cover_image_path?: string | null
          cover_image_url?: string | null
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
          cover_image_path?: string | null
          cover_image_url?: string | null
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
      custom_resume_templates: {
        Row: {
          created_at: string
          field_mappings: Json
          id: string
          is_active: boolean
          original_filename: string
          style_metadata: Json
          template_file_path: string
          template_file_url: string | null
          template_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_mappings?: Json
          id?: string
          is_active?: boolean
          original_filename: string
          style_metadata?: Json
          template_file_path: string
          template_file_url?: string | null
          template_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_mappings?: Json
          id?: string
          is_active?: boolean
          original_filename?: string
          style_metadata?: Json
          template_file_path?: string
          template_file_url?: string | null
          template_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_digest_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          include_appointments: boolean
          include_due_today: boolean
          include_due_tomorrow: boolean
          include_new_uploads: boolean
          include_overdue: boolean
          recipient_email: string
          send_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          include_appointments?: boolean
          include_due_today?: boolean
          include_due_tomorrow?: boolean
          include_new_uploads?: boolean
          include_overdue?: boolean
          recipient_email?: string
          send_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          include_appointments?: boolean
          include_due_today?: boolean
          include_due_tomorrow?: boolean
          include_new_uploads?: boolean
          include_overdue?: boolean
          recipient_email?: string
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
          deliverable_instance: number | null
          delivered_at: string
          document_title: string
          document_type: string
          file_path: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          project_id: string | null
          service_deliverable_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          client_id: string
          created_at?: string
          deliverable_instance?: number | null
          delivered_at?: string
          document_title: string
          document_type: string
          file_path: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          project_id?: string | null
          service_deliverable_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          client_id?: string
          created_at?: string
          deliverable_instance?: number | null
          delivered_at?: string
          document_title?: string
          document_type?: string
          file_path?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          project_id?: string | null
          service_deliverable_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_service_deliverable_id_fkey"
            columns: ["service_deliverable_id"]
            isOneToOne: false
            referencedRelation: "service_deliverables"
            referencedColumns: ["id"]
          },
        ]
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
      document_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          document_type: string
          id: string
          is_active: boolean
          is_default: boolean
          metadata: Json | null
          prompt_name: string
          system_prompt: string
          updated_at: string
          user_prompt_template: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_type: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          metadata?: Json | null
          prompt_name: string
          system_prompt: string
          updated_at?: string
          user_prompt_template: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_type?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          metadata?: Json | null
          prompt_name?: string
          system_prompt?: string
          updated_at?: string
          user_prompt_template?: string
        }
        Relationships: []
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
      lesson_videos: {
        Row: {
          captions_path: string | null
          captions_url: string | null
          created_at: string
          duration: number | null
          error_message: string | null
          file_path: string
          file_size: number
          file_url: string | null
          generation_status: string
          id: string
          is_full_lesson: boolean | null
          lesson_id: string
          metadata: Json | null
          prompt: string | null
          segments_count: number | null
          updated_at: string
          video_type: string
        }
        Insert: {
          captions_path?: string | null
          captions_url?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          file_path: string
          file_size?: number
          file_url?: string | null
          generation_status?: string
          id?: string
          is_full_lesson?: boolean | null
          lesson_id: string
          metadata?: Json | null
          prompt?: string | null
          segments_count?: number | null
          updated_at?: string
          video_type?: string
        }
        Update: {
          captions_path?: string | null
          captions_url?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          file_path?: string
          file_size?: number
          file_url?: string | null
          generation_status?: string
          id?: string
          is_full_lesson?: boolean | null
          lesson_id?: string
          metadata?: Json | null
          prompt?: string | null
          segments_count?: number | null
          updated_at?: string
          video_type?: string
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
      linkedin_profile_files: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          processing_progress: number | null
          processing_status: string | null
          profile_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          processing_progress?: number | null
          processing_status?: string | null
          profile_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          processing_progress?: number | null
          processing_status?: string | null
          profile_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_profile_files_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "linkedin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_profiles: {
        Row: {
          audience_seniority: string | null
          call_to_action: string | null
          company_size: string | null
          content_sources: Json | null
          created_at: string
          custom_usp: string | null
          description: string | null
          experience_highlights: Json | null
          generated_headlines: Json | null
          generated_profile: Json | null
          generated_report_data: Json | null
          headline_recommendation: Json | null
          how_you_help: string | null
          id: string
          include_faith: string | null
          industries: string[] | null
          keywords: string | null
          manually_entered_text: string | null
          past_job_titles: string | null
          pasted_text: string | null
          primary_goals: string[] | null
          profile_name: string | null
          raw_content_data: Json | null
          results_and_proof: string | null
          skills: string | null
          skip_experience_highlights: boolean | null
          skip_results_and_proof: boolean | null
          status: string | null
          target_audience: string | null
          target_job_titles: string | null
          unique_selling_points: string[] | null
          updated_at: string
          uploaded_files: Json | null
          use_case: string | null
          user_categories: string[] | null
          user_id: string
          value_proposition: string | null
          voice_style: string | null
          what_you_help: string | null
        }
        Insert: {
          audience_seniority?: string | null
          call_to_action?: string | null
          company_size?: string | null
          content_sources?: Json | null
          created_at?: string
          custom_usp?: string | null
          description?: string | null
          experience_highlights?: Json | null
          generated_headlines?: Json | null
          generated_profile?: Json | null
          generated_report_data?: Json | null
          headline_recommendation?: Json | null
          how_you_help?: string | null
          id?: string
          include_faith?: string | null
          industries?: string[] | null
          keywords?: string | null
          manually_entered_text?: string | null
          past_job_titles?: string | null
          pasted_text?: string | null
          primary_goals?: string[] | null
          profile_name?: string | null
          raw_content_data?: Json | null
          results_and_proof?: string | null
          skills?: string | null
          skip_experience_highlights?: boolean | null
          skip_results_and_proof?: boolean | null
          status?: string | null
          target_audience?: string | null
          target_job_titles?: string | null
          unique_selling_points?: string[] | null
          updated_at?: string
          uploaded_files?: Json | null
          use_case?: string | null
          user_categories?: string[] | null
          user_id: string
          value_proposition?: string | null
          voice_style?: string | null
          what_you_help?: string | null
        }
        Update: {
          audience_seniority?: string | null
          call_to_action?: string | null
          company_size?: string | null
          content_sources?: Json | null
          created_at?: string
          custom_usp?: string | null
          description?: string | null
          experience_highlights?: Json | null
          generated_headlines?: Json | null
          generated_profile?: Json | null
          generated_report_data?: Json | null
          headline_recommendation?: Json | null
          how_you_help?: string | null
          id?: string
          include_faith?: string | null
          industries?: string[] | null
          keywords?: string | null
          manually_entered_text?: string | null
          past_job_titles?: string | null
          pasted_text?: string | null
          primary_goals?: string[] | null
          profile_name?: string | null
          raw_content_data?: Json | null
          results_and_proof?: string | null
          skills?: string | null
          skip_experience_highlights?: boolean | null
          skip_results_and_proof?: boolean | null
          status?: string | null
          target_audience?: string | null
          target_job_titles?: string | null
          unique_selling_points?: string[] | null
          updated_at?: string
          uploaded_files?: Json | null
          use_case?: string | null
          user_categories?: string[] | null
          user_id?: string
          value_proposition?: string | null
          voice_style?: string | null
          what_you_help?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          client_id: string
          created_at: string
          id: string
          message: string
          message_type: string
          read_at: string | null
          sender_id: string
          sender_type: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          client_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string
          read_at?: string | null
          sender_id: string
          sender_type: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
          updated_at?: string
        }
        Relationships: []
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
      notifications: {
        Row: {
          client_id: string | null
          created_at: string | null
          delivery_id: string | null
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          delivery_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          delivery_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
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
      resumejs: {
        Row: {
          created_at: string
          document_id: string | null
          document_type: string
          id: string
          json_data: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          document_type: string
          id?: string
          json_data: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          document_type?: string
          id?: string
          json_data?: Json
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
          content: string | null
          created_at: string
          document_json_data: Json | null
          file_name: string | null
          file_type: string | null
          id: string
          job_description: string | null
          job_title: string | null
          match_score: number | null
          original_content: string | null
          original_file_path: string | null
          original_file_url: string | null
          original_match_score: number | null
          original_resume_id: string | null
          parsed_resume_data: Json | null
          processing_status: string | null
          title: string
          updated_at: string
          user_id: string
          word_document_path: string | null
          word_document_url: string | null
        }
        Insert: {
          analysis_results?: Json | null
          company_name?: string | null
          content?: string | null
          created_at?: string
          document_json_data?: Json | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          match_score?: number | null
          original_content?: string | null
          original_file_path?: string | null
          original_file_url?: string | null
          original_match_score?: number | null
          original_resume_id?: string | null
          parsed_resume_data?: Json | null
          processing_status?: string | null
          title: string
          updated_at?: string
          user_id: string
          word_document_path?: string | null
          word_document_url?: string | null
        }
        Update: {
          analysis_results?: Json | null
          company_name?: string | null
          content?: string | null
          created_at?: string
          document_json_data?: Json | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          match_score?: number | null
          original_content?: string | null
          original_file_path?: string | null
          original_file_url?: string | null
          original_match_score?: number | null
          original_resume_id?: string | null
          parsed_resume_data?: Json | null
          processing_status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          word_document_path?: string | null
          word_document_url?: string | null
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
      revision_sessions: {
        Row: {
          accuracy_report: Json | null
          additional_documents: Json | null
          change_log: Json | null
          created_at: string
          current_resume_content: Json
          id: string
          original_resume_content: Json
          resume_id: string
          revision_notes: string | null
          session_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy_report?: Json | null
          additional_documents?: Json | null
          change_log?: Json | null
          created_at?: string
          current_resume_content?: Json
          id?: string
          original_resume_content?: Json
          resume_id: string
          revision_notes?: string | null
          session_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy_report?: Json | null
          additional_documents?: Json | null
          change_log?: Json | null
          created_at?: string
          current_resume_content?: Json
          id?: string
          original_resume_content?: Json
          resume_id?: string
          revision_notes?: string | null
          session_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_job_analyses: {
        Row: {
          all_requirements: Json
          all_responsibilities: Json
          all_skills: Json
          created_at: string
          id: string
          industry: string | null
          job_title: string
          position_display_name: string
          selected_requirements: Json
          selected_responsibilities: Json
          selected_skills: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          all_requirements?: Json
          all_responsibilities?: Json
          all_skills?: Json
          created_at?: string
          id?: string
          industry?: string | null
          job_title: string
          position_display_name: string
          selected_requirements?: Json
          selected_responsibilities?: Json
          selected_skills?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          all_requirements?: Json
          all_responsibilities?: Json
          all_skills?: Json
          created_at?: string
          id?: string
          industry?: string | null
          job_title?: string
          position_display_name?: string
          selected_requirements?: Json
          selected_responsibilities?: Json
          selected_skills?: Json
          updated_at?: string
          user_id?: string
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
      search_events: {
        Row: {
          created_at: string
          id: string
          query: string
          results_count: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          results_count?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          results_count?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      secure_document_sessions: {
        Row: {
          company_name: string
          created_at: string
          id: string
          job_description: string | null
          job_title: string
          session_metadata: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          job_description?: string | null
          job_title: string
          session_metadata?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          job_description?: string | null
          job_title?: string
          session_metadata?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      secure_documents: {
        Row: {
          company_name: string | null
          content_data: Json
          created_at: string
          document_type: string
          id: string
          is_protected: boolean
          job_description: string | null
          job_title: string | null
          metadata: Json
          session_id: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          company_name?: string | null
          content_data?: Json
          created_at?: string
          document_type: string
          id?: string
          is_protected?: boolean
          job_description?: string | null
          job_title?: string | null
          metadata?: Json
          session_id: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          company_name?: string | null
          content_data?: Json
          created_at?: string
          document_type?: string
          id?: string
          is_protected?: boolean
          job_description?: string | null
          job_title?: string | null
          metadata?: Json
          session_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      service_deliverables: {
        Row: {
          created_at: string | null
          deliverable_category: string
          deliverable_name: string
          deliverable_order: number
          description: string | null
          id: string
          quantity: number
          service_type_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deliverable_category: string
          deliverable_name: string
          deliverable_order?: number
          description?: string | null
          id?: string
          quantity?: number
          service_type_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deliverable_category?: string
          deliverable_name?: string
          deliverable_order?: number
          description?: string | null
          id?: string
          quantity?: number
          service_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_deliverables_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
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
      tailored_documents: {
        Row: {
          analysis_results: Json | null
          company_name: string | null
          content: string
          created_at: string
          document_json_data: Json | null
          document_type: string
          file_name: string | null
          file_type: string | null
          id: string
          job_description: string | null
          job_title: string | null
          match_score: number | null
          original_content: string | null
          original_match_score: number | null
          original_resume_id: string | null
          parsed_document_data: Json | null
          processing_status: string
          tailoring_session_id: string
          title: string
          updated_at: string
          user_id: string
          word_document_path: string | null
          word_document_url: string | null
        }
        Insert: {
          analysis_results?: Json | null
          company_name?: string | null
          content: string
          created_at?: string
          document_json_data?: Json | null
          document_type: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          match_score?: number | null
          original_content?: string | null
          original_match_score?: number | null
          original_resume_id?: string | null
          parsed_document_data?: Json | null
          processing_status?: string
          tailoring_session_id: string
          title: string
          updated_at?: string
          user_id: string
          word_document_path?: string | null
          word_document_url?: string | null
        }
        Update: {
          analysis_results?: Json | null
          company_name?: string | null
          content?: string
          created_at?: string
          document_json_data?: Json | null
          document_type?: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          job_description?: string | null
          job_title?: string | null
          match_score?: number | null
          original_content?: string | null
          original_match_score?: number | null
          original_resume_id?: string | null
          parsed_document_data?: Json | null
          processing_status?: string
          tailoring_session_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          word_document_path?: string | null
          word_document_url?: string | null
        }
        Relationships: []
      }
      tailoring_tasks: {
        Row: {
          created_at: string
          error: string | null
          id: string
          result: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          result?: Json | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          result?: Json | null
          status?: string
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
      user_activity_logs: {
        Row: {
          action_details: Json | null
          activity_type: string
          created_at: string | null
          id: string
          ip_address: unknown
          session_id: string | null
          tool_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          session_id?: string | null
          tool_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          session_id?: string | null
          tool_name?: string | null
          user_agent?: string | null
          user_id?: string | null
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
      user_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          last_activity: string
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          last_activity?: string
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          last_activity?: string
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_customer_completely: {
        Args: { client_id_param: string }
        Returns: Json
      }
      delete_user_completely: { Args: { user_id_param: string }; Returns: Json }
      generate_compelling_summary: {
        Args: { lesson_content: string; lesson_title: string }
        Returns: string
      }
      get_admin_client_overview: {
        Args: never
        Returns: {
          approved_at: string
          client_email: string
          client_id: string
          client_name: string
          deliverable_category: string
          deliverable_description: string
          deliverable_name: string
          delivered_at: string
          delivery_id: string
          delivery_status: string
          document_title: string
          document_type: string
          expected_quantity: number
          file_url: string
          service_type_id: string
        }[]
      }
      get_client_deliverable_progress: {
        Args: { client_id_param: string }
        Returns: {
          completion_percentage: number
          deliverable_category: string
          deliverable_name: string
          delivered_quantity: number
          expected_quantity: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      save_intake_draft: {
        Args: { p_client_id: string; p_form_data: Json; p_user_id: string }
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
