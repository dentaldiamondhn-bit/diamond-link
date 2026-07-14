const META_API_VERSION = 'v22.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

function getToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN not configured');
  return token;
}

function getDefaultAccount(): string {
  return process.env.META_DEFAULT_AD_ACCOUNT_ID || '';
}

async function graphFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${META_BASE}/${path}`);
  url.searchParams.set('access_token', getToken());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Meta API error');
  return data;
}

export interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  balance: number;
  amount_spent: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget: string;
  lifetime_budget: string;
  start_time: string;
  stop_time: string;
  created_time: string;
}

export interface AdSet {
  id: string;
  name: string;
  status: string;
  daily_budget: string;
  bid_amount: string;
  start_time: string;
  end_time: string;
  targeting: any;
}

export interface Ad {
  id: string;
  name: string;
  status: string;
  creative: { id: string; title?: string; body?: string };
  created_time: string;
}

export interface Insights {
  date_start: string;
  date_stop: string;
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  cpc: string;
  cpm: string;
  reach: string;
  frequency: string;
  actions?: { action_type: string; value: string }[];
}

export class MetaAdsService {
  static async listAdAccounts(): Promise<AdAccount[]> {
    const userId = 'me';
    const data = await graphFetch<{ data: AdAccount[] }>(`${userId}/adaccounts`, {
      fields: 'id,name,account_status,currency,balance,amount_spent',
    });
    return data.data || [];
  }

  static async getAccountInsights(accountId: string, datePreset = 'last_30d'): Promise<Insights[]> {
    const data = await graphFetch<{ data: Insights[] }>(`${accountId}/insights`, {
      fields: 'date_start,date_stop,impressions,clicks,spend,ctr,cpc,cpm,reach,frequency,actions',
      date_preset: datePreset,
      level: 'account',
    });
    return data.data || [];
  }

  static async getCampaigns(accountId: string): Promise<Campaign[]> {
    const data = await graphFetch<{ data: Campaign[] }>(`${accountId}/campaigns`, {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time',
      limit: '50',
    });
    return data.data || [];
  }

  static async getCampaignInsights(campaignId: string, datePreset = 'last_30d'): Promise<Insights[]> {
    const data = await graphFetch<{ data: Insights[] }>(`${campaignId}/insights`, {
      fields: 'date_start,date_stop,impressions,clicks,spend,ctr,cpc,cpm,reach,frequency,actions',
      date_preset: datePreset,
      level: 'campaign',
    });
    return data.data || [];
  }

  static async getAdSets(campaignId: string): Promise<AdSet[]> {
    const data = await graphFetch<{ data: AdSet[] }>(`${campaignId}/adsets`, {
      fields: 'id,name,status,daily_budget,bid_amount,start_time,end_time,targeting',
      limit: '50',
    });
    return data.data || [];
  }

  static async getAds(adSetId: string): Promise<Ad[]> {
    const data = await graphFetch<{ data: Ad[] }>(`${adSetId}/ads`, {
      fields: 'id,name,status,creative{id,title,body},created_time',
      limit: '50',
    });
    return data.data || [];
  }

  static isConfigured(): boolean {
    return !!process.env.META_ACCESS_TOKEN && !!process.env.META_DEFAULT_AD_ACCOUNT_ID;
  }

  static getDefaultAccountId(): string {
    return getDefaultAccount();
  }
}
