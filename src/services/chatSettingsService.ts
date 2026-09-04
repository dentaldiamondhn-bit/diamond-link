import { supabase } from '../lib/supabase';

export interface ChatSettings {
  user_id: string;
  conversation_id: string | null;
  wallpaper_type: 'default' | 'custom';
  background_image_url: string | null;
  my_bubble_color: string;
  other_bubble_color: string;
  updated_at?: string;
}

export type ChatSettingsUpdate = Partial<
  Pick<
    ChatSettings,
    'wallpaper_type' | 'background_image_url' | 'my_bubble_color' | 'other_bubble_color'
  >
>;

const DEFAULT_FIELDS: ChatSettingsUpdate = {
  wallpaper_type: 'default',
  background_image_url: null,
  my_bubble_color: '#2563eb',
  other_bubble_color: '#ffffff',
};

/**
 * Chat settings are scoped per (user, conversation) with a global fallback:
 *   * conversation_id NULL  -> the user's global default row
 *   * conversation_id set   -> a per-chat/group override
 * Effective settings for (user, conversation) resolve to the scoped row when it
 * exists, otherwise the global (NULL) row, otherwise app-level DEFAULTS.
 */
export class ChatSettingsService {
  /** Fetch effective settings for a user + conversation (scoped -> global -> defaults). */
  static async getSettings(
    userId: string,
    conversationId: string | null = null
  ): Promise<ChatSettings> {
    try {
      // Per-conversation override, if present.
      if (conversationId) {
        const { data, error } = await supabase
          .from('chat_settings')
          .select('*')
          .eq('user_id', userId)
          .eq('conversation_id', conversationId)
          .maybeSingle();
        if (!error && data) return data as ChatSettings;
      }

      // Global default row, if present.
      const { data, error } = await supabase
        .from('chat_settings')
        .select('*')
        .eq('user_id', userId)
        .is('conversation_id', null)
        .maybeSingle();
      if (!error && data) return data as ChatSettings;

      return { user_id: userId, conversation_id: conversationId, ...DEFAULT_FIELDS } as ChatSettings;
    } catch (error) {
      console.error('Unexpected error fetching chat settings:', error);
      return { user_id: userId, conversation_id: conversationId, ...DEFAULT_FIELDS } as ChatSettings;
    }
  }

  /**
   * Persist settings for a user + conversation scope and return the effective
   * row. Writes to (or creates) the row for exactly that scope.
   */
  static async updateSettings(
    userId: string,
    conversationId: string | null,
    patch: ChatSettingsUpdate
  ): Promise<ChatSettings | null> {
    const payload = { ...patch, updated_at: new Date().toISOString() };
    const base = supabase.from('chat_settings');

    try {
      const scopeQuery = conversationId
        ? base.select('user_id').eq('user_id', userId).eq('conversation_id', conversationId)
        : base.select('user_id').eq('user_id', userId).is('conversation_id', null);

      const { data: existing, error: readError } = await scopeQuery.maybeSingle();
      if (readError) {
        console.error('Error reading chat settings before save:', readError.message);
        return null;
      }

      if (existing) {
        const updateQuery = conversationId
          ? base.update(payload).eq('user_id', userId).eq('conversation_id', conversationId)
          : base.update(payload).eq('user_id', userId).is('conversation_id', null);
        const { error: updateError } = await updateQuery;
        if (updateError) {
          console.error('Error updating chat settings:', updateError.message);
          return null;
        }
      } else {
        const { error: insertError } = await base.insert({
          user_id: userId,
          conversation_id: conversationId ?? null,
          ...DEFAULT_FIELDS,
          ...patch,
          updated_at: new Date().toISOString(),
        });
        if (insertError) {
          console.error('Error inserting chat settings:', insertError.message);
          return null;
        }
      }

      return this.getSettings(userId, conversationId);
    } catch (error) {
      console.error('Unexpected error saving chat settings:', error);
      return null;
    }
  }
}
