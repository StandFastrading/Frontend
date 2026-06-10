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
      alembic_version: {
        Row: {
          version_num: string
        }
        Insert: {
          version_num: string
        }
        Update: {
          version_num?: string
        }
        Relationships: []
      }
      behavior_events: {
        Row: {
          account_risk_percent: number | null
          client_id: string | null
          created_at: string
          decision: string | null
          direction: string | null
          display_description: string
          display_title: string
          event_type: string
          id: string
          metadata: Json
          session_id: string | null
          setup_type: string | null
          severity: string
          source: string
          symbol: string | null
          timestamp: string
          total_risk: number | null
          trade_id: string | null
          trading_date: string | null
          triggered_rules: Json
          user_id: string
        }
        Insert: {
          account_risk_percent?: number | null
          client_id?: string | null
          created_at?: string
          decision?: string | null
          direction?: string | null
          display_description?: string
          display_title: string
          event_type: string
          id?: string
          metadata?: Json
          session_id?: string | null
          setup_type?: string | null
          severity: string
          source: string
          symbol?: string | null
          timestamp: string
          total_risk?: number | null
          trade_id?: string | null
          trading_date?: string | null
          triggered_rules?: Json
          user_id: string
        }
        Update: {
          account_risk_percent?: number | null
          client_id?: string | null
          created_at?: string
          decision?: string | null
          direction?: string | null
          display_description?: string
          display_title?: string
          event_type?: string
          id?: string
          metadata?: Json
          session_id?: string | null
          setup_type?: string | null
          severity?: string
          source?: string
          symbol?: string | null
          timestamp?: string
          total_risk?: number | null
          trade_id?: string | null
          trading_date?: string | null
          triggered_rules?: Json
          user_id?: string
        }
        Relationships: []
      }
      daily_reflections: {
        Row: {
          answers: Json
          created_at: string
          emotional_notes: string
          freeform_notes: string
          id: string
          insight: string
          saved_at: string
          session_id: string | null
          summary: Json
          tomorrow_focus: string
          trading_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          emotional_notes?: string
          freeform_notes?: string
          id?: string
          insight?: string
          saved_at?: string
          session_id?: string | null
          summary?: Json
          tomorrow_focus?: string
          trading_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          emotional_notes?: string
          freeform_notes?: string
          id?: string
          insight?: string
          saved_at?: string
          session_id?: string | null
          summary?: Json
          tomorrow_focus?: string
          trading_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interventions: {
        Row: {
          account_risk_percent: number | null
          account_size: number | null
          behavior_event_id: string | null
          client_id: string | null
          created_at: string
          decision: string
          direction: string | null
          entry_price: number | null
          event_type: string
          id: string
          market_type: string | null
          position_size: number | null
          reward_risk_ratio: number | null
          session_id: string | null
          setup_type: string | null
          severity: string
          source: string
          stop_price: number | null
          symbol: string | null
          target_price: number | null
          timestamp: string
          total_risk: number | null
          trading_date: string | null
          triggered_rules: Json
          user_id: string
          validation_status: string | null
          violation_count: number | null
          warning_count: number | null
        }
        Insert: {
          account_risk_percent?: number | null
          account_size?: number | null
          behavior_event_id?: string | null
          client_id?: string | null
          created_at?: string
          decision: string
          direction?: string | null
          entry_price?: number | null
          event_type: string
          id?: string
          market_type?: string | null
          position_size?: number | null
          reward_risk_ratio?: number | null
          session_id?: string | null
          setup_type?: string | null
          severity: string
          source?: string
          stop_price?: number | null
          symbol?: string | null
          target_price?: number | null
          timestamp: string
          total_risk?: number | null
          trading_date?: string | null
          triggered_rules?: Json
          user_id: string
          validation_status?: string | null
          violation_count?: number | null
          warning_count?: number | null
        }
        Update: {
          account_risk_percent?: number | null
          account_size?: number | null
          behavior_event_id?: string | null
          client_id?: string | null
          created_at?: string
          decision?: string
          direction?: string | null
          entry_price?: number | null
          event_type?: string
          id?: string
          market_type?: string | null
          position_size?: number | null
          reward_risk_ratio?: number | null
          session_id?: string | null
          setup_type?: string | null
          severity?: string
          source?: string
          stop_price?: number | null
          symbol?: string | null
          target_price?: number | null
          timestamp?: string
          total_risk?: number | null
          trading_date?: string | null
          triggered_rules?: Json
          user_id?: string
          validation_status?: string | null
          violation_count?: number | null
          warning_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          migrated_from_local_at: string | null
          onboarding_complete: boolean
          onboarding_completed_at: string | null
          onboarding_step: number
          plan: string
          selected_markets: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string
          id: string
          migrated_from_local_at?: string | null
          onboarding_complete?: boolean
          onboarding_completed_at?: string | null
          onboarding_step?: number
          plan?: string
          selected_markets?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          migrated_from_local_at?: string | null
          onboarding_complete?: boolean
          onboarding_completed_at?: string | null
          onboarding_step?: number
          plan?: string
          selected_markets?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      risk_rules: {
        Row: {
          account_currency: string
          account_size: number
          account_type: string
          allowed_setups: string[]
          base_risk_per_trade_percent: number
          cooldown_after_loss_minutes: number
          lockout_after_max_loss: boolean
          max_adds_per_trade: number
          max_consecutive_losses: number
          max_daily_loss_percent: number
          max_daily_trades: number
          max_dollar_risk_per_trade: number
          max_open_positions: number
          max_position_size: number
          max_red_trades: number
          minimum_reward_risk: number
          no_averaging_down: boolean
          no_overtrading: boolean
          no_reentry_within_minutes: number
          no_revenge_trading: boolean
          no_trades_outside_allowed_setups: boolean
          no_trading_after_emotional_warning: boolean
          reflection_prompt_after_override: boolean
          require_confirmation_before_override: boolean
          require_stop_loss: boolean
          setup_must_be_approved: boolean
          updated_at: string
          user_id: string
          warning_level: string
        }
        Insert: {
          account_currency?: string
          account_size?: number
          account_type?: string
          allowed_setups?: string[]
          base_risk_per_trade_percent?: number
          cooldown_after_loss_minutes?: number
          lockout_after_max_loss?: boolean
          max_adds_per_trade?: number
          max_consecutive_losses?: number
          max_daily_loss_percent?: number
          max_daily_trades?: number
          max_dollar_risk_per_trade?: number
          max_open_positions?: number
          max_position_size?: number
          max_red_trades?: number
          minimum_reward_risk?: number
          no_averaging_down?: boolean
          no_overtrading?: boolean
          no_reentry_within_minutes?: number
          no_revenge_trading?: boolean
          no_trades_outside_allowed_setups?: boolean
          no_trading_after_emotional_warning?: boolean
          reflection_prompt_after_override?: boolean
          require_confirmation_before_override?: boolean
          require_stop_loss?: boolean
          setup_must_be_approved?: boolean
          updated_at?: string
          user_id: string
          warning_level?: string
        }
        Update: {
          account_currency?: string
          account_size?: number
          account_type?: string
          allowed_setups?: string[]
          base_risk_per_trade_percent?: number
          cooldown_after_loss_minutes?: number
          lockout_after_max_loss?: boolean
          max_adds_per_trade?: number
          max_consecutive_losses?: number
          max_daily_loss_percent?: number
          max_daily_trades?: number
          max_dollar_risk_per_trade?: number
          max_open_positions?: number
          max_position_size?: number
          max_red_trades?: number
          minimum_reward_risk?: number
          no_averaging_down?: boolean
          no_overtrading?: boolean
          no_reentry_within_minutes?: number
          no_revenge_trading?: boolean
          no_trades_outside_allowed_setups?: boolean
          no_trading_after_emotional_warning?: boolean
          reflection_prompt_after_override?: boolean
          require_confirmation_before_override?: boolean
          require_stop_loss?: boolean
          setup_must_be_approved?: boolean
          updated_at?: string
          user_id?: string
          warning_level?: string
        }
        Relationships: []
      }
      session_notes: {
        Row: {
          category: string
          client_id: string | null
          content: string
          created_at: string
          id: string
          session_id: string | null
          trading_date: string | null
          user_id: string
        }
        Insert: {
          category?: string
          client_id?: string | null
          content: string
          created_at?: string
          id?: string
          session_id?: string | null
          trading_date?: string | null
          user_id: string
        }
        Update: {
          category?: string
          client_id?: string | null
          content?: string
          created_at?: string
          id?: string
          session_id?: string | null
          trading_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trade_monitoring_events: {
        Row: {
          client_id: string | null
          created_at: string
          deviations: Json
          id: string
          recommendations: Json
          session_id: string | null
          severity: string
          timestamp: string
          trade_id: string
          trading_date: string | null
          update: Json
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          deviations?: Json
          id?: string
          recommendations?: Json
          session_id?: string | null
          severity: string
          timestamp: string
          trade_id: string
          trading_date?: string | null
          update: Json
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          deviations?: Json
          id?: string
          recommendations?: Json
          session_id?: string | null
          severity?: string
          timestamp?: string
          trade_id?: string
          trading_date?: string | null
          update?: Json
          user_id?: string
        }
        Relationships: []
      }
      trade_reflections: {
        Row: {
          answers: Json
          created_at: string
          id: string
          saved_at: string
          trade_id: string
          trading_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          saved_at?: string
          trade_id: string
          trading_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          saved_at?: string
          trade_id?: string
          trading_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          account_risk_percent: number | null
          activated_at: string
          approval_status: string
          approval_warnings: Json
          approved_at: string
          client_id: string | null
          closed_at: string | null
          created_at: string
          current_account_risk_percent: number | null
          current_avg_entry: number
          current_position_size: number
          current_reward_risk_ratio: number | null
          current_risk: number | null
          current_stop_price: number | null
          current_target_price: number | null
          deviation_count: number
          direction: string
          entry_price: number
          exit_notes: string | null
          exit_outcome: string | null
          exit_price: number | null
          exit_reason: string | null
          exit_reflection: string | null
          id: string
          loss_reduced: boolean | null
          loss_reduction_amount: number | null
          loss_reduction_percent: number | null
          market_type: string
          mistake_count: number
          mistake_flagged: boolean
          mistake_note: string | null
          original_risk: number | null
          override_accepted: boolean
          position_size: number
          realized_pnl: number | null
          realized_r: number | null
          reward_risk_ratio: number | null
          session_id: string | null
          setup_type: string
          source: string
          status: string
          stop_price: number | null
          symbol: string
          target_price: number | null
          trade_plan: string
          trading_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_risk_percent?: number | null
          activated_at: string
          approval_status?: string
          approval_warnings?: Json
          approved_at: string
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          current_account_risk_percent?: number | null
          current_avg_entry: number
          current_position_size: number
          current_reward_risk_ratio?: number | null
          current_risk?: number | null
          current_stop_price?: number | null
          current_target_price?: number | null
          deviation_count?: number
          direction: string
          entry_price: number
          exit_notes?: string | null
          exit_outcome?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_reflection?: string | null
          id?: string
          loss_reduced?: boolean | null
          loss_reduction_amount?: number | null
          loss_reduction_percent?: number | null
          market_type: string
          mistake_count?: number
          mistake_flagged?: boolean
          mistake_note?: string | null
          original_risk?: number | null
          override_accepted?: boolean
          position_size: number
          realized_pnl?: number | null
          realized_r?: number | null
          reward_risk_ratio?: number | null
          session_id?: string | null
          setup_type?: string
          source?: string
          status?: string
          stop_price?: number | null
          symbol: string
          target_price?: number | null
          trade_plan?: string
          trading_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_risk_percent?: number | null
          activated_at?: string
          approval_status?: string
          approval_warnings?: Json
          approved_at?: string
          client_id?: string | null
          closed_at?: string | null
          created_at?: string
          current_account_risk_percent?: number | null
          current_avg_entry?: number
          current_position_size?: number
          current_reward_risk_ratio?: number | null
          current_risk?: number | null
          current_stop_price?: number | null
          current_target_price?: number | null
          deviation_count?: number
          direction?: string
          entry_price?: number
          exit_notes?: string | null
          exit_outcome?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          exit_reflection?: string | null
          id?: string
          loss_reduced?: boolean | null
          loss_reduction_amount?: number | null
          loss_reduction_percent?: number | null
          market_type?: string
          mistake_count?: number
          mistake_flagged?: boolean
          mistake_note?: string | null
          original_risk?: number | null
          override_accepted?: boolean
          position_size?: number
          realized_pnl?: number | null
          realized_r?: number | null
          reward_risk_ratio?: number | null
          session_id?: string | null
          setup_type?: string
          source?: string
          status?: string
          stop_price?: number | null
          symbol?: string
          target_price?: number | null
          trade_plan?: string
          trading_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_sessions: {
        Row: {
          client_id: string | null
          closed_consecutive_losses: number | null
          closed_daily_loss_breached: boolean | null
          closed_daily_loss_used_percent: number | null
          closed_red_trades: number | null
          closed_trades_taken: number | null
          created_at: string
          custom_label: string | null
          ended_at: string | null
          id: string
          session_type: string
          started_at: string
          status: string
          trading_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          closed_consecutive_losses?: number | null
          closed_daily_loss_breached?: boolean | null
          closed_daily_loss_used_percent?: number | null
          closed_red_trades?: number | null
          closed_trades_taken?: number | null
          created_at?: string
          custom_label?: string | null
          ended_at?: string | null
          id?: string
          session_type?: string
          started_at?: string
          status?: string
          trading_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          closed_consecutive_losses?: number | null
          closed_daily_loss_breached?: boolean | null
          closed_daily_loss_used_percent?: number | null
          closed_red_trades?: number | null
          closed_trades_taken?: number | null
          created_at?: string
          custom_label?: string | null
          ended_at?: string | null
          id?: string
          session_type?: string
          started_at?: string
          status?: string
          trading_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          onboarding_completed_at: string | null
          primary_market: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          onboarding_completed_at?: string | null
          primary_market?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          onboarding_completed_at?: string | null
          primary_market?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
