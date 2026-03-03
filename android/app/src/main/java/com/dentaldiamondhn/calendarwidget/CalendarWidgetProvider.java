package com.dentaldiamondhn.calendarwidget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

/**
 * Calendar Widget Provider
 * Handles widget updates and lifecycle
 */
public class CalendarWidgetProvider extends AppWidgetProvider {
    
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent.getAction() != null && intent.getAction().equals("android.appwidget.action.APPWIDGET_UPDATE")) {
            updateAppWidget(context, AppWidgetManager.getInstance(context), 
                intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID));
        }
    }

    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.calendar_widget);
        
        // Update widget content here
        // This will be implemented with calendar data fetching
        updateWidgetContent(context, views);
        
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private void updateWidgetContent(Context context, RemoteViews views) {
        // Set widget title
        views.setTextViewText(R.id.widget_title, "Diamond Link Calendar");
        
        // Set current date
        java.text.SimpleDateFormat dateFormat = new java.text.SimpleDateFormat("MMM dd, yyyy");
        String currentDate = dateFormat.format(new java.util.Date());
        views.setTextViewText(R.id.current_date, currentDate);
        
        // Set placeholder for events
        views.setTextViewText(R.id.events_count, "Loading events...");
        
        // Set click action to open main app
        Intent openAppIntent = new Intent(context, MainActivity.class);
        views.setOnClickPendingIntent(R.id.widget_layout, 
            android.app.PendingIntent.getActivity(context, 0, openAppIntent, 0));
    }
}
