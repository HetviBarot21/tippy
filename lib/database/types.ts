import { Database } from '../../types_db';

// Re-export database types for convenience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Query result types
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

export interface QueryListResult<T> {
  data: T[] | null;
  error: Error | null;
  count?: number | null;
}

// Tenant context type for RLS
export interface TenantContext {
  restaurant_id: string;
  user_id?: string;
}

// Database error types
export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}