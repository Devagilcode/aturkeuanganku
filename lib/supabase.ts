import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type TransactionRow = {
  id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string;
  date: string;
};

export type BudgetRow = {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
};

export type SavingsGoalRow = {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  created_at: string;
};

type Database = {
  public: {
    Tables: {
      transactions: {
        Row: TransactionRow;
        Insert: TransactionRow;
        Update: Partial<TransactionRow>;
        Relationships: [];
      };
      budgets: {
        Row: BudgetRow;
        Insert: Omit<BudgetRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<BudgetRow, "id" | "user_id">>;
        Relationships: [];
      };
      savings_goals: {
        Row: SavingsGoalRow;
        Insert: Omit<SavingsGoalRow, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<SavingsGoalRow, "id" | "user_id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient<Database> | undefined;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase belum dikonfigurasi.");
  }

  client ??= createClient<Database>(supabaseUrl, supabaseAnonKey);
  return client;
}
