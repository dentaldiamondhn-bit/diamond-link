'use client';

import { useState, useEffect } from 'react';
import {
  FiBarChart2, FiTarget, FiDollarSign, FiTrendingUp,
  FiRefreshCw, FiChevronDown, FiChevronRight, FiAlertCircle,
  FiCheckCircle, FiSettings, FiExternalLink
} from 'react-icons/fi';

interface Campaign {
  id: string; name: string; status: string; objective: string;
  daily_budget: string; lifetime_budget: string; start_time: string; stop_time: string;
}

interface Insights {
  date_start: string; date_stop: string; impressions: string;
  clicks: string; spend: string; ctr: string; cpc: string; cpm: string;
  reach: string; frequency: string;
  actions?: { action_type: string; value: string }[];
}

interface AdSet { id: string; name: string; status: string; daily_budget: string; bid_amount: string; }
interface Ad { id: string; name: string; status: string; }

function formatCurrency(amount: string) {
  const n = parseFloat(amount);
  return isNaN(n) ? '$0' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatNumber(n: string) {
  const v = parseInt(n);
  return isNaN(v) ? '0' : v.toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    ARCHIVED: 'bg-gray-100 text-gray-600',
    DELETED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

export default function FacebookAdsPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [insights, setInsights] = useState<Insights[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const configRes = await fetch('/api/meta-ads');
      const configData = await configRes.json();
      setConfigured(configData.configured);
      if (!configData.configured) { setLoading(false); return; }

      const [campRes, insightRes] = await Promise.all([
        fetch('/api/meta-ads?action=campaigns'),
        fetch('/api/meta-ads?action=account-insights'),
      ]);
      const campData = await campRes.json();
      const insightData = await insightRes.json();
      setCampaigns(campData.data || []);
      setInsights(insightData.data || []);
    } catch (e: any) {
      setConfigError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaign = async (campaignId: string) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
      setAdSets([]);
      setAds([]);
      setSelectedCampaign(null);
      return;
    }
    setExpandedCampaign(campaignId);
    setSelectedCampaign(campaignId);
    try {
      const [adsetsRes, adsRes] = await Promise.all([
        fetch(`/api/meta-ads?action=adsets&campaignId=${campaignId}`),
        fetch(`/api/meta-ads?action=ads&campaignId=${campaignId}`),
      ]);
      const adsetsData = await adsetsRes.json();
      const adsData = await adsRes.json();
      setAdSets(adsetsData.data || []);
      setAds(adsData.data || []);
    } catch { }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (configured === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <FiSettings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Meta Ads</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Configure your Meta API credentials to get started.
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-left text-sm space-y-2 mb-6">
            <p className="font-medium text-gray-700 dark:text-gray-300">Set these environment variables:</p>
            <code className="block bg-gray-200 dark:bg-gray-700 rounded p-2 text-xs">
              META_ACCESS_TOKEN=your_token<br />
              META_DEFAULT_AD_ACCOUNT_ID=act_XXXXXXXXX
            </code>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Or run: <code className="bg-gray-200 dark:bg-gray-700 rounded px-1">.venv/bin/meta-ads-setup --interactive</code>
            </p>
          </div>
          <button
            onClick={loadAll}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            <FiRefreshCw className="w-4 h-4 inline mr-2" />
            Check Again
          </button>
        </div>
      </div>
    );
  }

  const totalSpend = insights.reduce((s, i) => s + parseFloat(i.spend || '0'), 0);
  const totalImpressions = insights.reduce((s, i) => s + parseInt(i.impressions || '0'), 0);
  const totalClicks = insights.reduce((s, i) => s + parseInt(i.clicks || '0'), 0);
  const avgCTR = totalImpressions ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facebook Ads</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Meta Ads performance dashboard</p>
        </div>
        <button
          onClick={loadAll}
          className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow hover:shadow-md transition-all text-gray-600 dark:text-gray-300"
        >
          <FiRefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <FiDollarSign className="w-4 h-4" /> Total Spend
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalSpend.toFixed(2))}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <FiTrendingUp className="w-4 h-4" /> Impressions
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(totalImpressions.toString())}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <FiBarChart2 className="w-4 h-4" /> Clicks
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(totalClicks.toString())}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <FiTarget className="w-4 h-4" /> CTR
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgCTR}%</p>
        </div>
      </div>

      {/* Account-level Insights */}
      {insights.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow mb-6 overflow-x-auto">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Account Insights (Last 30 Days)</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="p-3">Period</th>
                <th className="p-3">Impressions</th>
                <th className="p-3">Reach</th>
                <th className="p-3">Clicks</th>
                <th className="p-3">Spend</th>
                <th className="p-3">CTR</th>
                <th className="p-3">CPC</th>
                <th className="p-3">CPM</th>
                <th className="p-3">Frequency</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((i, idx) => (
                <tr key={idx} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="p-3 font-medium text-gray-900 dark:text-white">{i.date_start} – {i.date_stop}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{formatNumber(i.impressions)}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{formatNumber(i.reach)}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{formatNumber(i.clicks)}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{formatCurrency(i.spend)}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{parseFloat(i.ctr || '0').toFixed(2)}%</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{formatCurrency(i.cpc)}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{formatCurrency(i.cpm)}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{parseFloat(i.frequency || '0').toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Campaigns */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Campaigns ({campaigns.length})</h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FiAlertCircle className="w-8 h-8 mx-auto mb-2" />
            No campaigns found
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {campaigns.map((camp) => (
              <div key={camp.id}>
                <button
                  onClick={() => toggleCampaign(camp.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 text-left"
                >
                  {expandedCampaign === camp.id ? <FiChevronDown className="w-4 h-4 text-gray-400" /> : <FiChevronRight className="w-4 h-4 text-gray-400" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">{camp.name}</span>
                      <StatusBadge status={camp.status} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {camp.objective} · Budget: {camp.daily_budget ? `${formatCurrency(camp.daily_budget)}/day` : camp.lifetime_budget ? formatCurrency(camp.lifetime_budget) : 'N/A'}
                    </p>
                  </div>
                </button>
                {expandedCampaign === camp.id && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 px-4 pb-4">
                    {adSets.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Ad Sets</p>
                        <div className="space-y-1">
                          {adSets.map(as => (
                            <div key={as.id} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm">
                              <span className="font-medium text-gray-900 dark:text-white truncate flex-1">{as.name}</span>
                              <StatusBadge status={as.status} />
                              <span className="text-gray-500 text-xs">{as.daily_budget ? formatCurrency(as.daily_budget) : ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {ads.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Ads</p>
                        <div className="space-y-1">
                          {ads.map(a => (
                            <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm">
                              <span className="font-medium text-gray-900 dark:text-white truncate flex-1">{a.name}</span>
                              <StatusBadge status={a.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
