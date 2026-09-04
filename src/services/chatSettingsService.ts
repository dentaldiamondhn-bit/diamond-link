import { supabase } from '../lib/supabase';

export interface ChatSettings {
  user_id: string;
  wallpaper_type: 'default' | 'custom';
  background_image_url: string | null;
  my_bubble_color: string;
  other_bubble_color: string;
  updated_at?: string;
}

const DEFAULTS: Pick<
  ChatSettings,
  'wallpaper_type' | 'background_image_url' | 'my_bubble_color' | 'other_bubble_color'
> = {
  wallpaper_type: 'default',
  background_image_url: null,
  my_bubble_color: '#2563eb',
  other_bubble_color: '#ffffff',
};

export class ChatSettingsService {
  /** Fetch a user's chat settings, returning defaults when no row exists. */
  static async getSettings(userId: string): Promise<ChatSettings> {
    try {
      const { data, error } = await supabase
        .from('chat_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching chat settings:', error);
        return { user_id: userId, ...DEFAULTS } as ChatSettings;
      }
      if (data) return data as ChatSettings;
      return { user_id: userId, ...DEFAULTS } as ChatSettings;
    } catch (error) {
      console.error('Unexpected error fetching chat settings:', error);
      return { user_id: userId, ...DEFAULTS } as ChatSettings;
    }
  }

  /** Upsert a user's chat settings and return the persisted row. */
  static async updateSettings(
    userId: string,
    patch: Partial<
      Pick<ChatSettings, 'wallpaper_type' | 'background_image_url' | 'my_bubble_color' | 'other_bubble_color'>
    >
  ): Promise<ChatSettings | null> {
    try {
      const { data, error } = await supabase
        .from('chat_settings')
        .upsert(
          {
            user_id: userId,
            ...DEFAULTS,
            ...patch,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) {
        console.error('Error saving chat settings:', error);
        return null;
      }
      return data as ChatSettings;
    } catch (error) {
      console.error('Unexpected error saving chat settings:', error);
      return null;
    }
  }
}
