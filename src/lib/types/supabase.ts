export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      artist_genres: {
        Row: {
          artist_id: string
          genre_id: string
        }
        Insert: {
          artist_id: string
          genre_id: string
        }
        Update: {
          artist_id?: string
          genre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_genres_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          aliases: string[] | null
          bio: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          slug: string
          socials: Json | null
        }
        Insert: {
          aliases?: string[] | null
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          slug: string
          socials?: Json | null
        }
        Update: {
          aliases?: string[] | null
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          socials?: Json | null
        }
        Relationships: []
      }
      collection_sets: {
        Row: {
          collection_id: string
          created_at: string
          set_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          set_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_sets_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets_search"
            referencedColumns: ["set_id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          date_end: string | null
          date_start: string | null
          festival_id: string | null
          id: string
          location: string | null
          name: string
          slug: string
          stages: string[] | null
        }
        Insert: {
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          festival_id?: string | null
          id?: string
          location?: string | null
          name: string
          slug: string
          stages?: string[] | null
        }
        Update: {
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          festival_id?: string | null
          id?: string
          location?: string | null
          name?: string
          slug?: string
          stages?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "events_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
        ]
      }
      festival_genres: {
        Row: {
          festival_id: string
          genre_id: string
        }
        Insert: {
          festival_id: string
          genre_id: string
        }
        Update: {
          festival_id?: string
          genre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "festival_genres_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "festival_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      festivals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          target_id: string
          target_type: Database["public"]["Enums"]["follow_target"]
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_type: Database["public"]["Enums"]["follow_target"]
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["follow_target"]
          user_id?: string
        }
        Relationships: []
      }
      genres: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      saved_sets: {
        Row: {
          created_at: string
          set_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          set_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          set_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_sets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets_search"
            referencedColumns: ["set_id"]
          },
        ]
      }
      set_artists: {
        Row: {
          artist_id: string
          position: number
          set_id: string
        }
        Insert: {
          artist_id: string
          position?: number
          set_id: string
        }
        Update: {
          artist_id?: string
          position?: number
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_artists_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_artists_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets_search"
            referencedColumns: ["set_id"]
          },
        ]
      }
      set_genres: {
        Row: {
          genre_id: string
          set_id: string
        }
        Insert: {
          genre_id: string
          set_id: string
        }
        Update: {
          genre_id?: string
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_genres_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_genres_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets_search"
            referencedColumns: ["set_id"]
          },
        ]
      }
      sets: {
        Row: {
          created_at: string
          duration_seconds: number | null
          event_id: string | null
          id: string
          performed_at: string | null
          slug: string
          stage: string | null
          title: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          event_id?: string | null
          id?: string
          performed_at?: string | null
          slug: string
          stage?: string | null
          title: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          event_id?: string | null
          id?: string
          performed_at?: string | null
          slug?: string
          stage?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          embed_supported: boolean
          id: string
          is_active: boolean
          media_type: Database["public"]["Enums"]["media_type"]
          platform: Database["public"]["Enums"]["platform"]
          quality: string | null
          set_id: string
          source_type: Database["public"]["Enums"]["source_type"]
          url: string
        }
        Insert: {
          created_at?: string
          embed_supported?: boolean
          id?: string
          is_active?: boolean
          media_type?: Database["public"]["Enums"]["media_type"]
          platform: Database["public"]["Enums"]["platform"]
          quality?: string | null
          set_id: string
          source_type?: Database["public"]["Enums"]["source_type"]
          url: string
        }
        Update: {
          created_at?: string
          embed_supported?: boolean
          id?: string
          is_active?: boolean
          media_type?: Database["public"]["Enums"]["media_type"]
          platform?: Database["public"]["Enums"]["platform"]
          quality?: string | null
          set_id?: string
          source_type?: Database["public"]["Enums"]["source_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets_search"
            referencedColumns: ["set_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          autoplay: boolean
          avatar_url: string | null
          created_at: string
          display_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          autoplay?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          autoplay?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          artist_name: string | null
          created_at: string
          description: string | null
          event_name: string | null
          genre: string | null
          id: string
          matched_set_id: string | null
          performed_date: string | null
          processed_at: string | null
          rejection_reason: string | null
          stage: string | null
          status: Database["public"]["Enums"]["submission_status"]
          title: string | null
          url: string
          user_id: string
        }
        Insert: {
          artist_name?: string | null
          created_at?: string
          description?: string | null
          event_name?: string | null
          genre?: string | null
          id?: string
          matched_set_id?: string | null
          performed_date?: string | null
          processed_at?: string | null
          rejection_reason?: string | null
          stage?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          title?: string | null
          url: string
          user_id: string
        }
        Update: {
          artist_name?: string | null
          created_at?: string
          description?: string | null
          event_name?: string | null
          genre?: string | null
          id?: string
          matched_set_id?: string | null
          performed_date?: string | null
          processed_at?: string | null
          rejection_reason?: string | null
          stage?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          title?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_matched_set_id_fkey"
            columns: ["matched_set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_matched_set_id_fkey"
            columns: ["matched_set_id"]
            isOneToOne: false
            referencedRelation: "sets_search"
            referencedColumns: ["set_id"]
          },
        ]
      }
      scraper_runs: {
        Row: {
          id: string
          scraper_name: string
          status: Database["public"]["Enums"]["scraper_status"]
          started_at: string
          completed_at: string | null
          params: Json | null
          stats: Json | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          scraper_name: string
          status?: Database["public"]["Enums"]["scraper_status"]
          started_at?: string
          completed_at?: string | null
          params?: Json | null
          stats?: Json | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          scraper_name?: string
          status?: Database["public"]["Enums"]["scraper_status"]
          started_at?: string
          completed_at?: string | null
          params?: Json | null
          stats?: Json | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      scraper_entity_map: {
        Row: {
          id: string
          scraper_name: string
          external_id: string
          entity_type: string
          internal_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scraper_name: string
          external_id: string
          entity_type: string
          internal_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scraper_name?: string
          external_id?: string
          entity_type?: string
          internal_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tracklist_entries: {
        Row: {
          created_at: string
          id: string
          position: number
          set_id: string
          timestamp_seconds: number | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          position: number
          set_id: string
          timestamp_seconds?: number | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          set_id?: string
          timestamp_seconds?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracklist_entries_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracklist_entries_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets_search"
            referencedColumns: ["set_id"]
          },
        ]
      }
    }
    Views: {
      sets_search: {
        Row: {
          artist_names: string[] | null
          artist_slugs: string[] | null
          duration_seconds: number | null
          event_name: string | null
          event_slug: string | null
          festival_name: string | null
          festival_slug: string | null
          genre_names: string[] | null
          performed_at: string | null
          search_text: string | null
          search_vector: unknown
          set_id: string | null
          slug: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      refresh_search_view: { Args: never; Returns: undefined }
      search_sets: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          rank: number
          set_id: string
        }[]
      }
      find_similar_artists_by_name: {
        Args: { search_name: string; similarity_threshold?: number }
        Returns: {
          artist_id: string
          artist_name: string
          sim: number
        }[]
      }
      find_similar_artists: {
        Args: { similarity_threshold?: number }
        Returns: {
          artist1_id: string
          artist1_name: string
          artist2_id: string
          artist2_name: string
          sim: number
        }[]
      }
      merge_artists: {
        Args: { canonical_id: string; duplicate_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      follow_target: "artist" | "festival" | "genre"
      media_type: "video" | "audio"
      platform: "youtube" | "soundcloud"
      source_type: "official" | "artist" | "fan"
      submission_status: "pending" | "approved" | "rejected"
      user_role: "viewer" | "artist" | "festival_manager" | "site_admin"
      scraper_status: "running" | "completed" | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      follow_target: ["artist", "festival", "genre"],
      media_type: ["video", "audio"],
      platform: ["youtube", "soundcloud"],
      source_type: ["official", "artist", "fan"],
      submission_status: ["pending", "approved", "rejected"],
      user_role: ["viewer", "artist", "festival_manager", "site_admin"],
      scraper_status: ["running", "completed", "failed"],
    },
  },
} as const

