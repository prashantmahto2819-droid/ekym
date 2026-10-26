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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
          created_at: string
          created_by: string | null
          excerpt: string | null
          featured_image: string | null
          gallery: Json
          id: string
          og_description: string | null
          og_image: string | null
          og_title: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          seva_project_id: string | null
          slug: string
          state: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          updated_by: string | null
          video_url: string | null
        }
        Insert: {
          author_id?: string | null
          city?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image?: string | null
          gallery?: Json
          id?: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          seva_project_id?: string | null
          slug: string
          state?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Update: {
          author_id?: string | null
          city?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          featured_image?: string | null
          gallery?: Json
          id?: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          seva_project_id?: string | null
          slug?: string
          state?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
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
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          slug?: string
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
          end_date: string | null
          id: string
          location: string | null
          raised_amount: number
          seo_description: string | null
          seo_title: string | null
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["content_status"]
          target_amount: number | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          beneficiary?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          raised_amount?: number
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          target_amount?: number | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          beneficiary?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          raised_amount?: number
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          target_amount?: number | null
          title?: string
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
          title: string | null
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
          title?: string | null
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
          title?: string | null
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
          display_order: number
          event_date: string | null
          id: string
          location: string | null
          slug: string
          title: string
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
          display_order?: number
          event_date?: string | null
          id?: string
          location?: string | null
          slug: string
          title: string
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
          display_order?: number
          event_date?: string | null
          id?: string
          location?: string | null
          slug?: string
          title?: string
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
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          gallery_id: string
          id?: string
          image: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          gallery_id?: string
          id?: string
          image?: string
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
      homepage_sections: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          section_key: string
          subtitle: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          section_key: string
          subtitle?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          section_key?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      homepage_slides: {
        Row: {
          active: boolean
          button_text: string | null
          button_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          end_date: string | null
          id: string
          image: string | null
          start_date: string | null
          subtitle: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          end_date?: string | null
          id?: string
          image?: string | null
          start_date?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          end_date?: string | null
          id?: string
          image?: string | null
          start_date?: string | null
          subtitle?: string | null
          title?: string
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
          display_order: number
          duration: string | null
          eligibility: string | null
          end_date: string | null
          fee: number
          id: string
          name: string
          seats: number | null
          slug: string
          start_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          display_order?: number
          duration?: string | null
          eligibility?: string | null
          end_date?: string | null
          fee?: number
          id?: string
          name: string
          seats?: number | null
          slug: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          display_order?: number
          duration?: string | null
          eligibility?: string | null
          end_date?: string | null
          fee?: number
          id?: string
          name?: string
          seats?: number | null
          slug?: string
          start_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          public_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_homepage: boolean
          external_url: string | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          source_name: string | null
          status: Database["public"]["Enums"]["content_status"]
          thumbnail: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_homepage?: boolean
          external_url?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          source_name?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_homepage?: boolean
          external_url?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          source_name?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      organization_settings: {
        Row: {
          about_short: string | null
          address: string | null
          city: string | null
          created_at: string
          district: string | null
          donation_text: string | null
          email: string | null
          facebook: string | null
          favicon: string | null
          footer_text: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          logo: string | null
          organization_name: string
          phone: string | null
          pincode: string | null
          state: string | null
          tagline: string | null
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
          address?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          donation_text?: string | null
          email?: string | null
          facebook?: string | null
          favicon?: string | null
          footer_text?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          organization_name?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          tagline?: string | null
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
          address?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          donation_text?: string | null
          email?: string | null
          facebook?: string | null
          favicon?: string | null
          footer_text?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo?: string | null
          organization_name?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          tagline?: string | null
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
      payment_settings: {
        Row: {
          created_at: string
          currency: string
          id: string
          internship_fee: number
          max_donation_amount: number
          min_donation_amount: number
          online_payments_enabled: boolean
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
      reels: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          platform: string
          thumbnail: string | null
          title: string
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
          platform?: string
          thumbnail?: string | null
          title: string
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
          platform?: string
          thumbnail?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          video_url?: string
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
      seva_projects: {
        Row: {
          active: boolean
          city: string | null
          coordinator: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          featured_image: string | null
          icon: string | null
          id: string
          location: string | null
          name: string
          phone: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          state: string | null
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
          display_order?: number
          featured_image?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          state?: string | null
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
          display_order?: number
          featured_image?: string | null
          icon?: string | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          state?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
          name: string
          photo: string | null
          role: string | null
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
          name: string
          photo?: string | null
          role?: string | null
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
          name?: string
          photo?: string | null
          role?: string | null
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
          platform: string
          thumbnail: string | null
          title: string
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
          platform?: string
          thumbnail?: string | null
          title: string
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
          platform?: string
          thumbnail?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          video_url?: string
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
      [_ in never]: never
    }
    Functions: {
      next_donation_id: { Args: never; Returns: string }
      next_receipt_number: { Args: never; Returns: string }
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
