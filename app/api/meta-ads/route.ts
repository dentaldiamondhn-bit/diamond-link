import { NextRequest, NextResponse } from 'next/server';
import { MetaAdsService } from '@/services/metaAdsService';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const accountId = searchParams.get('accountId') || MetaAdsService.getDefaultAccountId();
    const campaignId = searchParams.get('campaignId');
    const datePreset = searchParams.get('datePreset') || 'last_30d';

    if (!MetaAdsService.isConfigured()) {
      return NextResponse.json({ configured: false, error: 'Meta Ads not configured' }, { status: 200 });
    }

    let data: any;

    switch (action) {
      case 'accounts':
        data = await MetaAdsService.listAdAccounts();
        break;
      case 'campaigns':
        data = await MetaAdsService.getCampaigns(accountId);
        break;
      case 'campaign-insights':
        if (!campaignId) throw new Error('campaignId required');
        data = await MetaAdsService.getCampaignInsights(campaignId, datePreset);
        break;
      case 'adsets':
        if (!campaignId) throw new Error('campaignId required');
        data = await MetaAdsService.getAdSets(campaignId);
        break;
      case 'ads':
        if (!campaignId) throw new Error('campaignId required');
        data = await MetaAdsService.getAds(campaignId);
        break;
      case 'account-insights':
        data = await MetaAdsService.getAccountInsights(accountId, datePreset);
        break;
      default:
        return NextResponse.json({
          configured: true,
          defaultAccountId: accountId,
          actions: ['accounts', 'campaigns', 'account-insights', 'campaign-insights', 'adsets', 'ads'],
        });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Meta Ads API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
