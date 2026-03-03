package com.dentaldiamondhn.calendarwidget;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Log;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Fetches calendar data from the API
 */
public class CalendarDataFetcher {
    private static final String TAG = "CalendarDataFetcher";
    private static final String PREFS_NAME = "calendar_widget_prefs";
    private static final String PREF_AUTH_TOKEN = "auth_token";
    private static final String PREF_USER_ID = "user_id";
    
    private Context context;
    
    public CalendarDataFetcher(Context context) {
        this.context = context;
    }
    
    /**
     * Fetch calendar data from API
     */
    public CalendarWidgetData fetchCalendarData() {
        try {
            // Get stored auth credentials
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String authToken = prefs.getString(PREF_AUTH_TOKEN, null);
            String userId = prefs.getString(PREF_USER_ID, null);
            
            if (authToken == null || userId == null) {
                Log.e(TAG, "No auth credentials found");
                return null;
            }
            
            // Calculate date range (current month)
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            Date currentDate = new Date();
            String startDate = getFirstDayOfMonth(currentDate);
            String endDate = getLastDayOfMonth(currentDate);
            
            // Build API URL
            String apiUrl = String.format(Locale.getDefault(),
                "https://diamond-link-i8fctps1i-diamond-link.vercel.app/api/calendar/events?start_date=%s&end_date=%s&user_id=%s",
                startDate, endDate, userId);
            
            // Make HTTP request
            return fetchFromApi(apiUrl, authToken);
            
        } catch (Exception e) {
            Log.e(TAG, "Error fetching calendar data", e);
            return null;
        }
    }
    
    /**
     * Store auth credentials for API access
     */
    public void storeAuthCredentials(String authToken, String userId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(PREF_AUTH_TOKEN, authToken);
        editor.putString(PREF_USER_ID, userId);
        editor.apply();
        Log.d(TAG, "Auth credentials stored");
    }
    
    private CalendarWidgetData fetchFromApi(String apiUrl, String authToken) {
        try {
            URL url = new URL(apiUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            // Set request headers
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Authorization", "Bearer " + authToken);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            
            int responseCode = connection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                // Read response
                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(connection.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                
                // Parse JSON response
                return parseCalendarResponse(response.toString());
            } else {
                Log.e(TAG, "HTTP error: " + responseCode);
                return null;
            }
        } catch (Exception e) {
            Log.e(TAG, "API request failed", e);
            return null;
        }
    }
    
    private CalendarWidgetData parseCalendarResponse(String jsonResponse) {
        try {
            JSONObject jsonObject = new JSONObject(jsonResponse);
            JSONArray eventsArray = jsonObject.getJSONArray("events");
            
            CalendarWidgetData data = new CalendarWidgetData();
            
            // Parse events
            for (int i = 0; i < eventsArray.length(); i++) {
                JSONObject eventObj = eventsArray.getJSONObject(i);
                CalendarEvent event = new CalendarEvent();
                
                event.id = eventObj.getString("id");
                event.title = eventObj.getString("title");
                event.description = eventObj.optString("description", "");
                event.startDate = parseIsoDate(eventObj.getString("start_date"));
                event.endDate = parseIsoDate(eventObj.getString("end_date"));
                event.eventType = eventObj.optString("event_type", "appointment");
                event.status = eventObj.optString("status", "scheduled");
                event.priority = eventObj.optString("priority", "medium");
                event.location = eventObj.optString("location", "");
                
                // Parse patient info if available
                if (eventObj.has("patient")) {
                    JSONObject patientObj = eventObj.getJSONObject("patient");
                    PatientInfo patient = new PatientInfo();
                    patient.id = patientObj.getString("paciente_id");
                    patient.fullName = patientObj.getString("nombre_completo");
                    patient.phone = patientObj.optString("telefono", "");
                    patient.email = patientObj.optString("email", "");
                    event.patient = patient;
                }
                
                data.events.add(event);
            }
            
            Log.d(TAG, "Parsed " + data.events.size() + " events");
            return data;
            
        } catch (Exception e) {
            Log.e(TAG, "Error parsing calendar response", e);
            return null;
        }
    }
    
    private Date parseIsoDate(String isoDateString) {
        try {
            SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault());
            return isoFormat.parse(isoDateString);
        } catch (Exception e) {
            Log.e(TAG, "Error parsing date: " + isoDateString, e);
            return new Date();
        }
    }
    
    private String getFirstDayOfMonth(Date date) {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        java.util.Calendar cal = java.util.Calendar.getInstance();
        cal.setTime(date);
        cal.set(java.util.Calendar.DAY_OF_MONTH, 1);
        return dateFormat.format(cal.getTime());
    }
    
    private String getLastDayOfMonth(Date date) {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
        java.util.Calendar cal = java.util.Calendar.getInstance();
        cal.setTime(date);
        cal.set(java.util.Calendar.DAY_OF_MONTH, cal.getActualMaximum(java.util.Calendar.DAY_OF_MONTH));
        return dateFormat.format(cal.getTime());
    }
}
