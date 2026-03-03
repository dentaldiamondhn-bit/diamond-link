package com.dentaldiamondhn.calendarwidget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * Calendar Widget Service
 * Handles widget updates and data fetching
 */
public class CalendarWidgetService extends RemoteViewsService {
    
    @Override
    public RemoteViews onGetViewFactory(Intent intent) {
        int appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID);
            
        return new CalendarWidgetRemoteViewsFactory(this.getApplicationContext(), appWidgetId);
    }
    
    /**
     * Factory for creating remote views for the widget
     */
    class CalendarWidgetRemoteViewsFactory implements RemoteViewsFactory {
        private final Context context;
        private final int appWidgetId;
        
        public CalendarWidgetRemoteViewsFactory(Context context, int appWidgetId) {
            this.context = context;
            this.appWidgetId = appWidgetId;
        }
        
        @Override
        public RemoteViews onCreateAt(int viewId) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.calendar_widget);
            
            // Load calendar data and update widget
            updateWidgetWithData(views, context);
            
            // Set up click intents
            setupClickIntents(views, context);
            
            return views;
        }
        
        @Override
        public void onDestroy() {
            // Cleanup if needed
        }
        
        private void updateWidgetWithData(RemoteViews views, Context context) {
            try {
                // Fetch calendar data from your API
                CalendarDataFetcher fetcher = new CalendarDataFetcher(context);
                CalendarWidgetData data = fetcher.fetchCalendarData();
                
                if (data != null) {
                    // Update widget with calendar data
                    updateCalendarDisplay(views, data);
                } else {
                    // Show error state
                    showErrorState(views);
                }
            } catch (Exception e) {
                // Show error state
                showErrorState(views);
            }
        }
        
        private void updateCalendarDisplay(RemoteViews views, CalendarWidgetData data) {
            // Update title
            views.setTextViewText(R.id.widget_title, "Diamond Link Calendar");
            
            // Update current date
            java.text.SimpleDateFormat dateFormat = new java.text.SimpleDateFormat("MMM dd, yyyy");
            String currentDate = dateFormat.format(new java.util.Date());
            views.setTextViewText(R.id.current_date, currentDate);
            
            // Update events count
            int totalEvents = data.events.size() + data.tasks.size();
            views.setTextViewText(R.id.events_count, totalEvents + " events/tasks");
            
            // Update today's events
            updateTodayEvents(views, data);
            
            // Update upcoming events
            updateUpcomingEvents(views, data);
        }
        
        private void updateTodayEvents(RemoteViews views, CalendarWidgetData data) {
            StringBuilder todayEvents = new StringBuilder();
            java.text.SimpleDateFormat timeFormat = new java.text.SimpleDateFormat("HH:mm");
            
            for (CalendarEvent event : data.events) {
                if (isToday(event.startDate)) {
                    todayEvents.append("• ")
                              .append(timeFormat.format(event.startDate))
                              .append(" ")
                              .append(event.title)
                              .append("\n");
                }
            }
            
            if (todayEvents.length() == 0) {
                todayEvents.append("No events today");
            }
            
            views.setTextViewText(R.id.today_events, todayEvents.toString());
        }
        
        private void updateUpcomingEvents(RemoteViews views, CalendarWidgetData data) {
            StringBuilder upcomingEvents = new StringBuilder();
            java.text.SimpleDateFormat dateFormat = new java.text.SimpleDateFormat("MMM dd");
            
            int count = 0;
            for (CalendarEvent event : data.events) {
                if (!isToday(event.startDate) && count < 3) {
                    upcomingEvents.append("• ")
                                  .append(dateFormat.format(event.startDate))
                                  .append(": ")
                                  .append(event.title)
                                  .append("\n");
                    count++;
                }
            }
            
            if (upcomingEvents.length() == 0) {
                upcomingEvents.append("No upcoming events");
            }
            
            views.setTextViewText(R.id.upcoming_events, upcomingEvents.toString());
        }
        
        private void setupClickIntents(RemoteViews views, Context context) {
            // Click on widget opens main app
            Intent openAppIntent = new Intent(context, MainActivity.class);
            PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 0, openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_layout, openAppPendingIntent);
            
            // Click on refresh button updates widget
            Intent refreshIntent = new Intent(context, CalendarWidgetProvider.class);
            refreshIntent.setAction("android.appwidget.action.APPWIDGET_UPDATE");
            refreshIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context, 0, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.refresh_button, refreshPendingIntent);
        }
        
        private boolean isToday(java.util.Date date) {
            java.util.Calendar today = java.util.Calendar.getInstance();
            java.util.Calendar eventDate = java.util.Calendar.getInstance();
            eventDate.setTime(date);
            
            return today.get(java.util.Calendar.YEAR) == eventDate.get(java.util.Calendar.YEAR) &&
                   today.get(java.util.Calendar.DAY_OF_YEAR) == eventDate.get(java.util.Calendar.DAY_OF_YEAR);
        }
        
        private void showErrorState(RemoteViews views) {
            views.setTextViewText(R.id.widget_title, "Diamond Link Calendar");
            views.setTextViewText(R.id.current_date, "Connection Error");
            views.setTextViewText(R.id.events_count, "Tap to refresh");
            views.setTextViewText(R.id.today_events, "Unable to load calendar");
            views.setTextViewText(R.id.upcoming_events, "Check internet connection");
        }
    }
}
