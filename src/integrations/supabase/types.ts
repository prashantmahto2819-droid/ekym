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
          city: string | null
          content: string | null
          content_hi: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          excerpt_hi: string | null
          featured_image: string | null
          gallery: Json
          id: string
          og_description: string | null
          og_image: string | null
          og_title: string | null
          organization_id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          seva_project_id: string | null
          slug: string
          state: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          title_hi: string | null
          updated_at: string
          updated_by: string | null
          video_url: string | null
        }
        Insert: {
          author_id?: string | null
          city?: string | null
          content?: string | null
          content_hi?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          excerpt_hi?: string | null
          featured_image?: string | null
          gallery?: Json
          id?: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          organization_id: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          seva_project_id?: string | null
          slug: string
          state?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Update: {
          author_id?: string | null
          city?: string | null
          content?: string | null
          content_hi?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          excerpt_hi?: string | null
          featured_image?: string | null
          gallery?: Json
          id?: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          organization_id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          seva_project_id?: string | null
          slug?: string
          state?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Relationships: [
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
          name: string
          name_hi: string | null
          organization_id: string
          seats: number | null
          slug: string
          start_date: string | null
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
          name: string
          name_hi?: string | null
          organization_id: string
          seats?: number | null
          slug: string
          start_date?: string | null
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
          name?: string
          name_hi?: string | null
          organization_id?: string
          seats?: number | null
          slug?: string
          start_date?: string | null
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
          created_at: string
          created_by: string | null
          description: string | null
          description_hi: string | null
          display_homepage: boolean
          external_url: string | null
          id: string
          organization_id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          source_name: string | null
          status: Database["public"]["Enums"]["content_status"]
          thumbnail: string | null
          title: string
          title_hi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          display_homepage?: boolean
          external_url?: string | null
          id?: string
          organization_id: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          source_name?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail?: string | null
          title: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_hi?: string | null
          display_homepage?: boolean
          external_url?: string | null
          id?: string
          organization_id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          source_name?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail?: string | null
          title?: string
          title_hi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          father_name: string | null
          full_name: string
          full_name_hi: string | null
          gender: string | null
          id: string
          member_no: string | null
          mobile: string
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
          father_name?: string | null
          full_name: string
          full_name_hi?: string | null
          gender?: string | null
          id?: string
          member_no?: string | null
          mobile: string
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
          father_name?: string | null
          full_name?: string
          full_name_hi?: string | null
          gender?: string | null
          id?: string
          member_no?: string | null
          mobile?: string
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
          whatsapp?: string | null
        }
        Relationships: []
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
      is_admin: { Args: never; Returns: boolean }
      is_approved: { Args: never; Returns: boolean }
      is_super: { Args: never; Returns: boolean }
      k1_assign_role: {
        Args: { p_email: string; p_org: string; p_role_id: string }
        Returns: string
      }
      k1_can: { Args: { p_org: string; p_perm: string }; Returns: boolean }
      k1_claim_memberships: { Args: never; Returns: number }
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
          father_name: string | null
          full_name: string
          full_name_hi: string | null
          gender: string | null
          id: string
          member_no: string | null
          mobile: string
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
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "org_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      k1_is_platform_admin: { Args: never; Returns: boolean }
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
      k1_next_number: {
        Args: { p_kind: string; p_org: string }
        Returns: string
      }
      k1_org_by_slug: {
        Args: { p_slug: string }
        Returns: {
          branding: Json
          name: string
          name_hi: string
          organization_id: string
          short_name: string
          slug: string
        }[]
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
      k1_remove_role: { Args: { p_assignment: string }; Returns: undefined }
      k1_resolve_host: {
        Args: { p_host: string }
        Returns: {
          branding: Json
          name: string
          name_hi: string
          organization_id: string
          short_name: string
          slug: string
        }[]
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
