// ============================================================
// BatchKit — Supabase Database Types
// Auto-generate with: npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
// (Run after `npx supabase start` with local emulator)
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "member";
export type BuyRoundStatus =
  | "open"
  | "locked"
  | "submitted"
  | "shipped"
  | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          role: UserRole;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          role?: UserRole;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          role?: UserRole;
          invited_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pending_invites: {
        Row: {
          id: string;
          email: string;
          invited_by: string;
          token: string;
          created_at: string;
          accepted_at: string | null;
          expires_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          invited_by: string;
          token?: string;
          created_at?: string;
          accepted_at?: string | null;
          expires_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          invited_by?: string;
          token?: string;
          created_at?: string;
          accepted_at?: string | null;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pending_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      peptides: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "peptides_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      peptide_variants: {
        Row: {
          id: string;
          peptide_id: string;
          weight_label: string;
          sku: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          peptide_id: string;
          weight_label: string;
          sku?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          peptide_id?: string;
          weight_label?: string;
          sku?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "peptide_variants_peptide_id_fkey";
            columns: ["peptide_id"];
            isOneToOne: false;
            referencedRelation: "peptides";
            referencedColumns: ["id"];
          },
        ];
      };
      buy_rounds: {
        Row: {
          id: string;
          variant_id: string;
          price_per_kit: number;
          moq: number;
          status: BuyRoundStatus;
          opened_at: string;
          locked_at: string | null;
          submitted_at: string | null;
          shipped_at: string | null;
          notes: string | null;
          created_by: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          price_per_kit: number;
          moq?: number;
          status?: BuyRoundStatus;
          opened_at?: string;
          locked_at?: string | null;
          submitted_at?: string | null;
          shipped_at?: string | null;
          notes?: string | null;
          created_by: string;
        };
        Update: {
          id?: string;
          variant_id?: string;
          price_per_kit?: number;
          moq?: number;
          status?: BuyRoundStatus;
          opened_at?: string;
          locked_at?: string | null;
          submitted_at?: string | null;
          shipped_at?: string | null;
          notes?: string | null;
          created_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buy_rounds_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "peptide_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "buy_rounds_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      commitments: {
        Row: {
          id: string;
          buy_round_id: string;
          member_id: string;
          kit_quantity: number;
          committed_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buy_round_id: string;
          member_id: string;
          kit_quantity: number;
          committed_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buy_round_id?: string;
          member_id?: string;
          kit_quantity?: number;
          committed_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "commitments_buy_round_id_fkey";
            columns: ["buy_round_id"];
            isOneToOne: false;
            referencedRelation: "buy_rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commitments_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          commitment_id: string;
          amount_paid: number;
          marked_paid_at: string;
          marked_by: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          commitment_id: string;
          amount_paid: number;
          marked_paid_at?: string;
          marked_by: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          commitment_id?: string;
          amount_paid?: number;
          marked_paid_at?: string;
          marked_by?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_commitment_id_fkey";
            columns: ["commitment_id"];
            isOneToOne: false;
            referencedRelation: "commitments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_marked_by_fkey";
            columns: ["marked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_moq_progress: {
        Args: { p_buy_round_id: string };
        Returns: {
          committed_kits: number;
          moq: number;
          status: BuyRoundStatus;
        }[];
      };
      get_member_payment_status: {
        Args: { p_buy_round_id: string };
        Returns: {
          kit_quantity: number;
          price_per_kit: number;
          amount_owed: number;
          total_paid: number;
          payment_status: "paid" | "awaiting";
        }[];
      };
      check_invite_token: {
        Args: { p_token: string };
        Returns: { valid: boolean; email?: string; expires_at?: string } | null;
      };
      accept_invite: {
        Args: { p_token: string; p_display_name: string };
        Returns: { success?: boolean; error?: string } | null;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      buy_round_status: BuyRoundStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
