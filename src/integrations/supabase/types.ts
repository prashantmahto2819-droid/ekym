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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          clicks: number
          created_at: string
          created_by: string | null
          creative_image: string | null
          creative_text: string | null
          creative_text_hi: string | null
          ends_on: string | null
          id: string
          impressions: number
          link_url: string | null
          organization_id: string
          party_id: string | null
          price: number
          slots: string[]
          sponsor_email: string | null
          sponsor_name: string
          sponsor_phone: string | null
          starts_on: string
          status: string
          title: string
          updated_at: string
          voucher_id: string | null
          weight: number
        }
        Insert: {
          clicks?: number
          created_at?: string
          created_by?: string | null
          creative_image?: string | null
          creative_text?: string | null
          creative_text_hi?: string | null
          ends_on?: string | null
          id?: string
          impressions?: number
          link_url?: string | null
          organization_id: string
          party_id?: string | null
          price?: number
          slots?: string[]
          sponsor_email?: string | null
          sponsor_name: string
          sponsor_phone?: string | null
          starts_on?: string
          status?: string
          title: string
          updated_at?: string
          voucher_id?: string | null
          weight?: number
        }
        Update: {
          clicks?: number
          created_at?: string
          created_by?: string | null
          creative_image?: string | null
          creative_text?: string | null
          creative_text_hi?: string | null
          ends_on?: string | null
          id?: string
          impressions?: number
          link_url?: string | null
          organization_id?: string
          party_id?: string | null
          price?: number
          slots?: string[]
          sponsor_email?: string | null
          sponsor_name?: string
          sponsor_phone?: string | null
          starts_on?: string
          status?: string
          title?: string
          updated_at?: string
          voucher_id?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "fin_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "fin_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_revenue: {
        Row: {
          amount: number
          created_at: string
          id: string
          month: string
          note: string | null
          organization_id: string
          source: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          month: string
          note?: string | null
          organization_id: string
          source: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          month?: string
          note?: string | null
          organization_id?: string
          source?: string
        }
        Relationships: []
      }
      ad_settings: {
        Row: {
          ads_txt: string | null
          adsense_client: string | null
          adsense_slots: Json
          consent_banner: boolean
          consent_text: string | null
          consent_text_hi: string | null
          enabled: boolean
          excluded_paths: string[]
          organization_id: string
          slots: Json
          updated_at: string
        }
        Insert: {
          ads_txt?: string | null
          adsense_client?: string | null
          adsense_slots?: Json
          consent_banner?: boolean
          consent_text?: string | null
          consent_text_hi?: string | null
          enabled?: boolean
          excluded_paths?: string[]
          organization_id: string
          slots?: Json
          updated_at?: string
        }
        Update: {
          ads_txt?: string | null
          adsense_client?: string | null
          adsense_slots?: Json
          consent_banner?: boolean
          consent_text?: string | null
          consent_text_hi?: string | null
          enabled?: boolean
          excluded_paths?: string[]
          organization_id?: string
          slots?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ad_stats: {
        Row: {
          campaign_id: string
          clicks: number
          day: string
          impressions: number
          organization_id: string
          slot: string
        }
        Insert: {
          campaign_id: string
          clicks?: number
          day?: string
          impressions?: number
          organization_id: string
          slot: string
        }
        Update: {
          campaign_id?: string
          clicks?: number
          day?: string
          impressions?: number
          organization_id?: string
          slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_stats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_regions: {
        Row: {
          admin_id: string
          region_id: string
        }
        Insert: {
          admin_id: string
          region_id: string
        }
        Update: {
          admin_id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "social_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_villages: {
        Row: {
          admin_id: string
          village_id: string
        }
        Insert: {
          admin_id: string
          village_id: string
        }
        Update: {
          admin_id?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_villages_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_villages_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          module: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          module: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          module?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blogs: {
        Row: {
          author_id: string | null
          author_name: string | null
          category_id: string | null
          central_status: string
          city: string | null
          content: string | null
          content_hi: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          excerpt_hi: string | null
          featured: boolean
          featured_image: string | null
          gallery: Json
          id: string
          og_description: string | null
          og_image: string | null
          og_title: string | null
          organization_id: string
          published_at: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seo_description: string | null
          seo_title: string | null
          seva_project_id: string | null
          slug: string
          state: string | null
          status: Database["public"]["Enums"]["content_status"]
          submitted_at: string | null
          tags: string[]
          title: string
          title_hi: string | null
          updated_at: string
          updated_by: string | null
          video_url: string | null
          views: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          central_status?: string
          city?: string | null
          content?: string | null
          content_hi?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          excerpt_hi?: string | null
          featured?: boolean
          featured_image?: string | null
          gallery?: Json
          id?: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          organization_id: string
          published_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_description?: string | null
          seo_title?: string | null
          seva_project_id?: string | null
          slug: string
          state?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          submitted_at?: string | null
          tags?: string[]
          title: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
          views?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          central_status?: string
          city?: string | null
          content?: string | null
          content_hi?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          excerpt_hi?: string | null
          featured?: boolean
          featured_image?: string | null
          gallery?: Json
          id?: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          organization_id?: string
          published_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_description?: string | null
          seo_title?: string | null
          seva_project_id?: string | null
          slug?: string
          state?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          submitted_at?: string | null
          tags?: string[]
          title?: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "blogs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cms_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blogs_seva_project_id_fkey"
            columns: ["seva_project_id"]
            isOneToOne: false
            referencedRelation: "seva_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_donors: {
        Row: {
          area: string | null
          blood_group: string
          city: string | null
          consent: boolean
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          district: string | null
          donor_id: string | null
          eligible_from: string | null
          email: string | null
          emergency_available: boolean
          full_name: string
          gender: string | null
          id: string
          last_donation_date: string | null
          medical_notes: string | null
          mobile: string
          organization_id: string
          pincode: string | null
          preferred_component: string
          state: string | null
          status: string
          total_donations: number
          updated_at: string
          updated_by: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          area?: string | null
          blood_group: string
          city?: string | null
          consent?: boolean
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          district?: string | null
          donor_id?: string | null
          eligible_from?: string | null
          email?: string | null
          emergency_available?: boolean
          full_name: string
          gender?: string | null
          id?: string
          last_donation_date?: string | null
          medical_notes?: string | null
          mobile: string
          organization_id: string
          pincode?: string | null
          preferred_component?: string
          state?: string | null
          status?: string
          total_donations?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          area?: string | null
          blood_group?: string
          city?: string | null
          consent?: boolean
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          district?: string | null
          donor_id?: string | null
          eligible_from?: string | null
          email?: string | null
          emergency_available?: boolean
          full_name?: string
          gender?: string | null
          id?: string
          last_donation_date?: string | null
          medical_notes?: string | null
          mobile?: string
          organization_id?: string
          pincode?: string | null
          preferred_component?: string
          state?: string | null
          status?: string
          total_donations?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      blood_requirements: {
        Row: {
          blood_group: string
          city: string | null
          component: string
          created_at: string
          created_by: string | null
          district: string | null
          expires_at: string | null
          hospital: string
          hospital_contact: string | null
          id: string
          notes: string | null
          organization_id: string
          patient_age: number | null
          patient_name: string
          public_visibility: boolean
          requester_mobile: string
          requester_name: string
          requester_whatsapp: string | null
          required_date: string | null
          requirement_id: string | null
          requisition_slip: string | null
          state: string | null
          units_required: number
          updated_at: string
          updated_by: string | null
          urgency: string
          verification_status: string
          verified_by: string | null
        }
        Insert: {
          blood_group: string
          city?: string | null
          component?: string
          created_at?: string
          created_by?: string | null
          district?: string | null
          expires_at?: string | null
          hospital: string
          hospital_contact?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          patient_age?: number | null
          patient_name: string
          public_visibility?: boolean
          requester_mobile: string
          requester_name: string
          requester_whatsapp?: string | null
          required_date?: string | null
          requirement_id?: string | null
          requisition_slip?: string | null
          state?: string | null
          units_required?: number
          updated_at?: string
          updated_by?: string | null
          urgency?: string
          verification_status?: string
          verified_by?: string | null
        }
        Update: {
          blood_group?: string
          city?: string | null
          component?: string
          created_at?: string
          created_by?: string | null
          district?: string | null
          expires_at?: string | null
          hospital?: string
          hospital_contact?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          patient_age?: number | null
          patient_name?: string
          public_visibility?: boolean
          requester_mobile?: string
          requester_name?: string
          requester_whatsapp?: string | null
          required_date?: string | null
          requirement_id?: string | null
          requisition_slip?: string | null
          state?: string | null
          units_required?: number
          updated_at?: string
          updated_by?: string | null
          urgency?: string
          verification_status?: string
          verified_by?: string | null
        }
        Relationships: []
      }
      book_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          name_hi: string | null
          organization_id: string
          slug: string
          title_hi: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          name_hi?: string | null
          organization_id: string
          slug: string
          title_hi?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          name_hi?: string | null
          organization_id?: string
          slug?: string
          title_hi?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      book_donation_requests: {
        Row: {
          address: string | null
          admin_notes: string | null
          book_count: number | null
          categories: string[] | null
          city: string | null
          condition: string | null
          created_at: string
          created_by: string | null
          description: string | null
          district: string | null
          donor_name: string
          email: string | null
          id: string
          images: Json
          mobile: string
          organization_id: string
          pickup_required: boolean
          pincode: string | null
          preferred_date: string | null
          request_id: string | null
          state: string | null
          status: string
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          book_count?: number | null
          categories?: string[] | null
          city?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          district?: string | null
          donor_name: string
          email?: string | null
          id?: string
          images?: Json
          mobile: string
          organization_id: string
          pickup_required?: boolean
          pincode?: string | null
          preferred_date?: string | null
          request_id?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          book_count?: number | null
          categories?: string[] | null
          city?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          district?: string | null
          donor_name?: string
          email?: string | null
          id?: string
          images?: Json
          mobile?: string
          organization_id?: string
          pickup_required?: boolean
          pincode?: string | null
          preferred_date?: string | null
          request_id?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string | null
          available_quantity: number
          book_id: string | null
          category_id: string | null
          class_level: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          edition: string | null
          id: string
          isbn: string | null
          language: string | null
          location: string | null
          organization_id: string
          publisher: string | null
          quantity: number
          shelf: string | null
          status: string
          subject: string | null
          subtitle: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author?: string | null
          available_quantity?: number
          book_id?: string | null
          category_id?: string | null
          class_level?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          edition?: string | null
          id?: string
          isbn?: string | null
          language?: string | null
          location?: string | null
          organization_id: string
          publisher?: string | null
          quantity?: number
          shelf?: string | null
          status?: string
          subject?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author?: string | null
          available_quantity?: number
          book_id?: string | null
          category_id?: string | null
          class_level?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          edition?: string | null
          id?: string
          isbn?: string | null
          language?: string | null
          location?: string | null
          organization_id?: string
          publisher?: string | null
          quantity?: number
          shelf?: string | null
          status?: string
          subject?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "book_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          beneficiary: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_hi: string | null
          end_date: string | null
          id: string
          location: string | null
          organization_id: string
          raised_amount: number
          seo_description: string | null
          seo_title: string | null
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["content_status"]
          target_amount: number | null
          title: string
          title_hi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          beneficiary?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          organization_id: string
          raised_amount?: number
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          target_amount?: number | null
          title: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          beneficiary?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          organization_id?: string
          raised_amount?: number
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          target_amount?: number | null
          title?: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cm_listings: {
        Row: {
          address: string | null
          admin_note: string | null
          body: string | null
          body_hi: string | null
          category: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          district: string | null
          email: string | null
          expires_at: string | null
          featured: boolean
          fields: Json
          id: string
          image: string | null
          kind: string
          organization_id: string
          phone: string | null
          state: string | null
          status: string
          submitted_by: string | null
          title: string
          title_hi: string | null
          updated_at: string
          views: number
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_note?: string | null
          body?: string | null
          body_hi?: string | null
          category?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          district?: string | null
          email?: string | null
          expires_at?: string | null
          featured?: boolean
          fields?: Json
          id?: string
          image?: string | null
          kind: string
          organization_id: string
          phone?: string | null
          state?: string | null
          status?: string
          submitted_by?: string | null
          title: string
          title_hi?: string | null
          updated_at?: string
          views?: number
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_note?: string | null
          body?: string | null
          body_hi?: string | null
          category?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          district?: string | null
          email?: string | null
          expires_at?: string | null
          featured?: boolean
          fields?: Json
          id?: string
          image?: string | null
          kind?: string
          organization_id?: string
          phone?: string | null
          state?: string | null
          status?: string
          submitted_by?: string | null
          title?: string
          title_hi?: string | null
          updated_at?: string
          views?: number
          website?: string | null
        }
        Relationships: []
      }
      cm_matrimony_interests: {
        Row: {
          created_at: string
          decided_at: string | null
          from_profile: string
          id: string
          status: string
          to_profile: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          from_profile: string
          id?: string
          status?: string
          to_profile: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          from_profile?: string
          id?: string
          status?: string
          to_profile?: string
        }
        Relationships: [
          {
            foreignKeyName: "cm_matrimony_interests_from_profile_fkey"
            columns: ["from_profile"]
            isOneToOne: false
            referencedRelation: "cm_matrimony_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cm_matrimony_interests_to_profile_fkey"
            columns: ["to_profile"]
            isOneToOne: false
            referencedRelation: "cm_matrimony_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_matrimony_profiles: {
        Row: {
          about: string | null
          birth_year: number
          city: string | null
          consent_at: string
          contact_phone: string
          created_at: string
          created_for: string
          display_name: string
          district: string | null
          education: string | null
          expectations: string | null
          family_id: string | null
          gender: string
          gotra: string | null
          height_cm: number | null
          id: string
          income_range: string | null
          interests: string | null
          native_place: string | null
          organization_id: string
          photo_path: string | null
          photos: string[]
          profession: string | null
          special_note: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          about?: string | null
          birth_year: number
          city?: string | null
          consent_at?: string
          contact_phone: string
          created_at?: string
          created_for?: string
          display_name: string
          district?: string | null
          education?: string | null
          expectations?: string | null
          family_id?: string | null
          gender: string
          gotra?: string | null
          height_cm?: number | null
          id?: string
          income_range?: string | null
          interests?: string | null
          native_place?: string | null
          organization_id: string
          photo_path?: string | null
          photos?: string[]
          profession?: string | null
          special_note?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          about?: string | null
          birth_year?: number
          city?: string | null
          consent_at?: string
          contact_phone?: string
          created_at?: string
          created_for?: string
          display_name?: string
          district?: string | null
          education?: string | null
          expectations?: string | null
          family_id?: string | null
          gender?: string
          gotra?: string | null
          height_cm?: number | null
          id?: string
          income_range?: string | null
          interests?: string | null
          native_place?: string | null
          organization_id?: string
          photo_path?: string | null
          photos?: string[]
          profession?: string | null
          special_note?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cm_matrimony_profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_notifications: {
        Row: {
          actor_id: string | null
          comment_id: string | null
          created_at: string
          id: string
          kind: string
          organization_id: string
          post_id: string | null
          read_at: string | null
          text: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          kind: string
          organization_id: string
          post_id?: string | null
          read_at?: string | null
          text?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string
          post_id?: string | null
          read_at?: string | null
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cm_notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "cm_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cm_notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_polls: {
        Row: {
          anonymous: boolean
          audience: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          multi: boolean
          open_results: boolean
          options: Json
          organization_id: string
          question: string
          question_hi: string | null
          starts_at: string
          status: string
        }
        Insert: {
          anonymous?: boolean
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          multi?: boolean
          open_results?: boolean
          options?: Json
          organization_id: string
          question: string
          question_hi?: string | null
          starts_at?: string
          status?: string
        }
        Update: {
          anonymous?: boolean
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          multi?: boolean
          open_results?: boolean
          options?: Json
          organization_id?: string
          question?: string
          question_hi?: string | null
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      cm_post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          organization_id: string
          parent_id: string | null
          post_id: string
          status: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          organization_id: string
          parent_id?: string | null
          post_id: string
          status?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          parent_id?: string | null
          post_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cm_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cm_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cm_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cm_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_post_reports: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          organization_id: string
          post_id: string | null
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          post_id?: string | null
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cm_post_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "cm_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cm_post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cm_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_posts: {
        Row: {
          as_org: string | null
          author_id: string
          body: string | null
          comment_count: number
          created_at: string
          id: string
          like_count: number
          link_kind: string | null
          link_url: string | null
          media: Json
          moderated_at: string | null
          moderation: Json
          moderation_status: string
          organization_id: string
          pinned: boolean
          reach: string
          share_count: number
          status: string
          tags: string[]
          updated_at: string
          visibility: string
        }
        Insert: {
          as_org?: string | null
          author_id: string
          body?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          link_kind?: string | null
          link_url?: string | null
          media?: Json
          moderated_at?: string | null
          moderation?: Json
          moderation_status?: string
          organization_id: string
          pinned?: boolean
          reach?: string
          share_count?: number
          status?: string
          tags?: string[]
          updated_at?: string
          visibility?: string
        }
        Update: {
          as_org?: string | null
          author_id?: string
          body?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          link_kind?: string | null
          link_url?: string | null
          media?: Json
          moderated_at?: string | null
          moderation?: Json
          moderation_status?: string
          organization_id?: string
          pinned?: boolean
          reach?: string
          share_count?: number
          status?: string
          tags?: string[]
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      cm_settings: {
        Row: {
          ai_min_confidence: number
          auto_limit: boolean
          keywords: string[]
          notify_moderators: boolean
          organization_id: string
          threshold: number
          updated_at: string
        }
        Insert: {
          ai_min_confidence?: number
          auto_limit?: boolean
          keywords?: string[]
          notify_moderators?: boolean
          organization_id: string
          threshold?: number
          updated_at?: string
        }
        Update: {
          ai_min_confidence?: number
          auto_limit?: boolean
          keywords?: string[]
          notify_moderators?: boolean
          organization_id?: string
          threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      cm_votes: {
        Row: {
          choices: string[]
          created_at: string
          id: string
          poll_id: string
          voter_id: string
        }
        Insert: {
          choices: string[]
          created_at?: string
          id?: string
          poll_id: string
          voter_id: string
        }
        Update: {
          choices?: string[]
          created_at?: string
          id?: string
          poll_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cm_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "cm_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_categories: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          name_hi: string | null
          organization_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name: string
          name_hi?: string | null
          organization_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          name_hi?: string | null
          organization_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      cms_comments: {
        Row: {
          body: string
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string
          post_id: string
          post_kind: string
          status: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id: string
          post_id: string
          post_kind: string
          status?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string
          post_id?: string
          post_kind?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cms_menus: {
        Row: {
          id: string
          items: Json
          location: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          items?: Json
          location: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          items?: Json
          location?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_page_revisions: {
        Row: {
          blocks: Json
          id: string
          organization_id: string
          page_id: string
          saved_at: string
          saved_by: string | null
          title: string
        }
        Insert: {
          blocks: Json
          id?: string
          organization_id: string
          page_id: string
          saved_at?: string
          saved_by?: string | null
          title: string
        }
        Update: {
          blocks?: Json
          id?: string
          organization_id?: string
          page_id?: string
          saved_at?: string
          saved_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_page_revisions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          blocks: Json
          created_at: string
          created_by: string | null
          id: string
          is_home: boolean
          menu_order: number
          organization_id: string
          publish_at: string | null
          seo: Json
          show_in_menu: boolean
          slug: string
          status: string
          title: string
          title_hi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_home?: boolean
          menu_order?: number
          organization_id: string
          publish_at?: string | null
          seo?: Json
          show_in_menu?: boolean
          slug: string
          status?: string
          title: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_home?: boolean
          menu_order?: number
          organization_id?: string
          publish_at?: string | null
          seo?: Json
          show_in_menu?: boolean
          slug?: string
          status?: string
          title?: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      comms_campaigns: {
        Row: {
          audience: Json
          channel_id: string | null
          created_at: string
          created_by: string | null
          failed: number
          id: string
          name: string
          organization_id: string
          purpose: string
          schedule_at: string | null
          sent: number
          status: string
          template_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          audience?: Json
          channel_id?: string | null
          created_at?: string
          created_by?: string | null
          failed?: number
          id?: string
          name: string
          organization_id: string
          purpose?: string
          schedule_at?: string | null
          sent?: number
          status?: string
          template_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          audience?: Json
          channel_id?: string | null
          created_at?: string
          created_by?: string | null
          failed?: number
          id?: string
          name?: string
          organization_id?: string
          purpose?: string
          schedule_at?: string | null
          sent?: number
          status?: string
          template_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comms_campaigns_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "comms_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "comms_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      comms_channels: {
        Row: {
          config: Json
          created_at: string
          daily_limit: number
          gap_max_s: number
          gap_min_s: number
          id: string
          is_default: boolean
          kind: string
          last_error: string | null
          name: string
          organization_id: string
          provider: string
          secret_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          daily_limit?: number
          gap_max_s?: number
          gap_min_s?: number
          id?: string
          is_default?: boolean
          kind: string
          last_error?: string | null
          name: string
          organization_id: string
          provider: string
          secret_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          daily_limit?: number
          gap_max_s?: number
          gap_min_s?: number
          id?: string
          is_default?: boolean
          kind?: string
          last_error?: string | null
          name?: string
          organization_id?: string
          provider?: string
          secret_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      comms_consents: {
        Row: {
          contact: string
          given_at: string
          id: string
          name: string | null
          organization_id: string
          purposes: string[]
          source: string
          user_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          contact: string
          given_at?: string
          id?: string
          name?: string | null
          organization_id: string
          purposes?: string[]
          source?: string
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          contact?: string
          given_at?: string
          id?: string
          name?: string | null
          organization_id?: string
          purposes?: string[]
          source?: string
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      comms_messages: {
        Row: {
          attempts: number
          body: string
          campaign_id: string | null
          channel_id: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          error: string | null
          id: string
          kind: string
          lock_until: string | null
          max_attempts: number
          media: Json
          meta_template: Json | null
          next_attempt_at: string
          organization_id: string
          provider_message_id: string | null
          purpose: string
          read_at: string | null
          ref_id: string | null
          ref_table: string | null
          sent_at: string | null
          status: string
          subject: string | null
          to_contact: string
          to_name: string | null
        }
        Insert: {
          attempts?: number
          body: string
          campaign_id?: string | null
          channel_id?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          kind: string
          lock_until?: string | null
          max_attempts?: number
          media?: Json
          meta_template?: Json | null
          next_attempt_at?: string
          organization_id: string
          provider_message_id?: string | null
          purpose?: string
          read_at?: string | null
          ref_id?: string | null
          ref_table?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          to_contact: string
          to_name?: string | null
        }
        Update: {
          attempts?: number
          body?: string
          campaign_id?: string | null
          channel_id?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          error?: string | null
          id?: string
          kind?: string
          lock_until?: string | null
          max_attempts?: number
          media?: Json
          meta_template?: Json | null
          next_attempt_at?: string
          organization_id?: string
          provider_message_id?: string | null
          purpose?: string
          read_at?: string | null
          ref_id?: string | null
          ref_table?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          to_contact?: string
          to_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comms_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "comms_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comms_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "comms_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      comms_opt_outs: {
        Row: {
          contact: string
          created_at: string
          id: string
          organization_id: string | null
          reason: string | null
        }
        Insert: {
          contact: string
          created_at?: string
          id?: string
          organization_id?: string | null
          reason?: string | null
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      comms_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          kind: string
          language: string
          meta_status: string | null
          meta_template_name: string | null
          name: string
          organization_id: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          kind: string
          language?: string
          meta_status?: string | null
          meta_template_name?: string | null
          name: string
          organization_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          kind?: string
          language?: string
          meta_status?: string | null
          meta_template_name?: string | null
          name?: string
          organization_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          handled_by: string | null
          id: string
          message: string
          mobile: string | null
          name: string
          organization_id: string
          state: string | null
          status: string
          subject: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          handled_by?: string | null
          id?: string
          message: string
          mobile?: string | null
          name: string
          organization_id: string
          state?: string | null
          status?: string
          subject?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          handled_by?: string | null
          id?: string
          message?: string
          mobile?: string | null
          name?: string
          organization_id?: string
          state?: string | null
          status?: string
          subject?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contributors: {
        Row: {
          active: boolean
          contribution_date: string
          contribution_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_publicly: boolean
          id: string
          location: string | null
          name: string
          organization: string | null
          organization_id: string
          photo: string | null
          recognition_message: string | null
          seva_project_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          contribution_date?: string
          contribution_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_publicly?: boolean
          id?: string
          location?: string | null
          name: string
          organization?: string | null
          organization_id: string
          photo?: string | null
          recognition_message?: string | null
          seva_project_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          contribution_date?: string
          contribution_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_publicly?: boolean
          id?: string
          location?: string | null
          name?: string
          organization?: string | null
          organization_id?: string
          photo?: string | null
          recognition_message?: string | null
          seva_project_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributors_seva_project_id_fkey"
            columns: ["seva_project_id"]
            isOneToOne: false
            referencedRelation: "seva_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_dispatches: {
        Row: {
          channel: string
          created_by: string | null
          document_id: string
          id: string
          message_id: string | null
          note: string | null
          organization_id: string
          sent_at: string
          status: string
          to_contact: string | null
          to_name: string | null
        }
        Insert: {
          channel: string
          created_by?: string | null
          document_id: string
          id?: string
          message_id?: string | null
          note?: string | null
          organization_id: string
          sent_at?: string
          status?: string
          to_contact?: string | null
          to_name?: string | null
        }
        Update: {
          channel?: string
          created_by?: string | null
          document_id?: string
          id?: string
          message_id?: string | null
          note?: string | null
          organization_id?: string
          sent_at?: string
          status?: string
          to_contact?: string | null
          to_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_dispatches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "docs_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          doc_date: string
          fields: Json
          id: string
          issued_at: string | null
          issued_by: string | null
          kind: string
          organization_id: string
          pdf_path: string | null
          recipient: Json
          ref_no: string | null
          signatories: Json
          source_id: string | null
          source_table: string | null
          status: string
          subject: string | null
          submitted_at: string | null
          template_id: string | null
          title: string
          updated_at: string
          verify_code: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          doc_date?: string
          fields?: Json
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          kind: string
          organization_id: string
          pdf_path?: string | null
          recipient?: Json
          ref_no?: string | null
          signatories?: Json
          source_id?: string | null
          source_table?: string | null
          status?: string
          subject?: string | null
          submitted_at?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          verify_code?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          doc_date?: string
          fields?: Json
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          kind?: string
          organization_id?: string
          pdf_path?: string | null
          recipient?: Json
          ref_no?: string | null
          signatories?: Json
          source_id?: string | null
          source_table?: string | null
          status?: string
          subject?: string | null
          submitted_at?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          verify_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "docs_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "docs_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_register: {
        Row: {
          created_at: string
          created_by: string | null
          direction: string
          document_id: string | null
          entry_date: string
          entry_no: string | null
          external_url: string | null
          file_path: string | null
          from_to: string
          id: string
          note: string | null
          organization_id: string
          ref_no: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          direction: string
          document_id?: string | null
          entry_date?: string
          entry_no?: string | null
          external_url?: string | null
          file_path?: string | null
          from_to: string
          id?: string
          note?: string | null
          organization_id: string
          ref_no?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          direction?: string
          document_id?: string | null
          entry_date?: string
          entry_no?: string | null
          external_url?: string | null
          file_path?: string | null
          from_to?: string
          id?: string
          note?: string | null
          organization_id?: string
          ref_no?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_register_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "docs_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_templates: {
        Row: {
          created_at: string
          created_by: string | null
          design: Json
          id: string
          is_default: boolean
          kind: string
          name: string
          name_hi: string | null
          organization_id: string | null
          status: string
          thumbnail: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          design: Json
          id?: string
          is_default?: boolean
          kind: string
          name: string
          name_hi?: string | null
          organization_id?: string | null
          status?: string
          thumbnail?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          design?: Json
          id?: string
          is_default?: boolean
          kind?: string
          name?: string
          name_hi?: string | null
          organization_id?: string | null
          status?: string
          thumbnail?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      donation_receipts: {
        Row: {
          amount: number
          created_at: string
          donation_id: string
          financial_year: string | null
          id: string
          issued_on: string
          organization_id: string
          pdf_generated_at: string | null
          receipt_number: string
          storage_path: string | null
          updated_at: string
          verification_code: string
        }
        Insert: {
          amount: number
          created_at?: string
          donation_id: string
          financial_year?: string | null
          id?: string
          issued_on?: string
          organization_id: string
          pdf_generated_at?: string | null
          receipt_number: string
          storage_path?: string | null
          updated_at?: string
          verification_code: string
        }
        Update: {
          amount?: number
          created_at?: string
          donation_id?: string
          financial_year?: string | null
          id?: string
          issued_on?: string
          organization_id?: string
          pdf_generated_at?: string | null
          receipt_number?: string
          storage_path?: string | null
          updated_at?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_receipts_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: true
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          address: string | null
          amount: number
          campaign_id: string | null
          city: string | null
          created_at: string
          currency: string
          district: string | null
          donation_id: string
          donation_type: Database["public"]["Enums"]["donation_type"]
          donor_email: string | null
          donor_mobile: string
          donor_name: string
          donor_user_id: string | null
          donor_whatsapp: string | null
          failure_reason: string | null
          id: string
          is_anonymous: boolean
          message: string | null
          organization_id: string
          paid_at: string | null
          pan: string | null
          payment_method: string | null
          pincode: string | null
          purpose: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          seva_project_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          amount: number
          campaign_id?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          district?: string | null
          donation_id: string
          donation_type?: Database["public"]["Enums"]["donation_type"]
          donor_email?: string | null
          donor_mobile: string
          donor_name: string
          donor_user_id?: string | null
          donor_whatsapp?: string | null
          failure_reason?: string | null
          id?: string
          is_anonymous?: boolean
          message?: string | null
          organization_id: string
          paid_at?: string | null
          pan?: string | null
          payment_method?: string | null
          pincode?: string | null
          purpose?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          seva_project_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          amount?: number
          campaign_id?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          district?: string | null
          donation_id?: string
          donation_type?: Database["public"]["Enums"]["donation_type"]
          donor_email?: string | null
          donor_mobile?: string
          donor_name?: string
          donor_user_id?: string | null
          donor_whatsapp?: string | null
          failure_reason?: string | null
          id?: string
          is_anonymous?: boolean
          message?: string | null
          organization_id?: string
          paid_at?: string | null
          pan?: string | null
          payment_method?: string | null
          pincode?: string | null
          purpose?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          seva_project_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_seva_project_id_fkey"
            columns: ["seva_project_id"]
            isOneToOne: false
            referencedRelation: "seva_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_events: {
        Row: {
          capacity: number | null
          contact_phone: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_hi: string | null
          ends_at: string | null
          id: string
          invitation_template_id: string | null
          kind: string
          map_url: string | null
          organization_id: string
          organizer: string | null
          registration_open: boolean
          slug: string
          starts_at: string
          status: string
          title: string
          title_hi: string | null
          updated_at: string
          venue: string | null
          venue_hi: string | null
        }
        Insert: {
          capacity?: number | null
          contact_phone?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          ends_at?: string | null
          id?: string
          invitation_template_id?: string | null
          kind?: string
          map_url?: string | null
          organization_id: string
          organizer?: string | null
          registration_open?: boolean
          slug: string
          starts_at: string
          status?: string
          title: string
          title_hi?: string | null
          updated_at?: string
          venue?: string | null
          venue_hi?: string | null
        }
        Update: {
          capacity?: number | null
          contact_phone?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          ends_at?: string | null
          id?: string
          invitation_template_id?: string | null
          kind?: string
          map_url?: string | null
          organization_id?: string
          organizer?: string | null
          registration_open?: boolean
          slug?: string
          starts_at?: string
          status?: string
          title?: string
          title_hi?: string | null
          updated_at?: string
          venue?: string | null
          venue_hi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ev_events_invitation_template_id_fkey"
            columns: ["invitation_template_id"]
            isOneToOne: false
            referencedRelation: "docs_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_guests: {
        Row: {
          checkin_at: string | null
          checkin_by: string | null
          created_at: string
          email: string | null
          event_id: string
          group_name: string | null
          id: string
          invited_at: string | null
          membership_id: string | null
          name: string
          organization_id: string
          phone: string | null
          reminded_at: string | null
          rsvp: string
          rsvp_at: string | null
          rsvp_note: string | null
          seats: number
          source: string
          token: string
        }
        Insert: {
          checkin_at?: string | null
          checkin_by?: string | null
          created_at?: string
          email?: string | null
          event_id: string
          group_name?: string | null
          id?: string
          invited_at?: string | null
          membership_id?: string | null
          name: string
          organization_id: string
          phone?: string | null
          reminded_at?: string | null
          rsvp?: string
          rsvp_at?: string | null
          rsvp_note?: string | null
          seats?: number
          source?: string
          token?: string
        }
        Update: {
          checkin_at?: string | null
          checkin_by?: string | null
          created_at?: string
          email?: string | null
          event_id?: string
          group_name?: string | null
          id?: string
          invited_at?: string | null
          membership_id?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          reminded_at?: string | null
          rsvp?: string
          rsvp_at?: string | null
          rsvp_note?: string | null
          seats?: number
          source?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ev_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_guests_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "org_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          admin_note: string | null
          approved_at: string | null
          claimed_at: string | null
          contact_address: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          entered_by_admin: boolean
          family_name: string
          id: string
          main_whatsapp: string
          owner_id: string
          status: string
          status_before: string | null
          submitted_at: string | null
          updated_at: string
          village_id: string | null
        }
        Insert: {
          admin_note?: string | null
          approved_at?: string | null
          claimed_at?: string | null
          contact_address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entered_by_admin?: boolean
          family_name: string
          id?: string
          main_whatsapp: string
          owner_id?: string
          status?: string
          status_before?: string | null
          submitted_at?: string | null
          updated_at?: string
          village_id?: string | null
        }
        Update: {
          admin_note?: string | null
          approved_at?: string | null
          claimed_at?: string | null
          contact_address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          entered_by_admin?: boolean
          family_name?: string
          id?: string
          main_whatsapp?: string
          owner_id?: string
          status?: string
          status_before?: string | null
          submitted_at?: string | null
          updated_at?: string
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "families_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "families_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      family_links: {
        Row: {
          child_family_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          note: string | null
          parent_member_id: string
          requested_by: string
          status: string
        }
        Insert: {
          child_family_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          parent_member_id: string
          requested_by?: string
          status?: string
        }
        Update: {
          child_family_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          parent_member_id?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_links_child_family_id_fkey"
            columns: ["child_family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_links_parent_member_id_fkey"
            columns: ["parent_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_links_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      festival_slides: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          display_order: number
          festival_date: string | null
          festival_name: string
          id: string
          image: string | null
          message: string | null
          message_hi: string | null
          organization_id: string
          title: string | null
          title_hi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          display_order?: number
          festival_date?: string | null
          festival_name: string
          id?: string
          image?: string | null
          message?: string | null
          message_hi?: string | null
          organization_id: string
          title?: string | null
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          display_order?: number
          festival_date?: string | null
          festival_name?: string
          id?: string
          image?: string | null
          message?: string | null
          message_hi?: string | null
          organization_id?: string
          title?: string | null
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fin_accounts: {
        Row: {
          bank_details: Json | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_bank: boolean
          is_cash: boolean
          is_group: boolean
          name: string
          name_hi: string | null
          opening_balance: number
          organization_id: string
          parent_id: string | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          bank_details?: Json | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_bank?: boolean
          is_cash?: boolean
          is_group?: boolean
          name: string
          name_hi?: string | null
          opening_balance?: number
          organization_id: string
          parent_id?: string | null
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          bank_details?: Json | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_bank?: boolean
          is_cash?: boolean
          is_group?: boolean
          name?: string
          name_hi?: string | null
          opening_balance?: number
          organization_id?: string
          parent_id?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_lines: {
        Row: {
          account_id: string
          credit: number
          debit: number
          id: string
          note: string | null
          organization_id: string
          sort_order: number
          voucher_id: string
        }
        Insert: {
          account_id: string
          credit?: number
          debit?: number
          id?: string
          note?: string | null
          organization_id: string
          sort_order?: number
          voucher_id: string
        }
        Update: {
          account_id?: string
          credit?: number
          debit?: number
          id?: string
          note?: string | null
          organization_id?: string
          sort_order?: number
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_lines_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "fin_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_parties: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          kind: string
          membership_id: string | null
          name: string
          organization_id: string
          pan: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          kind?: string
          membership_id?: string | null
          name: string
          organization_id: string
          pan?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          kind?: string
          membership_id?: string | null
          name?: string
          organization_id?: string
          pan?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_parties_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "org_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_vouchers: {
        Row: {
          amount: number
          cancel_reason: string | null
          created_at: string
          created_by: string | null
          document_id: string | null
          fy_id: string | null
          id: string
          instrument: Json
          mode: string | null
          narration: string | null
          number: string | null
          organization_id: string
          party_id: string | null
          party_name: string | null
          posted_at: string | null
          posted_by: string | null
          reversal_of: string | null
          reversed_by: string | null
          source: string
          source_id: string | null
          status: string
          type: string
          updated_at: string
          voucher_date: string
        }
        Insert: {
          amount?: number
          cancel_reason?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          fy_id?: string | null
          id?: string
          instrument?: Json
          mode?: string | null
          narration?: string | null
          number?: string | null
          organization_id: string
          party_id?: string | null
          party_name?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          source?: string
          source_id?: string | null
          status?: string
          type: string
          updated_at?: string
          voucher_date?: string
        }
        Update: {
          amount?: number
          cancel_reason?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          fy_id?: string | null
          id?: string
          instrument?: Json
          mode?: string | null
          narration?: string | null
          number?: string | null
          organization_id?: string
          party_id?: string | null
          party_name?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reversal_of?: string | null
          reversed_by?: string | null
          source?: string
          source_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          voucher_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_vouchers_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "docs_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_vouchers_fy_id_fkey"
            columns: ["fy_id"]
            isOneToOne: false
            referencedRelation: "fin_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_vouchers_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "fin_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_vouchers_reversal_of_fkey"
            columns: ["reversal_of"]
            isOneToOne: false
            referencedRelation: "fin_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_vouchers_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "fin_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_years: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          label: string
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          organization_id: string
          starts_on: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          label: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          organization_id: string
          starts_on: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          label?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          organization_id?: string
          starts_on?: string
        }
        Relationships: []
      }
      galleries: {
        Row: {
          active: boolean
          category: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_hi: string | null
          display_order: number
          event_date: string | null
          id: string
          location: string | null
          organization_id: string
          slug: string
          title: string
          title_hi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          display_order?: number
          event_date?: string | null
          id?: string
          location?: string | null
          organization_id: string
          slug: string
          title: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          category?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          display_order?: number
          event_date?: string | null
          id?: string
          location?: string | null
          organization_id?: string
          slug?: string
          title?: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          gallery_id: string
          id: string
          image: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          gallery_id: string
          id?: string
          image: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          gallery_id?: string
          id?: string
          image?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_agenda_items: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          item_no: number
          meeting_id: string
          organization_id: string
          outcome: string | null
          presenter: string | null
          title: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          item_no?: number
          meeting_id: string
          organization_id: string
          outcome?: string | null
          presenter?: string | null
          title: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          item_no?: number
          meeting_id?: string
          organization_id?: string
          outcome?: string | null
          presenter?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "gov_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_announcements: {
        Row: {
          audience: string
          body: string
          body_hi: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          organization_id: string
          pinned: boolean
          publish_at: string
          title: string
          title_hi: string | null
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          body_hi?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          organization_id: string
          pinned?: boolean
          publish_at?: string
          title: string
          title_hi?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          body_hi?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string
          pinned?: boolean
          publish_at?: string
          title?: string
          title_hi?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gov_committees: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          kind: string
          name: string
          name_hi: string | null
          organization_id: string
          status: string
          tenure_from: string | null
          tenure_to: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          kind?: string
          name: string
          name_hi?: string | null
          organization_id: string
          status?: string
          tenure_from?: string | null
          tenure_to?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          kind?: string
          name?: string
          name_hi?: string | null
          organization_id?: string
          status?: string
          tenure_from?: string | null
          tenure_to?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gov_departments_members: {
        Row: {
          created_at: string
          department_id: string
          id: string
          membership_id: string | null
          organization_id: string
          person_name: string
          role_title: string | null
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          membership_id?: string | null
          organization_id: string
          person_name: string
          role_title?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          membership_id?: string | null
          organization_id?: string
          person_name?: string
          role_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gov_departments_members_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "org_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_meetings: {
        Row: {
          attendance: Json
          committee_id: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          kind: string
          minutes: string | null
          minutes_approved_at: string | null
          minutes_approved_by: string | null
          minutes_status: string
          notice_text: string | null
          online_link: string | null
          organization_id: string
          scheduled_at: string
          status: string
          title: string
          title_hi: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          attendance?: Json
          committee_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          minutes?: string | null
          minutes_approved_at?: string | null
          minutes_approved_by?: string | null
          minutes_status?: string
          notice_text?: string | null
          online_link?: string | null
          organization_id: string
          scheduled_at: string
          status?: string
          title: string
          title_hi?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          attendance?: Json
          committee_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          minutes?: string | null
          minutes_approved_at?: string | null
          minutes_approved_by?: string | null
          minutes_status?: string
          notice_text?: string | null
          online_link?: string | null
          organization_id?: string
          scheduled_at?: string
          status?: string
          title?: string
          title_hi?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gov_meetings_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "gov_committees"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_positions: {
        Row: {
          appointed_by: string
          city: string | null
          committee_id: string
          created_at: string
          designation: string
          designation_hi: string | null
          email: string | null
          from_date: string | null
          id: string
          membership_id: string | null
          organization_id: string
          person_name: string
          person_name_hi: string | null
          phone: string | null
          photo_path: string | null
          rank: number
          show_phone_public: boolean
          show_public: boolean
          to_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          appointed_by?: string
          city?: string | null
          committee_id: string
          created_at?: string
          designation: string
          designation_hi?: string | null
          email?: string | null
          from_date?: string | null
          id?: string
          membership_id?: string | null
          organization_id: string
          person_name: string
          person_name_hi?: string | null
          phone?: string | null
          photo_path?: string | null
          rank?: number
          show_phone_public?: boolean
          show_public?: boolean
          to_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          appointed_by?: string
          city?: string | null
          committee_id?: string
          created_at?: string
          designation?: string
          designation_hi?: string | null
          email?: string | null
          from_date?: string | null
          id?: string
          membership_id?: string | null
          organization_id?: string
          person_name?: string
          person_name_hi?: string | null
          phone?: string | null
          photo_path?: string | null
          rank?: number
          show_phone_public?: boolean
          show_public?: boolean
          to_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gov_positions_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "gov_committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_positions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "org_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_resolutions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          meeting_id: string | null
          number: string | null
          organization_id: string
          proposer: string | null
          resolved_on: string
          result: string
          seconder: string | null
          text: string
          title: string
          updated_at: string
          votes_abstain: number | null
          votes_against: number | null
          votes_for: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id?: string | null
          number?: string | null
          organization_id: string
          proposer?: string | null
          resolved_on?: string
          result?: string
          seconder?: string | null
          text: string
          title: string
          updated_at?: string
          votes_abstain?: number | null
          votes_against?: number | null
          votes_for?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_id?: string | null
          number?: string | null
          organization_id?: string
          proposer?: string | null
          resolved_on?: string
          result?: string
          seconder?: string | null
          text?: string
          title?: string
          updated_at?: string
          votes_abstain?: number | null
          votes_against?: number | null
          votes_for?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gov_resolutions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "gov_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_tasks: {
        Row: {
          assignee_name: string | null
          assignee_user_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          detail: string | null
          done_at: string | null
          due_date: string | null
          id: string
          meeting_id: string | null
          organization_id: string
          priority: string
          resolution_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_name?: string | null
          assignee_user_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          detail?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          organization_id: string
          priority?: string
          resolution_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_name?: string | null
          assignee_user_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          detail?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          organization_id?: string
          priority?: string
          resolution_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "gov_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_tasks_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "gov_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          organization_id: string
          section_key: string
          subtitle: string | null
          subtitle_hi: string | null
          title: string
          title_hi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          organization_id: string
          section_key: string
          subtitle?: string | null
          subtitle_hi?: string | null
          title: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          organization_id?: string
          section_key?: string
          subtitle?: string | null
          subtitle_hi?: string | null
          title?: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      homepage_slides: {
        Row: {
          active: boolean
          button_text: string | null
          button_text_hi: string | null
          button_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_hi: string | null
          display_order: number
          end_date: string | null
          id: string
          image: string | null
          organization_id: string
          start_date: string | null
          subtitle: string | null
          subtitle_hi: string | null
          title: string
          title_hi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          button_text?: string | null
          button_text_hi?: string | null
          button_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          display_order?: number
          end_date?: string | null
          id?: string
          image?: string | null
          organization_id: string
          start_date?: string | null
          subtitle?: string | null
          subtitle_hi?: string | null
          title: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          button_text?: string | null
          button_text_hi?: string | null
          button_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          display_order?: number
          end_date?: string | null
          id?: string
          image?: string | null
          organization_id?: string
          start_date?: string | null
          subtitle?: string | null
          subtitle_hi?: string | null
          title?: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      intern_applications: {
        Row: {
          application_id: string | null
          city: string | null
          college: string | null
          course: string | null
          created_at: string
          created_by: string | null
          district: string | null
          dob: string | null
          duration: string | null
          email: string | null
          expected_output: string | null
          gender: string | null
          id: string
          mobile: string
          name: string
          organization_id: string
          payment_reference: string | null
          payment_status: string
          photo: string | null
          preferred_department: string | null
          program_id: string | null
          proposal: string | null
          research_topic: string | null
          resume: string | null
          review_notes: string | null
          reviewed_by: string | null
          skills: string | null
          state: string | null
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
          whatsapp: string | null
          year: string | null
        }
        Insert: {
          application_id?: string | null
          city?: string | null
          college?: string | null
          course?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          dob?: string | null
          duration?: string | null
          email?: string | null
          expected_output?: string | null
          gender?: string | null
          id?: string
          mobile: string
          name: string
          organization_id: string
          payment_reference?: string | null
          payment_status?: string
          photo?: string | null
          preferred_department?: string | null
          program_id?: string | null
          proposal?: string | null
          research_topic?: string | null
          resume?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          skills?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
          year?: string | null
        }
        Update: {
          application_id?: string | null
          city?: string | null
          college?: string | null
          course?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          dob?: string | null
          duration?: string | null
          email?: string | null
          expected_output?: string | null
          gender?: string | null
          id?: string
          mobile?: string
          name?: string
          organization_id?: string
          payment_reference?: string | null
          payment_status?: string
          photo?: string | null
          preferred_department?: string | null
          program_id?: string | null
          proposal?: string | null
          research_topic?: string | null
          resume?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          skills?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intern_applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "internship_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_programs: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          description_hi: string | null
          display_order: number
          duration: string | null
          eligibility: string | null
          end_date: string | null
          fee: number
          id: string
          kind: string
          name: string
          name_hi: string | null
          organization_id: string
          seats: number | null
          slug: string
          start_date: string | null
          theme: string | null
          title_hi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          description_hi?: string | null
          display_order?: number
          duration?: string | null
          eligibility?: string | null
          end_date?: string | null
          fee?: number
          id?: string
          kind?: string
          name: string
          name_hi?: string | null
          organization_id: string
          seats?: number | null
          slug: string
          start_date?: string | null
          theme?: string | null
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          description_hi?: string | null
          display_order?: number
          duration?: string | null
          eligibility?: string | null
          end_date?: string | null
          fee?: number
          id?: string
          kind?: string
          name?: string
          name_hi?: string | null
          organization_id?: string
          seats?: number | null
          slug?: string
          start_date?: string | null
          theme?: string | null
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      letter_designs: {
        Row: {
          created_at: string
          data: Json
          id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          owner_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "letter_designs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_recipients: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          family_id: string | null
          father_name: string | null
          id: string
          image_path: string | null
          letter_id: string
          member_id: string | null
          phone: string
          recipient_name: string
          sent_at: string | null
          status: string
          village_name: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          family_id?: string | null
          father_name?: string | null
          id?: string
          image_path?: string | null
          letter_id: string
          member_id?: string | null
          phone: string
          recipient_name: string
          sent_at?: string | null
          status?: string
          village_name?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          family_id?: string | null
          father_name?: string | null
          id?: string
          image_path?: string | null
          letter_id?: string
          member_id?: string | null
          phone?: string
          recipient_name?: string
          sent_at?: string | null
          status?: string
          village_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "letter_recipients_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letter_recipients_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letter_recipients_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      letters: {
        Row: {
          admin_note: string | null
          base_image_path: string | null
          ceremony_date: string | null
          created_at: string
          created_by: string
          death_date: string | null
          deceased_name: string
          decided_at: string | null
          decided_by: string | null
          id: string
          last_error: string | null
          lock_until: string | null
          message_template: string | null
          message_text: string | null
          name_box: Json | null
          organization_id: string | null
          send_mode: string
          status: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          admin_note?: string | null
          base_image_path?: string | null
          ceremony_date?: string | null
          created_at?: string
          created_by?: string
          death_date?: string | null
          deceased_name: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          last_error?: string | null
          lock_until?: string | null
          message_template?: string | null
          message_text?: string | null
          name_box?: Json | null
          organization_id?: string | null
          send_mode?: string
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          admin_note?: string | null
          base_image_path?: string | null
          ceremony_date?: string | null
          created_at?: string
          created_by?: string
          death_date?: string | null
          deceased_name?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          last_error?: string | null
          lock_until?: string | null
          message_template?: string | null
          message_text?: string | null
          name_box?: Json | null
          organization_id?: string | null
          send_mode?: string
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "letters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_donation_requests: {
        Row: {
          address: string | null
          admin_notes: string | null
          category: string
          city: string | null
          created_at: string
          created_by: string | null
          district: string | null
          donor_name: string
          email: string | null
          id: string
          images: Json
          material: string
          mobile: string
          notes: string | null
          organization_id: string
          pickup_required: boolean
          pincode: string | null
          preferred_date: string | null
          quantity: number | null
          request_id: string | null
          state: string | null
          status: string
          unit: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          category?: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          donor_name: string
          email?: string | null
          id?: string
          images?: Json
          material: string
          mobile: string
          notes?: string | null
          organization_id: string
          pickup_required?: boolean
          pincode?: string | null
          preferred_date?: string | null
          quantity?: number | null
          request_id?: string | null
          state?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          category?: string
          city?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          donor_name?: string
          email?: string | null
          id?: string
          images?: Json
          material?: string
          mobile?: string
          notes?: string | null
          organization_id?: string
          pickup_required?: boolean
          pincode?: string | null
          preferred_date?: string | null
          quantity?: number | null
          request_id?: string | null
          state?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      media_library: {
        Row: {
          alt_text: string | null
          bucket: string
          caption: string | null
          created_at: string
          created_by: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          organization_id: string
          public_url: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          bucket?: string
          caption?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id: string
          public_url: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          bucket?: string
          caption?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string
          public_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_suggestions: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          family_id: string
          id: string
          is_deceased: boolean
          name: string
          native_place: string | null
          note: string | null
          origin_village_id: string | null
          parent_id: string | null
          phone: string | null
          phone2: string | null
          relation: string | null
          status: string
          suggested_by: string
          village_text: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          family_id: string
          id?: string
          is_deceased?: boolean
          name: string
          native_place?: string | null
          note?: string | null
          origin_village_id?: string | null
          parent_id?: string | null
          phone?: string | null
          phone2?: string | null
          relation?: string | null
          status?: string
          suggested_by?: string
          village_text?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          family_id?: string
          id?: string
          is_deceased?: boolean
          name?: string
          native_place?: string | null
          note?: string | null
          origin_village_id?: string | null
          parent_id?: string | null
          phone?: string | null
          phone2?: string | null
          relation?: string | null
          status?: string
          suggested_by?: string
          village_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_suggestions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_suggestions_origin_village_id_fkey"
            columns: ["origin_village_id"]
            isOneToOne: false
            referencedRelation: "origin_villages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_suggestions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_suggestions_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          family_id: string
          id: string
          is_deceased: boolean
          is_head: boolean
          member_kind: string
          name: string
          name_unknown: boolean
          native_place: string | null
          origin_village_id: string | null
          parent_id: string | null
          phone: string | null
          phone_dup_ok: boolean
          phone2: string | null
          photo_path: string | null
          relation: string | null
          sort_order: number
          updated_at: string
          village_id: string | null
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          is_deceased?: boolean
          is_head?: boolean
          member_kind?: string
          name: string
          name_unknown?: boolean
          native_place?: string | null
          origin_village_id?: string | null
          parent_id?: string | null
          phone?: string | null
          phone_dup_ok?: boolean
          phone2?: string | null
          photo_path?: string | null
          relation?: string | null
          sort_order?: number
          updated_at?: string
          village_id?: string | null
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          is_deceased?: boolean
          is_head?: boolean
          member_kind?: string
          name?: string
          name_unknown?: boolean
          native_place?: string | null
          origin_village_id?: string | null
          parent_id?: string | null
          phone?: string | null
          phone_dup_ok?: boolean
          phone2?: string | null
          photo_path?: string | null
          relation?: string | null
          sort_order?: number
          updated_at?: string
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_origin_village_id_fkey"
            columns: ["origin_village_id"]
            isOneToOne: false
            referencedRelation: "origin_villages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_name: string | null
          breaking: boolean
          category_id: string | null
          central_status: string
          content: string | null
          content_hi: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_hi: string | null
          display_homepage: boolean
          external_url: string | null
          featured: boolean
          id: string
          organization_id: string
          published_at: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          source_name: string | null
          status: Database["public"]["Enums"]["content_status"]
          submitted_at: string | null
          tags: string[]
          thumbnail: string | null
          title: string
          title_hi: string | null
          updated_at: string
          updated_by: string | null
          views: number
        }
        Insert: {
          author_name?: string | null
          breaking?: boolean
          category_id?: string | null
          central_status?: string
          content?: string | null
          content_hi?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          display_homepage?: boolean
          external_url?: string | null
          featured?: boolean
          id?: string
          organization_id: string
          published_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          source_name?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          submitted_at?: string | null
          tags?: string[]
          thumbnail?: string | null
          title: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
          views?: number
        }
        Update: {
          author_name?: string | null
          breaking?: boolean
          category_id?: string | null
          central_status?: string
          content?: string | null
          content_hi?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          display_homepage?: boolean
          external_url?: string | null
          featured?: boolean
          id?: string
          organization_id?: string
          published_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          source_name?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          submitted_at?: string | null
          tags?: string[]
          thumbnail?: string | null
          title?: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "news_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cms_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      org_documents: {
        Row: {
          created_at: string
          created_by: string | null
          external_url: string | null
          file_path: string | null
          id: string
          kind: string
          organization_id: string
          title: string
          title_hi: string | null
          updated_at: string
          visibility: string
          year: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          organization_id: string
          title: string
          title_hi?: string | null
          updated_at?: string
          visibility?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          organization_id?: string
          title?: string
          title_hi?: string | null
          updated_at?: string
          visibility?: string
          year?: number | null
        }
        Relationships: []
      }
      org_memberships: {
        Row: {
          address: string | null
          admin_note: string | null
          applied_at: string
          blood_group: string | null
          card_issued_at: string | null
          category: string
          city: string | null
          consent: boolean
          created_at: string
          decided_at: string | null
          decided_by: string | null
          district: string | null
          dob: string | null
          education: string | null
          email: string | null
          family_head_name: string | null
          family_id: string | null
          father_name: string | null
          full_name: string
          full_name_hi: string | null
          gender: string | null
          id: string
          in_family_tree: boolean | null
          member_no: string | null
          mobile: string
          native_place: string | null
          occupation: string | null
          organization_id: string
          photo_path: string | null
          pincode: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string | null
          valid_from: string | null
          valid_to: string | null
          village: string | null
          volunteer: Json
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          admin_note?: string | null
          applied_at?: string
          blood_group?: string | null
          card_issued_at?: string | null
          category?: string
          city?: string | null
          consent?: boolean
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          district?: string | null
          dob?: string | null
          education?: string | null
          email?: string | null
          family_head_name?: string | null
          family_id?: string | null
          father_name?: string | null
          full_name: string
          full_name_hi?: string | null
          gender?: string | null
          id?: string
          in_family_tree?: boolean | null
          member_no?: string | null
          mobile: string
          native_place?: string | null
          occupation?: string | null
          organization_id: string
          photo_path?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          valid_from?: string | null
          valid_to?: string | null
          village?: string | null
          volunteer?: Json
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          admin_note?: string | null
          applied_at?: string
          blood_group?: string | null
          card_issued_at?: string | null
          category?: string
          city?: string | null
          consent?: boolean
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          district?: string | null
          dob?: string | null
          education?: string | null
          email?: string | null
          family_head_name?: string | null
          family_id?: string | null
          father_name?: string | null
          full_name?: string
          full_name_hi?: string | null
          gender?: string | null
          id?: string
          in_family_tree?: boolean | null
          member_no?: string | null
          mobile?: string
          native_place?: string | null
          occupation?: string | null
          organization_id?: string
          photo_path?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          valid_from?: string | null
          valid_to?: string | null
          village?: string | null
          volunteer?: Json
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      org_milestones: {
        Row: {
          body: string | null
          body_hi: string | null
          created_at: string
          happened_on: string
          id: string
          image: string | null
          kind: string
          organization_id: string
          show_public: boolean
          title: string
          title_hi: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          body_hi?: string | null
          created_at?: string
          happened_on: string
          id?: string
          image?: string | null
          kind?: string
          organization_id: string
          show_public?: boolean
          title: string
          title_hi?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          body_hi?: string | null
          created_at?: string
          happened_on?: string
          id?: string
          image?: string | null
          kind?: string
          organization_id?: string
          show_public?: boolean
          title?: string
          title_hi?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      org_number_series: {
        Row: {
          id: string
          kind: string
          next_no: number
          organization_id: string
          pad: number
          prefix: string
        }
        Insert: {
          id?: string
          kind: string
          next_no?: number
          organization_id: string
          pad?: number
          prefix?: string
        }
        Update: {
          id?: string
          kind?: string
          next_no?: number
          organization_id?: string
          pad?: number
          prefix?: string
        }
        Relationships: []
      }
      organization_settings: {
        Row: {
          about_long: string | null
          about_long_hi: string | null
          about_short: string | null
          about_short_hi: string | null
          address: string | null
          city: string | null
          created_at: string
          district: string | null
          donation_text: string | null
          donation_text_hi: string | null
          email: string | null
          facebook: string | null
          favicon: string | null
          footer_text: string | null
          footer_text_hi: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          logo: string | null
          organization_id: string
          organization_name: string
          organization_name_hi: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          tagline: string | null
          tagline_hi: string | null
          telegram: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
          whatsapp: string | null
          x: string | null
          youtube: string | null
        }
        Insert: {
          about_long?: string | null
          about_long_hi?: string | null
          about_short?: string | null
          about_short_hi?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          donation_text?: string | null
          donation_text_hi?: string | null
          email?: string | null
          facebook?: string | null
          favicon?: string | null
          footer_text?: string | null
          footer_text_hi?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          organization_id: string
          organization_name?: string
          organization_name_hi?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          tagline?: string | null
          tagline_hi?: string | null
          telegram?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
          x?: string | null
          youtube?: string | null
        }
        Update: {
          about_long?: string | null
          about_long_hi?: string | null
          about_short?: string | null
          about_short_hi?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          donation_text?: string | null
          donation_text_hi?: string | null
          email?: string | null
          facebook?: string | null
          favicon?: string | null
          footer_text?: string | null
          footer_text_hi?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          organization_id?: string
          organization_name?: string
          organization_name_hi?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          tagline?: string | null
          tagline_hi?: string | null
          telegram?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          whatsapp?: string | null
          x?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      origin_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          final_name: string | null
          final_region_id: string | null
          id: string
          name: string
          region_id: string | null
          requested_by: string
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          final_name?: string | null
          final_region_id?: string | null
          id?: string
          name: string
          region_id?: string | null
          requested_by: string
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          final_name?: string | null
          final_region_id?: string | null
          id?: string
          name?: string
          region_id?: string | null
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "origin_requests_final_region_id_fkey"
            columns: ["final_region_id"]
            isOneToOne: false
            referencedRelation: "social_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "origin_requests_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "social_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      origin_villages: {
        Row: {
          created_at: string
          id: string
          name: string
          region_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          region_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          region_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "origin_villages_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "social_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          created_at: string
          currency: string
          id: string
          internship_fee: number
          max_donation_amount: number
          min_donation_amount: number
          online_payments_enabled: boolean
          organization_id: string
          receipt_footer_note: string | null
          receipt_prefix: string
          suggested_amounts: number[]
          updated_at: string
          updated_by: string | null
          volunteer_fee: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          internship_fee?: number
          max_donation_amount?: number
          min_donation_amount?: number
          online_payments_enabled?: boolean
          organization_id: string
          receipt_footer_note?: string | null
          receipt_prefix?: string
          suggested_amounts?: number[]
          updated_at?: string
          updated_by?: string | null
          volunteer_fee?: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          internship_fee?: number
          max_donation_amount?: number
          min_donation_amount?: number
          online_payments_enabled?: boolean
          organization_id?: string
          receipt_footer_note?: string | null
          receipt_prefix?: string
          suggested_amounts?: number[]
          updated_at?: string
          updated_by?: string | null
          volunteer_fee?: number
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          donation_id: string | null
          error_code: string | null
          error_description: string | null
          event: string | null
          id: string
          method: string | null
          organization_id: string
          provider: string
          purpose: string
          raw: Json | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          donation_id?: string | null
          error_code?: string | null
          error_description?: string | null
          event?: string | null
          id?: string
          method?: string | null
          organization_id: string
          provider?: string
          purpose?: string
          raw?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          donation_id?: string | null
          error_code?: string | null
          error_description?: string | null
          event?: string | null
          id?: string
          method?: string | null
          organization_id?: string
          provider?: string
          purpose?: string
          raw?: Json | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          event: string
          event_id: string
          id: string
          organization_id: string | null
          payload: Json
          processed_at: string | null
          processing_error: string | null
          provider: string
          received_at: string
        }
        Insert: {
          event: string
          event_id: string
          id?: string
          organization_id?: string | null
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          provider?: string
          received_at?: string
        }
        Update: {
          event?: string
          event_id?: string
          id?: string
          organization_id?: string | null
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          admin_scope: string
          blood_group: string | null
          can_see_contacts: boolean
          consent_at: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          details_done_at: string | null
          district: string | null
          dob: string | null
          email: string | null
          father_name: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          status: string
          super_admin: boolean
          updated_at: string
          village: string | null
        }
        Insert: {
          address?: string | null
          admin_scope?: string
          blood_group?: string | null
          can_see_contacts?: boolean
          consent_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          details_done_at?: string | null
          district?: string | null
          dob?: string | null
          email?: string | null
          father_name?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          status?: string
          super_admin?: boolean
          updated_at?: string
          village?: string | null
        }
        Update: {
          address?: string | null
          admin_scope?: string
          blood_group?: string | null
          can_see_contacts?: boolean
          consent_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          details_done_at?: string | null
          district?: string | null
          dob?: string | null
          email?: string | null
          father_name?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          status?: string
          super_admin?: boolean
          updated_at?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pub_issues: {
        Row: {
          access: string
          cover_path: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          issue_date: string
          issue_no: string | null
          organization_id: string
          pages: Json
          pdf_path: string | null
          slug: string
          status: string
          title: string
          title_hi: string | null
          updated_at: string
          views: number
        }
        Insert: {
          access?: string
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          issue_date?: string
          issue_no?: string | null
          organization_id: string
          pages?: Json
          pdf_path?: string | null
          slug: string
          status?: string
          title: string
          title_hi?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          access?: string
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          issue_date?: string
          issue_no?: string | null
          organization_id?: string
          pages?: Json
          pdf_path?: string | null
          slug?: string
          status?: string
          title?: string
          title_hi?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      reels: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          organization_id: string
          platform: string
          thumbnail: string | null
          title: string
          title_hi: string | null
          updated_at: string
          updated_by: string | null
          video_url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          organization_id: string
          platform?: string
          thumbnail?: string | null
          title: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          organization_id?: string
          platform?: string
          thumbnail?: string | null
          title?: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string
        }
        Relationships: []
      }
      region_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          phase: number
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          phase?: number
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          phase?: number
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      same_person_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          existing_label: string | null
          existing_member_id: string | null
          family_id: string
          id: string
          is_deceased: boolean
          member_kind: string
          name: string
          native_place: string | null
          parent_id: string | null
          phone: string
          relation: string | null
          requested_by: string
          status: string
          village_id: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          existing_label?: string | null
          existing_member_id?: string | null
          family_id: string
          id?: string
          is_deceased?: boolean
          member_kind?: string
          name: string
          native_place?: string | null
          parent_id?: string | null
          phone: string
          relation?: string | null
          requested_by: string
          status?: string
          village_id?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          existing_label?: string | null
          existing_member_id?: string | null
          family_id?: string
          id?: string
          is_deceased?: boolean
          member_kind?: string
          name?: string
          native_place?: string | null
          parent_id?: string | null
          phone?: string
          relation?: string | null
          requested_by?: string
          status?: string
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "same_person_requests_existing_member_id_fkey"
            columns: ["existing_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "same_person_requests_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "same_person_requests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      server_secrets: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      seva_projects: {
        Row: {
          active: boolean
          city: string | null
          coordinator: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_hi: string | null
          display_order: number
          featured_image: string | null
          icon: string | null
          id: string
          location: string | null
          name: string
          name_hi: string | null
          organization_id: string
          phone: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          short_description_hi: string | null
          slug: string
          state: string | null
          title_hi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          city?: string | null
          coordinator?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          display_order?: number
          featured_image?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          name: string
          name_hi?: string | null
          organization_id: string
          phone?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          short_description_hi?: string | null
          slug: string
          state?: string | null
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          city?: string | null
          coordinator?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          display_order?: number
          featured_image?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          name?: string
          name_hi?: string | null
          organization_id?: string
          phone?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          short_description_hi?: string | null
          slug?: string
          state?: string | null
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          district: string | null
          email: string | null
          full_name: string | null
          id: string
          mobile: string | null
          photo_url: string | null
          pincode: string | null
          state: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          mobile?: string | null
          photo_url?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          mobile?: string | null
          photo_url?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      social_regions: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_regions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "region_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          city: string | null
          class_level: string | null
          course: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          district: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          id_document: string | null
          institution: string | null
          mobile: string
          organization_id: string
          photo_url: string | null
          pincode: string | null
          state: string | null
          status: string
          student_code: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          class_level?: string | null
          course?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          district?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          id_document?: string | null
          institution?: string | null
          mobile: string
          organization_id: string
          photo_url?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          student_code?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          class_level?: string | null
          course?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          district?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          id_document?: string | null
          institution?: string | null
          mobile?: string
          organization_id?: string
          photo_url?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          student_code?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          active: boolean
          approved: boolean
          city: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          message: string
          message_hi: string | null
          name: string
          organization_id: string
          photo: string | null
          role: string | null
          title_hi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          approved?: boolean
          city?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          message: string
          message_hi?: string | null
          name: string
          organization_id: string
          photo?: string | null
          role?: string | null
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          approved?: boolean
          city?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          message?: string
          message_hi?: string | null
          name?: string
          organization_id?: string
          photo?: string | null
          role?: string | null
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          organization_id: string
          platform: string
          thumbnail: string | null
          title: string
          title_hi: string | null
          updated_at: string
          updated_by: string | null
          video_url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          organization_id: string
          platform?: string
          thumbnail?: string | null
          title: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          organization_id?: string
          platform?: string
          thumbnail?: string | null
          title?: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string
        }
        Relationships: []
      }
      villages: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      volunteer_applications: {
        Row: {
          address: string | null
          application_id: string | null
          areas_of_interest: string[] | null
          availability: string | null
          city: string | null
          consent: boolean
          created_at: string
          created_by: string | null
          designation: string | null
          district: string | null
          dob: string | null
          education: string | null
          email: string | null
          gender: string | null
          id: string
          id_document: string | null
          mobile: string
          name: string
          occupation: string | null
          organization_id: string
          payment_reference: string | null
          payment_status: string
          photo: string | null
          pincode: string | null
          preferred_seva_projects: string[] | null
          review_notes: string | null
          reviewed_by: string | null
          skills: string | null
          state: string | null
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          application_id?: string | null
          areas_of_interest?: string[] | null
          availability?: string | null
          city?: string | null
          consent?: boolean
          created_at?: string
          created_by?: string | null
          designation?: string | null
          district?: string | null
          dob?: string | null
          education?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          id_document?: string | null
          mobile: string
          name: string
          occupation?: string | null
          organization_id: string
          payment_reference?: string | null
          payment_status?: string
          photo?: string | null
          pincode?: string | null
          preferred_seva_projects?: string[] | null
          review_notes?: string | null
          reviewed_by?: string | null
          skills?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          application_id?: string | null
          areas_of_interest?: string[] | null
          availability?: string | null
          city?: string | null
          consent?: boolean
          created_at?: string
          created_by?: string | null
          designation?: string | null
          district?: string | null
          dob?: string | null
          education?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          id_document?: string | null
          mobile?: string
          name?: string
          occupation?: string | null
          organization_id?: string
          payment_reference?: string | null
          payment_status?: string
          photo?: string | null
          pincode?: string | null
          preferred_seva_projects?: string[] | null
          review_notes?: string | null
          reviewed_by?: string | null
          skills?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      gov_positions_public: {
        Row: {
          city: string | null
          committee_id: string | null
          designation: string | null
          designation_hi: string | null
          from_date: string | null
          id: string | null
          organization_id: string | null
          person_name: string | null
          person_name_hi: string | null
          phone: string | null
          photo_path: string | null
          rank: number | null
          to_date: string | null
        }
        Insert: {
          city?: string | null
          committee_id?: string | null
          designation?: string | null
          designation_hi?: string | null
          from_date?: string | null
          id?: string | null
          organization_id?: string | null
          person_name?: string | null
          person_name_hi?: string | null
          phone?: never
          photo_path?: string | null
          rank?: number | null
          to_date?: string | null
        }
        Update: {
          city?: string | null
          committee_id?: string | null
          designation?: string | null
          designation_hi?: string | null
          from_date?: string | null
          id?: string | null
          organization_id?: string | null
          person_name?: string | null
          person_name_hi?: string | null
          phone?: never
          photo_path?: string | null
          rank?: number | null
          to_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gov_positions_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "gov_committees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_origin_villages: {
        Args: { p_names: string[]; p_region: string }
        Returns: number
      }
      add_parent_above: {
        Args: {
          p_deceased?: boolean
          p_member: string
          p_name: string
          p_relation?: string
          p_unknown?: boolean
        }
        Returns: string
      }
      add_region_category: { Args: { p_name: string }; Returns: string }
      admin_access_list: {
        Args: never
        Returns: {
          admin_scope: string
          can_see_contacts: boolean
          id: string
          super_admin: boolean
        }[]
      }
      admin_can_manage_family: {
        Args: { p_admin: string; p_family: string }
        Returns: boolean
      }
      admin_only: { Args: never; Returns: undefined }
      already_covered_members: {
        Args: { p_ceremony: string; p_deceased: string }
        Returns: {
          member_id: string
        }[]
      }
      can_manage_family: { Args: { p_family: string }; Returns: boolean }
      can_manage_profile: { Args: { p: string }; Returns: boolean }
      can_manage_village: { Args: { v: string }; Returns: boolean }
      can_see_contacts: { Args: never; Returns: boolean }
      can_see_link: {
        Args: { p_child: string; p_pmember: string; p_requester: string }
        Returns: boolean
      }
      claim_admin_families: { Args: never; Returns: number }
      cm_moderate_tick: { Args: never; Returns: undefined }
      comms_tick: { Args: never; Returns: undefined }
      create_letter_recipients: {
        Args: {
          p_allow_repeat?: boolean
          p_letter_id: string
          p_member_ids: string[]
        }
        Returns: {
          father_name: string
          member_id: string
          recipient_id: string
          recipient_name: string
          village_name: string
        }[]
      }
      dashboard_stats: { Args: never; Returns: Json }
      decide_family: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: Json
      }
      decide_family_link: {
        Args: { p_id: string; p_status: string }
        Returns: Json
      }
      decide_letter: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: Json
      }
      decide_origin_request: {
        Args: {
          p_approve: boolean
          p_id: string
          p_name?: string
          p_region?: string
        }
        Returns: string
      }
      decide_same_person: {
        Args: { p_approve: boolean; p_id: string }
        Returns: string
      }
      decide_suggestion: {
        Args: { p_id: string; p_name?: string; p_status: string }
        Returns: Json
      }
      decide_user: { Args: { p_id: string; p_status: string }; Returns: Json }
      delete_origin_village: { Args: { p_id: string }; Returns: undefined }
      delete_region_category: { Args: { p_id: string }; Returns: undefined }
      delete_social_region: { Args: { p_id: string }; Returns: undefined }
      directory_families: {
        Args: { p_village?: string }
        Returns: {
          family_name: string
          head_name: string
          id: string
          village_id: string
          village_name: string
        }[]
      }
      directory_members: {
        Args: { p_village?: string }
        Returns: {
          family_id: string
          family_name: string
          father_name: string
          has_phone: boolean
          is_head: boolean
          lineage_id: string
          member_id: string
          member_kind: string
          member_name: string
          native_place: string
          parent_deceased: boolean
          region_id: string
          region_name: string
          region_sort: number
          relation: string
          village_id: string
          village_name: string
        }[]
      }
      family_is_below: {
        Args: { p_root: string; p_target: string }
        Returns: boolean
      }
      family_link_info: {
        Args: { p_family: string }
        Returns: {
          direction: string
          link_id: string
          member_id: string
          member_name: string
          note: string
          other_family_id: string
          other_family_name: string
          status: string
        }[]
      }
      family_tree: {
        Args: { p_family: string }
        Returns: {
          id: string
          is_deceased: boolean
          is_head: boolean
          member_kind: string
          name: string
          name_unknown: boolean
          native_place: string
          parent_id: string
          relation: string
          sort_order: number
          village_name: string
        }[]
      }
      fin_cancel_voucher: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      fin_cashbook: {
        Args: {
          p_account?: string
          p_from: string
          p_org: string
          p_to: string
        }
        Returns: {
          account_name: string
          narration: string
          number: string
          party_name: string
          payment: number
          receipt: number
          type: string
          voucher_date: string
          voucher_id: string
        }[]
      }
      fin_ensure_series: { Args: { p_org: string }; Returns: undefined }
      fin_ensure_year: {
        Args: { p_date: string; p_org: string }
        Returns: string
      }
      fin_fy_label: { Args: { p_date: string }; Returns: string }
      fin_import_paid_donations: { Args: { p_org: string }; Returns: number }
      fin_ledger: {
        Args: { p_account: string; p_from: string; p_to: string }
        Returns: {
          balance: number
          credit: number
          debit: number
          narration: string
          number: string
          party_name: string
          type: string
          voucher_date: string
          voucher_id: string
        }[]
      }
      fin_lock_year: {
        Args: { p_id: string; p_lock: boolean }
        Returns: undefined
      }
      fin_post_donation: { Args: { p_donation: string }; Returns: string }
      fin_post_voucher: { Args: { p_id: string }; Returns: Json }
      fin_receipt_document: {
        Args: { p_template?: string; p_voucher: string }
        Returns: string
      }
      fin_receipts_payments: {
        Args: { p_from: string; p_org: string; p_to: string }
        Returns: {
          account_id: string
          amount: number
          code: string
          name: string
          name_hi: string
          side: string
        }[]
      }
      fin_reverse_voucher: {
        Args: { p_date?: string; p_id: string; p_reason?: string }
        Returns: string
      }
      fin_seed_accounts: { Args: { p_org: string }; Returns: number }
      fin_trial_balance: {
        Args: { p_from: string; p_org: string; p_to: string }
        Returns: {
          account_id: string
          closing: number
          code: string
          credit: number
          debit: number
          is_group: boolean
          name: string
          name_hi: string
          opening: number
          parent_id: string
          type: string
        }[]
      }
      fin_voucher_detail: { Args: { p_id: string }; Returns: Json }
      fin_year_for: { Args: { p_date: string; p_org: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_approved: { Args: never; Returns: boolean }
      is_super: { Args: never; Returns: boolean }
      k1_ad_board: {
        Args: { p_org: string }
        Returns: {
          ends_on: string
          id: string
          image: string
          link: string
          sponsor: string
          text_en: string
          text_hi: string
          title: string
        }[]
      }
      k1_ad_campaign_paid: {
        Args: {
          p_campaign: string
          p_date?: string
          p_mode?: string
          p_ref?: string
        }
        Returns: string
      }
      k1_ad_hit: {
        Args: {
          p_campaign: string
          p_click?: boolean
          p_org: string
          p_slot: string
        }
        Returns: undefined
      }
      k1_ad_revenue: {
        Args: { p_from: string; p_org: string; p_to: string }
        Returns: Json
      }
      k1_ads_for: { Args: { p_org: string; p_slot: string }; Returns: Json }
      k1_assign_role: {
        Args: { p_email: string; p_org: string; p_role_id: string }
        Returns: string
      }
      k1_can: { Args: { p_org: string; p_perm: string }; Returns: boolean }
      k1_cancel_document: {
        Args: { p_id: string; p_reason: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          body: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          doc_date: string
          fields: Json
          id: string
          issued_at: string | null
          issued_by: string | null
          kind: string
          organization_id: string
          pdf_path: string | null
          recipient: Json
          ref_no: string | null
          signatories: Json
          source_id: string | null
          source_table: string | null
          status: string
          subject: string | null
          submitted_at: string | null
          template_id: string | null
          title: string
          updated_at: string
          verify_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "docs_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      k1_cancel_message: { Args: { p_id: string }; Returns: undefined }
      k1_central_decide: {
        Args: { p_approve: boolean; p_id: string; p_kind: string }
        Returns: undefined
      }
      k1_central_feed: {
        Args: { p_limit?: number; p_org: string; p_status?: string }
        Returns: {
          central_status: string
          excerpt: string
          id: string
          image: string
          kind: string
          org_name: string
          org_slug: string
          organization_id: string
          published_at: string
          slug: string
          title: string
        }[]
      }
      k1_claim_memberships: { Args: never; Returns: number }
      k1_cm_actor_name: {
        Args: { p_org: string; p_user: string }
        Returns: string
      }
      k1_cm_appeal: {
        Args: { p_note?: string; p_post: string }
        Returns: undefined
      }
      k1_cm_default_keywords: { Args: never; Returns: string[] }
      k1_cm_flagged: {
        Args: { p_org: string }
        Returns: {
          author_name: string
          body: string
          created_at: string
          id: string
          link_url: string
          media: Json
          moderation: Json
          moderation_status: string
          reach: string
        }[]
      }
      k1_cm_moderation_result: {
        Args: { p_ai: Json; p_post: string }
        Returns: undefined
      }
      k1_cm_notifications: {
        Args: { p_limit?: number }
        Returns: {
          comment_id: string
          created_at: string
          id: string
          kind: string
          post_id: string
          read_at: string
          text: string
          unread: number
        }[]
      }
      k1_cm_notifications_read: {
        Args: { p_ids?: string[] }
        Returns: undefined
      }
      k1_cm_notify: {
        Args: {
          p_actor: string
          p_comment: string
          p_kind: string
          p_org: string
          p_post: string
          p_text: string
          p_user: string
        }
        Returns: undefined
      }
      k1_cm_notify_moderators: {
        Args: { p_body: string; p_org: string; p_ref: string }
        Returns: number
      }
      k1_cm_pending_posts: {
        Args: { p_limit?: number }
        Returns: {
          body: string
          id: string
          link_url: string
          media: Json
          moderation: Json
          organization_id: string
        }[]
      }
      k1_cm_promo_score: {
        Args: { p_link?: string; p_org: string; p_text: string }
        Returns: Json
      }
      k1_cm_review: {
        Args: { p_action: string; p_post: string }
        Returns: undefined
      }
      k1_cm_tags: {
        Args: { p_limit?: number; p_org: string }
        Returns: {
          n: number
          tag: string
        }[]
      }
      k1_comms_channel_runtime: {
        Args: { p_channel: string }
        Returns: {
          config: Json
          daily_limit: number
          gap_max_s: number
          gap_min_s: number
          id: string
          kind: string
          organization_id: string
          provider: string
          secret: string
          status: string
        }[]
      }
      k1_comms_claim: {
        Args: { p_batch?: number }
        Returns: {
          attempts: number
          body: string
          campaign_id: string | null
          channel_id: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          error: string | null
          id: string
          kind: string
          lock_until: string | null
          max_attempts: number
          media: Json
          meta_template: Json | null
          next_attempt_at: string
          organization_id: string
          provider_message_id: string | null
          purpose: string
          read_at: string | null
          ref_id: string | null
          ref_table: string | null
          sent_at: string | null
          status: string
          subject: string | null
          to_contact: string
          to_name: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "comms_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      k1_comms_opt_out: {
        Args: { p_contact: string; p_org: string; p_reason?: string }
        Returns: undefined
      }
      k1_comms_result: {
        Args: {
          p_cost?: number
          p_error?: string
          p_fatal?: boolean
          p_id: string
          p_ok: boolean
          p_provider_id?: string
        }
        Returns: undefined
      }
      k1_comms_set_secret: {
        Args: { p_channel: string; p_secret: string }
        Returns: undefined
      }
      k1_comms_stats: { Args: { p_org: string }; Returns: Json }
      k1_comms_status_update: {
        Args: { p_at?: string; p_provider_id: string; p_status: string }
        Returns: undefined
      }
      k1_contact_targets: {
        Args: { p_org: string }
        Returns: {
          id: string
          name: string
          name_hi: string
        }[]
      }
      k1_decide_document: {
        Args: { p_approve: boolean; p_id: string; p_note?: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          body: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          doc_date: string
          fields: Json
          id: string
          issued_at: string | null
          issued_by: string | null
          kind: string
          organization_id: string
          pdf_path: string | null
          recipient: Json
          ref_no: string | null
          signatories: Json
          source_id: string | null
          source_table: string | null
          status: string
          subject: string | null
          submitted_at: string | null
          template_id: string | null
          title: string
          updated_at: string
          verify_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "docs_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      k1_decide_membership: {
        Args: {
          p_approve: boolean
          p_category?: string
          p_id: string
          p_note?: string
        }
        Returns: {
          address: string | null
          admin_note: string | null
          applied_at: string
          blood_group: string | null
          card_issued_at: string | null
          category: string
          city: string | null
          consent: boolean
          created_at: string
          decided_at: string | null
          decided_by: string | null
          district: string | null
          dob: string | null
          education: string | null
          email: string | null
          family_head_name: string | null
          family_id: string | null
          father_name: string | null
          full_name: string
          full_name_hi: string | null
          gender: string | null
          id: string
          in_family_tree: boolean | null
          member_no: string | null
          mobile: string
          native_place: string | null
          occupation: string | null
          organization_id: string
          photo_path: string | null
          pincode: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string | null
          valid_from: string | null
          valid_to: string | null
          village: string | null
          volunteer: Json
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "org_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      k1_delete_domain: { Args: { p_id: string }; Returns: undefined }
      k1_enqueue_message: {
        Args: {
          p_body: string
          p_campaign?: string
          p_channel?: string
          p_kind: string
          p_media?: Json
          p_meta_template?: Json
          p_name?: string
          p_org: string
          p_purpose?: string
          p_ref_id?: string
          p_ref_table?: string
          p_subject?: string
          p_to: string
        }
        Returns: string
      }
      k1_event_checkin: {
        Args: { p_token: string; p_undo?: boolean }
        Returns: Json
      }
      k1_event_import_members: {
        Args: { p_event: string; p_filter?: string }
        Returns: number
      }
      k1_event_register: {
        Args: {
          p_event: string
          p_name: string
          p_phone: string
          p_seats?: number
        }
        Returns: string
      }
      k1_event_stats: { Args: { p_event: string }; Returns: Json }
      k1_families: {
        Args: { p_limit?: number; p_q?: string; p_status?: string }
        Returns: {
          created_at: string
          family_name: string
          head_name: string
          id: string
          main_whatsapp: string
          managed: boolean
          members: number
          mine: boolean
          owner_id: string
          status: string
          village_name: string
        }[]
      }
      k1_family_ctx: { Args: never; Returns: Json }
      k1_feed: {
        Args: {
          p_before?: string
          p_limit?: number
          p_org: string
          p_post?: string
        }
        Returns: {
          as_org: string
          as_org_name: string
          author_id: string
          author_name: string
          author_photo: string
          body: string
          can_moderate: boolean
          comment_count: number
          created_at: string
          id: string
          like_count: number
          liked: boolean
          link_kind: string
          link_url: string
          media: Json
          mine: boolean
          moderation_status: string
          pinned: boolean
          reach: string
          share_count: number
          tags: string[]
          visibility: string
        }[]
      }
      k1_feed_search: {
        Args: {
          p_before?: string
          p_limit?: number
          p_org: string
          p_q?: string
          p_tag?: string
        }
        Returns: {
          as_org: string
          as_org_name: string
          author_id: string
          author_name: string
          author_photo: string
          body: string
          can_moderate: boolean
          comment_count: number
          created_at: string
          id: string
          like_count: number
          liked: boolean
          link_kind: string
          link_url: string
          media: Json
          mine: boolean
          moderation_status: string
          pinned: boolean
          reach: string
          share_count: number
          tags: string[]
          visibility: string
        }[]
      }
      k1_health: { Args: never; Returns: Json }
      k1_in_family: { Args: { p_family: string }; Returns: boolean }
      k1_is_member: { Args: { p_org: string }; Returns: boolean }
      k1_is_platform_admin: { Args: never; Returns: boolean }
      k1_issue_document: {
        Args: { p_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          body: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          doc_date: string
          fields: Json
          id: string
          issued_at: string | null
          issued_by: string | null
          kind: string
          organization_id: string
          pdf_path: string | null
          recipient: Json
          ref_no: string | null
          signatories: Json
          source_id: string | null
          source_table: string | null
          status: string
          subject: string | null
          submitted_at: string | null
          template_id: string | null
          title: string
          updated_at: string
          verify_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "docs_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      k1_issue_view: { Args: { p_id: string }; Returns: undefined }
      k1_listing_decide: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: undefined
      }
      k1_listing_view: { Args: { p_id: string }; Returns: undefined }
      k1_matrimony_browse: {
        Args: { p_gender?: string; p_org: string }
        Returns: {
          about: string
          age: number
          city: string
          created_for: string
          display_name: string
          district: string
          education: string
          expectations: string
          gender: string
          gotra: string
          height_cm: number
          id: string
          income_range: string
          interests: string
          my_interest: string
          native_place: string
          photo_path: string
          photos: string[]
          profession: string
          special_note: string
          their_interest: string
          verified: boolean
        }[]
      }
      k1_matrimony_contact: { Args: { p_profile: string }; Returns: Json }
      k1_matrimony_inbox: {
        Args: { p_org: string }
        Returns: {
          created_at: string
          direction: string
          interest_id: string
          other_age: number
          other_city: string
          other_id: string
          other_name: string
          status: string
        }[]
      }
      k1_matrimony_interest: {
        Args: { p_from: string; p_to: string }
        Returns: undefined
      }
      k1_matrimony_respond: {
        Args: { p_accept: boolean; p_interest: string }
        Returns: undefined
      }
      k1_matrimony_verify: {
        Args: { p_id: string; p_verified: boolean }
        Returns: undefined
      }
      k1_member_update_contact: {
        Args: { p_member: string; p_phone2?: string; p_photo?: string }
        Returns: undefined
      }
      k1_membership_move: {
        Args: { p_id: string; p_org: string }
        Returns: undefined
      }
      k1_my_family: { Args: never; Returns: Json }
      k1_my_orgs: {
        Args: never
        Returns: {
          name: string
          name_hi: string
          organization_id: string
          permissions: string[]
          role_keys: string[]
          slug: string
        }[]
      }
      k1_network: { Args: { p_limit?: number; p_org: string }; Returns: Json }
      k1_network_members: {
        Args: { p_limit?: number; p_org: string; p_q?: string }
        Returns: {
          applied_at: string
          category: string
          city: string
          family_id: string
          full_name: string
          id: string
          member_no: string
          mobile: string
          org_name: string
          org_slug: string
          organization_id: string
          status: string
          village: string
        }[]
      }
      k1_next_number: {
        Args: { p_kind: string; p_org: string }
        Returns: string
      }
      k1_norm_contact: { Args: { p: string }; Returns: string }
      k1_notify_org_admins: {
        Args: {
          p_body: string
          p_org: string
          p_perm: string
          p_ref?: string
          p_ref_table?: string
        }
        Returns: number
      }
      k1_org_by_slug: {
        Args: { p_slug: string }
        Returns: {
          branding: Json
          child_count: number
          name: string
          name_hi: string
          organization_id: string
          parent_id: string
          short_name: string
          slug: string
        }[]
      }
      k1_org_decide: {
        Args: { p_approve: boolean; p_note?: string; p_org: string }
        Returns: undefined
      }
      k1_org_domains: {
        Args: { p_org: string }
        Returns: {
          created_at: string
          hostname: string
          id: string
          is_primary: boolean
          kind: string
          verified_at: string
        }[]
      }
      k1_org_export: { Args: { p_org: string }; Returns: Json }
      k1_org_list: {
        Args: never
        Returns: {
          admins: string
          city: string
          created_at: string
          district: string
          hostname: string
          id: string
          kind: string
          level: string
          members: number
          name: string
          name_hi: string
          parent_id: string
          parent_name: string
          phone: string
          requester: string
          slug: string
          state: string
          status: string
        }[]
      }
      k1_org_register: {
        Args: {
          p_about: string
          p_city: string
          p_contact_name: string
          p_district: string
          p_email: string
          p_kind: string
          p_level: string
          p_name: string
          p_name_hi: string
          p_parent?: string
          p_phone: string
          p_state: string
        }
        Returns: Json
      }
      k1_org_roles: {
        Args: { p_org: string }
        Returns: {
          is_system: boolean
          key: string
          name: string
          name_hi: string
          permissions: string[]
          role_id: string
        }[]
      }
      k1_org_stats: { Args: { p_org: string }; Returns: Json }
      k1_org_team: {
        Args: { p_org: string }
        Returns: {
          assignment_id: string
          email: string
          full_name: string
          mobile: string
          role_id: string
          role_key: string
          role_name: string
          user_id: string
        }[]
      }
      k1_page_restore: { Args: { p_revision: string }; Returns: undefined }
      k1_pending_domains: {
        Args: never
        Returns: {
          created_at: string
          hostname: string
          id: string
          org_name: string
          organization_id: string
        }[]
      }
      k1_pick_channel: {
        Args: { p_kind: string; p_org: string }
        Returns: string
      }
      k1_ping: { Args: never; Returns: Json }
      k1_poll_close: { Args: { p_poll: string }; Returns: undefined }
      k1_poll_results: { Args: { p_poll: string }; Returns: Json }
      k1_post_as_options: {
        Args: never
        Returns: {
          id: string
          logo: string
          name: string
          name_hi: string
        }[]
      }
      k1_post_comments: {
        Args: { p_post: string }
        Returns: {
          author_id: string
          author_name: string
          body: string
          created_at: string
          id: string
          mine: boolean
          parent_id: string
        }[]
      }
      k1_post_create: {
        Args: {
          p_as_org?: string
          p_body: string
          p_link?: string
          p_link_kind?: string
          p_media?: Json
          p_org: string
          p_visibility?: string
        }
        Returns: string
      }
      k1_post_decide: {
        Args: {
          p_decision: string
          p_id: string
          p_kind: string
          p_note?: string
        }
        Returns: undefined
      }
      k1_post_moderate: {
        Args: { p_pinned?: boolean; p_post: string; p_status: string }
        Returns: undefined
      }
      k1_post_nominate: {
        Args: { p_id: string; p_kind: string; p_nominate?: boolean }
        Returns: undefined
      }
      k1_post_shared: { Args: { p_post: string }; Returns: undefined }
      k1_post_submit: {
        Args: { p_id: string; p_kind: string }
        Returns: undefined
      }
      k1_post_view: {
        Args: { p_id: string; p_kind: string }
        Returns: undefined
      }
      k1_rate_guard: {
        Args: {
          p_col: string
          p_max: number
          p_table: string
          p_who: string
          p_window: string
        }
        Returns: undefined
      }
      k1_remove_role: { Args: { p_assignment: string }; Returns: undefined }
      k1_request_domain: {
        Args: { p_hostname: string; p_org: string }
        Returns: string
      }
      k1_resolve_host: {
        Args: { p_host: string }
        Returns: {
          branding: Json
          child_count: number
          name: string
          name_hi: string
          organization_id: string
          parent_id: string
          short_name: string
          slug: string
        }[]
      }
      k1_root_org: { Args: { p_org: string }; Returns: string }
      k1_rsvp: {
        Args: {
          p_answer: string
          p_note?: string
          p_seats?: number
          p_token: string
        }
        Returns: undefined
      }
      k1_rsvp_info: { Args: { p_token: string }; Returns: Json }
      k1_set_branding: {
        Args: { p_branding: Json; p_org: string }
        Returns: Json
      }
      k1_set_document_pdf: {
        Args: { p_id: string; p_path: string }
        Returns: undefined
      }
      k1_slugify: { Args: { p: string }; Returns: string }
      k1_submit_document: {
        Args: { p_id: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          body: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          doc_date: string
          fields: Json
          id: string
          issued_at: string | null
          issued_by: string | null
          kind: string
          organization_id: string
          pdf_path: string | null
          recipient: Json
          ref_no: string | null
          signatories: Json
          source_id: string | null
          source_table: string | null
          status: string
          subject: string | null
          submitted_at: string | null
          template_id: string | null
          title: string
          updated_at: string
          verify_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "docs_documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      k1_toggle_like: { Args: { p_post: string }; Returns: boolean }
      k1_verify_document: {
        Args: { p_code: string }
        Returns: {
          doc_date: string
          issued_at: string
          kind: string
          organization: string
          recipient_name: string
          ref_no: string
          status: string
          title: string
        }[]
      }
      k1_verify_domain: {
        Args: { p_id: string; p_verified?: boolean }
        Returns: undefined
      }
      k1_vote: {
        Args: { p_choices: string[]; p_poll: string }
        Returns: undefined
      }
      lineage_roots: {
        Args: never
        Returns: {
          family_id: string
          root_id: string
        }[]
      }
      lineage_tree: {
        Args: { p_family: string }
        Returns: {
          family_id: string
          family_name: string
          id: string
          is_deceased: boolean
          is_head: boolean
          member_kind: string
          name: string
          name_unknown: boolean
          native_place: string
          parent_id: string
          relation: string
          sort_order: number
          village_name: string
        }[]
      }
      merge_families: {
        Args: { p_from: string; p_parent?: string; p_to: string }
        Returns: undefined
      }
      merge_families_same_father: {
        Args: {
          p_from: string
          p_from_node: string
          p_to: string
          p_to_node: string
        }
        Returns: number
      }
      merge_villages: { Args: { p_from: string; p_to: string }; Returns: Json }
      move_member: {
        Args: { p_member: string; p_new_parent: string }
        Returns: undefined
      }
      my_profile: {
        Args: never
        Returns: {
          address: string | null
          admin_scope: string
          blood_group: string | null
          can_see_contacts: boolean
          consent_at: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          details_done_at: string | null
          district: string | null
          dob: string | null
          email: string | null
          father_name: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          status: string
          super_admin: boolean
          updated_at: string
          village: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_role: { Args: never; Returns: string }
      my_status: { Args: never; Returns: string }
      next_donation_id: { Args: never; Returns: string }
      next_receipt_number:
        | { Args: never; Returns: string }
        | { Args: { p_org: string }; Returns: string }
      notify_admin_whatsapp: { Args: { p_text: string }; Returns: undefined }
      notify_village_admins: {
        Args: { p_text: string; p_village: string }
        Returns: undefined
      }
      notify_whatsapp_phone: {
        Args: { p_phone: string; p_text: string }
        Returns: undefined
      }
      pending_family_links: {
        Args: never
        Returns: {
          child_family_id: string
          child_family_name: string
          child_head: string
          created_at: string
          id: string
          note: string
          parent_family_id: string
          parent_family_name: string
          parent_member_name: string
          requested_by_name: string
        }[]
      }
      pending_letters: {
        Args: never
        Returns: {
          by_village: Json
          ceremony_date: string
          created_at: string
          creator_name: string
          creator_phone: string
          deceased_name: string
          id: string
          total: number
        }[]
      }
      pending_origin_requests: {
        Args: never
        Returns: {
          created_at: string
          id: string
          members: number
          name: string
          region_id: string
          requested_by_name: string
        }[]
      }
      pending_same_person: {
        Args: never
        Returns: {
          created_at: string
          existing_label: string
          family_name: string
          id: string
          name: string
          phone_last4: string
          requester: string
        }[]
      }
      phone_check: {
        Args: { p_exclude_member?: string; p_family?: string; p_phone: string }
        Returns: {
          family_id: string
          family_name: string
          father_name: string
          is_head: boolean
          kind: string
          member_id: string
          name: string
          village_name: string
        }[]
      }
      phone_taken: {
        Args: { p_exclude_member?: string; p_family?: string; p_phone: string }
        Returns: boolean
      }
      profile_contacts: {
        Args: { p_ids: string[] }
        Returns: {
          address: string
          id: string
          phone: string
        }[]
      }
      profile_details: {
        Args: { p_id: string }
        Returns: {
          address: string | null
          admin_scope: string
          blood_group: string | null
          can_see_contacts: boolean
          consent_at: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          details_done_at: string | null
          district: string | null
          dob: string | null
          email: string | null
          father_name: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          status: string
          super_admin: boolean
          updated_at: string
          village: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      queue_letter: { Args: { p_letter_id: string }; Returns: number }
      remove_member_keep_children: {
        Args: { p_id: string }
        Returns: undefined
      }
      rename_region_category: {
        Args: { p_id: string; p_name: string }
        Returns: undefined
      }
      rename_social_region: {
        Args: { p_id: string; p_name: string }
        Returns: undefined
      }
      reopen_family: { Args: { p_id: string }; Returns: undefined }
      reopen_letter: { Args: { p_id: string }; Returns: undefined }
      request_family_link: {
        Args: { p_child: string; p_note?: string; p_parent_member: string }
        Returns: Json
      }
      request_origin_village: {
        Args: { p_name: string; p_region?: string }
        Returns: string
      }
      request_same_person: {
        Args: {
          p_deceased: boolean
          p_existing: string
          p_family: string
          p_kind: string
          p_label: string
          p_name: string
          p_native: string
          p_parent: string
          p_phone: string
          p_relation: string
          p_village: string
        }
        Returns: undefined
      }
      restore_family: { Args: { p_id: string }; Returns: string }
      save_social_region: {
        Args: { p_category: string; p_id?: string; p_name: string }
        Returns: string
      }
      send_admin_digest: { Args: never; Returns: undefined }
      send_health_digest: { Args: never; Returns: undefined }
      send_letters_tick: { Args: never; Returns: undefined }
      set_admin_access: {
        Args: { p_admin: string; p_contacts: boolean; p_scope: string }
        Returns: undefined
      }
      set_admin_regions: {
        Args: { p_admin: string; p_regions: string[] }
        Returns: undefined
      }
      set_family_head: { Args: { p_member: string }; Returns: undefined }
      submit_letter: { Args: { p_letter_id: string }; Returns: Json }
      suggest_member: {
        Args: {
          p_deceased?: boolean
          p_family: string
          p_name: string
          p_native?: string
          p_note: string
          p_parent: string
          p_phone: string
          p_relation: string
          p_village: string
        }
        Returns: Json
      }
      trash_family: { Args: { p_id: string }; Returns: undefined }
      unlink_family: { Args: { p_child: string }; Returns: undefined }
      update_origin_village: {
        Args: { p_id: string; p_name: string; p_region: string }
        Returns: undefined
      }
      village_stats: {
        Args: never
        Returns: {
          families: number
          members: number
          village_id: string
          village_name: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "SUPER_ADMIN"
        | "ADMIN"
        | "CONTENT_MANAGER"
        | "STAFF"
        | "AUDITOR"
        | "USER"
        | "BLOOD_MANAGER"
        | "LIBRARY_MANAGER"
        | "VOLUNTEER_MANAGER"
        | "INTERNSHIP_MANAGER"
        | "HR_MANAGER"
        | "ACCOUNTANT"
        | "AMBULANCE_MANAGER"
        | "JOB_MANAGER"
        | "DONOR"
        | "VOLUNTEER"
        | "INTERN"
        | "STUDENT"
        | "JOB_SEEKER"
        | "EMPLOYER"
      content_status: "draft" | "review" | "published" | "archived"
      donation_type:
        | "general"
        | "bhojan_sewa"
        | "education"
        | "library"
        | "ambulance"
        | "medical"
        | "blood"
        | "campaign"
        | "seva_project"
        | "other"
      payment_status:
        | "CREATED"
        | "PENDING"
        | "PAID"
        | "FAILED"
        | "REFUNDED"
        | "CANCELLED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "SUPER_ADMIN",
        "ADMIN",
        "CONTENT_MANAGER",
        "STAFF",
        "AUDITOR",
        "USER",
        "BLOOD_MANAGER",
        "LIBRARY_MANAGER",
        "VOLUNTEER_MANAGER",
        "INTERNSHIP_MANAGER",
        "HR_MANAGER",
        "ACCOUNTANT",
        "AMBULANCE_MANAGER",
        "JOB_MANAGER",
        "DONOR",
        "VOLUNTEER",
        "INTERN",
        "STUDENT",
        "JOB_SEEKER",
        "EMPLOYER",
      ],
      content_status: ["draft", "review", "published", "archived"],
      donation_type: [
        "general",
        "bhojan_sewa",
        "education",
        "library",
        "ambulance",
        "medical",
        "blood",
        "campaign",
        "seva_project",
        "other",
      ],
      payment_status: [
        "CREATED",
        "PENDING",
        "PAID",
        "FAILED",
        "REFUNDED",
        "CANCELLED",
      ],
    },
  },
} as const
