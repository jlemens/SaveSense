// Placeholder for generated database types
// In production, generate this using: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
export type Database = {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
  };
};

