export interface PageView {
  path: string;
  views: number;
}

export interface RecentActivity {
  timestamp: string;
  page: string;
  type: 'page_view' | 'form_submit' | 'interaction';
}

export interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  totalVisits: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: PageView[];
  recentActivity: RecentActivity[];
}
