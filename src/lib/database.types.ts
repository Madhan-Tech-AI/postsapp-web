/**
 * PostsApp — TypeScript database types
 * Matches migrations 001-007.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'reader' | 'author' | 'editor' | 'super_admin'
export type LanguageCode = 'en' | 'ta'
export type ArticleStatus = 'draft' | 'published' | 'archived'
export type MediaType = 'image' | 'youtube_embed'
export type AuditAction =
  | 'article_publish'
  | 'article_unpublish'
  | 'article_archive'
  | 'article_delete'
  | 'article_create'
  | 'article_edit'
  | 'role_change'
  | 'user_activate'
  | 'user_deactivate'
  | 'user_invite'
  | 'user_delete'
  | 'category_create'
  | 'category_update'
  | 'category_delete'
  | 'tag_create'
  | 'tag_delete'
  | 'media_delete'
  | 'site_setting_change'
  | 'failed_privilege_attempt'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          role: UserRole
          is_active: boolean
          preferred_language: LanguageCode
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          role?: UserRole
          is_active?: boolean
          preferred_language?: LanguageCode
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          role?: UserRole
          is_active?: boolean
          preferred_language?: LanguageCode
          updated_at?: string
        }
        Relationships: []
      }
      author_profiles: {
        Row: {
          id: string
          user_id: string
          bio: string | null
          photo_path: string | null
          twitter_url: string | null
          facebook_url: string | null
          website_url: string | null
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bio?: string | null
          photo_path?: string | null
          twitter_url?: string | null
          facebook_url?: string | null
          website_url?: string | null
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          photo_path?: string | null
          twitter_url?: string | null
          facebook_url?: string | null
          website_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          group_key: string
          language: LanguageCode
          name: string
          slug: string
          parent_id: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_key: string
          language: LanguageCode
          name: string
          slug: string
          parent_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          group_key: string
          language: LanguageCode
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          group_key: string
          language: LanguageCode
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          id: string
          translation_group_id: string
          language: LanguageCode
          title: string
          subtitle: string | null
          short_description: string | null
          slug: string
          content_json: Json
          content_text: string
          cover_image_path: string | null
          cover_image_alt: string | null
          author_id: string
          status: ArticleStatus
          published_at: string | null
          first_published_at: string | null
          updated_at: string
          created_at: string
          reading_time_minutes: number
          seo_title: string | null
          seo_description: string | null
          canonical_url: string | null
          view_count: number
          like_count: number
          search_vector: unknown | null
        }
        Insert: {
          id?: string
          translation_group_id?: string
          language: LanguageCode
          title: string
          subtitle?: string | null
          short_description?: string | null
          slug: string
          content_json?: Json
          content_text?: string
          cover_image_path?: string | null
          cover_image_alt?: string | null
          author_id: string
          status?: ArticleStatus
          published_at?: string | null
          first_published_at?: string | null
          reading_time_minutes?: number
          seo_title?: string | null
          seo_description?: string | null
          canonical_url?: string | null
        }
        Update: {
          title?: string
          subtitle?: string | null
          short_description?: string | null
          slug?: string
          content_json?: Json
          content_text?: string
          cover_image_path?: string | null
          cover_image_alt?: string | null
          status?: ArticleStatus
          published_at?: string | null
          first_published_at?: string | null
          updated_at?: string
          reading_time_minutes?: number
          seo_title?: string | null
          seo_description?: string | null
          canonical_url?: string | null
        }
        Relationships: []
      }
      article_translations: {
        Row: {
          id: string
          translation_group_id: string
          article_id: string
          language: LanguageCode
          created_at: string
        }
        Insert: {
          id?: string
          translation_group_id: string
          article_id: string
          language: LanguageCode
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      article_categories: {
        Row: {
          id: string
          article_id: string
          category_id: string
          is_primary: boolean
        }
        Insert: {
          id?: string
          article_id: string
          category_id: string
          is_primary?: boolean
        }
        Update: {
          is_primary?: boolean
        }
        Relationships: []
      }
      article_tags: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      article_media: {
        Row: {
          id: string
          article_id: string | null
          uploader_id: string
          media_type: MediaType
          storage_path: string | null
          mime_type: string | null
          file_size_bytes: number | null
          alt_text: string | null
          caption: string | null
          youtube_video_id: string | null
          width: number | null
          height: number | null
          created_at: string
        }
        Insert: {
          id?: string
          article_id?: string | null
          uploader_id: string
          media_type: MediaType
          storage_path?: string | null
          mime_type?: string | null
          file_size_bytes?: number | null
          alt_text?: string | null
          caption?: string | null
          youtube_video_id?: string | null
          width?: number | null
          height?: number | null
          created_at?: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          article_id?: string | null
        }
        Relationships: []
      }
      article_likes: {
        Row: {
          id: string
          article_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          article_id: string
          user_id: string
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      article_views: {
        Row: {
          id: string
          article_id: string
          visitor_hash: string | null
          session_id: string | null
          user_id: string | null
          recorded_at: string
          dedup_window_key: string
        }
        Insert: {
          id?: string
          article_id: string
          visitor_hash?: string | null
          session_id?: string | null
          user_id?: string | null
          recorded_at?: string
          dedup_window_key: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      article_revisions: {
        Row: {
          id: string
          article_id: string
          editor_id: string
          content_json: Json
          title: string
          status: ArticleStatus
          created_at: string
          note: string | null
        }
        Insert: {
          id?: string
          article_id: string
          editor_id: string
          content_json: Json
          title: string
          status: ArticleStatus
          created_at?: string
          note?: string | null
        }
        Update: Record<string, never>
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          value?: Json
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: AuditAction
          target_type: string | null
          target_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: AuditAction
          target_type?: string | null
          target_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: {
      published_articles: {
        Row: {
          id: string
          translation_group_id: string
          language: LanguageCode
          title: string
          subtitle: string | null
          short_description: string | null
          slug: string
          content_json: Json
          content_text: string
          cover_image_path: string | null
          cover_image_alt: string | null
          author_id: string
          status: 'published'
          published_at: string
          first_published_at: string
          updated_at: string
          created_at: string
          reading_time_minutes: number
          seo_title: string | null
          seo_description: string | null
          canonical_url: string | null
          view_count: number
          like_count: number
          author_bio: string | null
          author_slug: string | null
          author_display_name: string
          author_avatar_url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      record_article_view: {
        Args: {
          p_article_id: string
          p_visitor_hash?: string | null
          p_session_id?: string | null
          p_dedup_window_key?: string | null
        }
        Returns: void
      }
      toggle_article_like: {
        Args: { p_article_id: string }
        Returns: string
      }
      change_user_role: {
        Args: { p_target_user_id: string; p_new_role: UserRole }
        Returns: void
      }
      current_user_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
      is_author: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_editor: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      language_code: LanguageCode
      article_status: ArticleStatus
      media_type: MediaType
      audit_action: AuditAction
    }
  }
}
