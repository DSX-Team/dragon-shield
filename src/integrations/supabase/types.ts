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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          target_id: string | null
          target_type: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_id?: string | null
          target_type?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_id?: string | null
          target_type?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      bouquets: {
        Row: {
          channel_ids: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_adult: boolean | null
          movie_ids: string[] | null
          name: string
          radio_ids: string[] | null
          series_ids: string[] | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          channel_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_adult?: boolean | null
          movie_ids?: string[] | null
          name: string
          radio_ids?: string[] | null
          series_ids?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          channel_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_adult?: boolean | null
          movie_ids?: string[] | null
          name?: string
          radio_ids?: string[] | null
          series_ids?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      channels: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string
          epg_id: string | null
          id: string
          license_info: Json | null
          logo_url: string | null
          name: string
          package_ids: string[] | null
          transcode_profiles: Json | null
          updated_at: string
          upstream_sources: Json
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          epg_id?: string | null
          id?: string
          license_info?: Json | null
          logo_url?: string | null
          name: string
          package_ids?: string[] | null
          transcode_profiles?: Json | null
          updated_at?: string
          upstream_sources?: Json
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          epg_id?: string | null
          id?: string
          license_info?: Json | null
          logo_url?: string | null
          name?: string
          package_ids?: string[] | null
          transcode_profiles?: Json | null
          updated_at?: string
          upstream_sources?: Json
        }
        Relationships: []
      }
      epg: {
        Row: {
          category: string | null
          channel_id: string
          created_at: string
          description: string | null
          end_time: string
          id: string
          metadata: Json | null
          program_id: string | null
          rating: string | null
          start_time: string
          title: string
        }
        Insert: {
          category?: string | null
          channel_id: string
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          metadata?: Json | null
          program_id?: string | null
          rating?: string | null
          start_time: string
          title: string
        }
        Update: {
          category?: string | null
          channel_id?: string
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          metadata?: Json | null
          program_id?: string | null
          rating?: string | null
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "epg_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          genre: string | null
          id: string
          name: string
          poster_url: string | null
          rating: number | null
          updated_at: string
          year: number | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          genre?: string | null
          id?: string
          name: string
          poster_url?: string | null
          rating?: number | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          genre?: string | null
          id?: string
          name?: string
          poster_url?: string | null
          rating?: number | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          active: boolean | null
          bitrate_limits: Json | null
          concurrent_limit: number | null
          created_at: string
          description: string | null
          duration_days: number | null
          features: Json | null
          id: string
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          bitrate_limits?: Json | null
          concurrent_limit?: number | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          features?: Json | null
          id?: string
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          bitrate_limits?: Json | null
          concurrent_limit?: number | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          features?: Json | null
          id?: string
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allowed_ips: string[] | null
          api_password: string | null
          banned_ips: string[] | null
          bouquet_ids: string[] | null
          country_code: string | null
          created_at: string
          credits: number | null
          daily_bandwidth_limit: number | null
          email: string
          id: string
          is_trial: boolean | null
          last_ip: unknown | null
          last_login: string | null
          max_connections: number | null
          notes: string | null
          parent_id: string | null
          reseller_id: string | null
          roles: string[] | null
          status: string | null
          timezone: string | null
          total_bandwidth_used: number | null
          trial_expires_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          username: string
        }
        Insert: {
          allowed_ips?: string[] | null
          api_password?: string | null
          banned_ips?: string[] | null
          bouquet_ids?: string[] | null
          country_code?: string | null
          created_at?: string
          credits?: number | null
          daily_bandwidth_limit?: number | null
          email: string
          id?: string
          is_trial?: boolean | null
          last_ip?: unknown | null
          last_login?: string | null
          max_connections?: number | null
          notes?: string | null
          parent_id?: string | null
          reseller_id?: string | null
          roles?: string[] | null
          status?: string | null
          timezone?: string | null
          total_bandwidth_used?: number | null
          trial_expires_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
          username: string
        }
        Update: {
          allowed_ips?: string[] | null
          api_password?: string | null
          banned_ips?: string[] | null
          bouquet_ids?: string[] | null
          country_code?: string | null
          created_at?: string
          credits?: number | null
          daily_bandwidth_limit?: number | null
          email?: string
          id?: string
          is_trial?: boolean | null
          last_ip?: unknown | null
          last_login?: string | null
          max_connections?: number | null
          notes?: string | null
          parent_id?: string | null
          reseller_id?: string | null
          roles?: string[] | null
          status?: string | null
          timezone?: string | null
          total_bandwidth_used?: number | null
          trial_expires_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      radio_stations: {
        Row: {
          active: boolean | null
          category: string | null
          country: string | null
          created_at: string
          description: string | null
          frequency: string | null
          id: string
          language: string | null
          logo_url: string | null
          name: string
          stream_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          name: string
          stream_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          name?: string
          stream_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      resellers: {
        Row: {
          allowed_packages: string[] | null
          commission_rate: number | null
          created_at: string | null
          created_users: number | null
          credit_price: number | null
          credits: number | null
          id: string
          is_active: boolean | null
          max_users: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allowed_packages?: string[] | null
          commission_rate?: number | null
          created_at?: string | null
          created_users?: number | null
          credit_price?: number | null
          credits?: number | null
          id?: string
          is_active?: boolean | null
          max_users?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allowed_packages?: string[] | null
          commission_rate?: number | null
          created_at?: string | null
          created_users?: number | null
          credit_price?: number | null
          credits?: number | null
          id?: string
          is_active?: boolean | null
          max_users?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resellers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "resellers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      series: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string
          description: string | null
          episodes: number | null
          genre: string | null
          id: string
          poster_url: string | null
          rating: number | null
          seasons: number | null
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          episodes?: number | null
          genre?: string | null
          id?: string
          poster_url?: string | null
          rating?: number | null
          seasons?: number | null
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string
          description?: string | null
          episodes?: number | null
          genre?: string | null
          id?: string
          poster_url?: string | null
          rating?: number | null
          seasons?: number | null
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      server_credential_access_log: {
        Row: {
          access_type: string
          accessed_by: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown | null
          server_id: string
          success: boolean
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_by: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          server_id: string
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_by?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          server_id?: string
          success?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "server_credential_access_log_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "streaming_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          bytes_transferred: number | null
          client_ip: unknown
          created_at: string
          device_info: Json | null
          end_time: string | null
          id: string
          last_activity: string
          start_time: string
          stream_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          bytes_transferred?: number | null
          client_ip: unknown
          created_at?: string
          device_info?: Json | null
          end_time?: string | null
          id?: string
          last_activity?: string
          start_time?: string
          stream_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          bytes_transferred?: number | null
          client_ip?: unknown
          created_at?: string
          device_info?: Json | null
          end_time?: string | null
          id?: string
          last_activity?: string
          start_time?: string
          stream_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      streaming_servers: {
        Row: {
          active: boolean
          bandwidth_in: number | null
          bandwidth_out: number | null
          config: Json | null
          cpu_usage: number | null
          created_at: string
          current_clients: number
          disk_usage: number | null
          hostname: string
          id: string
          ip_address: unknown
          last_ping: string | null
          max_clients: number
          memory_usage: number | null
          name: string
          notes: string | null
          os_version: string
          port: number
          server_key: string
          ssh_port: number
          ssh_username: string
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bandwidth_in?: number | null
          bandwidth_out?: number | null
          config?: Json | null
          cpu_usage?: number | null
          created_at?: string
          current_clients?: number
          disk_usage?: number | null
          hostname: string
          id?: string
          ip_address: unknown
          last_ping?: string | null
          max_clients?: number
          memory_usage?: number | null
          name: string
          notes?: string | null
          os_version: string
          port?: number
          server_key: string
          ssh_port?: number
          ssh_username?: string
          status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bandwidth_in?: number | null
          bandwidth_out?: number | null
          config?: Json | null
          cpu_usage?: number | null
          created_at?: string
          current_clients?: number
          disk_usage?: number | null
          hostname?: string
          id?: string
          ip_address?: unknown
          last_ping?: string | null
          max_clients?: number
          memory_usage?: number | null
          name?: string
          notes?: string | null
          os_version?: string
          port?: number
          server_key?: string
          ssh_port?: number
          ssh_username?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      streams: {
        Row: {
          channel_id: string
          clients_count: number | null
          created_at: string
          edge_server_id: string | null
          end_timestamp: string | null
          ffmpeg_pid: number | null
          id: string
          start_timestamp: string
          state: string | null
          stream_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          clients_count?: number | null
          created_at?: string
          edge_server_id?: string | null
          end_timestamp?: string | null
          ffmpeg_pid?: number | null
          id?: string
          start_timestamp?: string
          state?: string | null
          stream_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          clients_count?: number | null
          created_at?: string
          edge_server_id?: string | null
          end_timestamp?: string | null
          ffmpeg_pid?: number | null
          id?: string
          start_timestamp?: string
          state?: string | null
          stream_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_streams_edge_server"
            columns: ["edge_server_id"]
            isOneToOne: false
            referencedRelation: "streaming_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_info: Json | null
          created_at: string
          end_date: string
          id: string
          package_id: string
          start_date: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_info?: Json | null
          created_at?: string
          end_date: string
          id?: string
          package_id: string
          start_date?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_info?: Json | null
          created_at?: string
          end_date?: string
          id?: string
          package_id?: string
          start_date?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action: string
          details: Json | null
          id: string
          ip_address: unknown | null
          timestamp: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          timestamp?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_connections: {
        Row: {
          bytes_transferred: number | null
          channel_id: string | null
          connected_at: string | null
          created_at: string | null
          disconnected_at: string | null
          duration_seconds: number | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          stream_type: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          bytes_transferred?: number | null
          channel_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address: unknown
          is_active?: boolean | null
          stream_type?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          bytes_transferred?: number | null
          channel_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          disconnected_at?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          stream_type?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      safe_profiles: {
        Row: {
          country_code: string | null
          created_at: string | null
          credits: number | null
          email: string | null
          has_api_password: boolean | null
          id: string | null
          is_trial: boolean | null
          max_connections: number | null
          notes: string | null
          roles: string[] | null
          status: string | null
          timezone: string | null
          trial_expires_at: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          credits?: number | null
          email?: string | null
          has_api_password?: never
          id?: string | null
          is_trial?: boolean | null
          max_connections?: number | null
          notes?: string | null
          roles?: string[] | null
          status?: string | null
          timezone?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          credits?: number | null
          email?: string | null
          has_api_password?: never
          id?: string | null
          is_trial?: boolean | null
          max_connections?: number | null
          notes?: string | null
          roles?: string[] | null
          status?: string | null
          timezone?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_default_admin_if_none_exists: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      encrypt_sensitive_data: {
        Args: { data: string }
        Returns: string
      }
      generate_and_store_api_password: {
        Args: { user_profile_id: string }
        Returns: string
      }
      generate_api_password: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_channels: number
          active_sessions: number
          active_streams: number
          active_subscriptions: number
          active_users: number
          admin_users: number
          total_users: number
        }[]
      }
      get_available_servers: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_clients: number
          load_percentage: number
          max_clients: number
          server_id: string
        }[]
      }
      get_server_connection_details: {
        Args: { server_uuid: string }
        Returns: {
          hostname: string
          ip_address: unknown
          port: number
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_statistics: {
        Args: { user_uuid: string }
        Returns: {
          active_connections: number
          last_activity: string
          most_used_ip: unknown
          total_bandwidth: number
          total_connections: number
        }[]
      }
      log_admin_profile_access: {
        Args: { access_type: string; admin_user_id: string; table_name: string }
        Returns: boolean
      }
      validate_server_access: {
        Args: { server_uuid: string }
        Returns: boolean
      }
      verify_api_password: {
        Args: { password_input: string; username_input: string }
        Returns: boolean
      }
      verify_encrypted_data: {
        Args: { data: string; encrypted_hash: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
