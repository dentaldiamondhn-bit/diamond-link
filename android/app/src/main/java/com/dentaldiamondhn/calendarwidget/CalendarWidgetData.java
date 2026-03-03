package com.dentaldiamondhn.calendarwidget;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Calendar widget data models
 */
public class CalendarWidgetData {
    public List<CalendarEvent> events;
    public List<CalendarTask> tasks;
    public String lastUpdated;
    
    public CalendarWidgetData() {
        this.events = new ArrayList<>();
        this.tasks = new ArrayList<>();
        this.lastUpdated = new Date().toString();
    }
}

class CalendarEvent {
    public String id;
    public String title;
    public String description;
    public Date startDate;
    public Date endDate;
    public String eventType;
    public String status;
    public String priority;
    public String location;
    public PatientInfo patient;
    
    public CalendarEvent() {}
}

class CalendarTask {
    public String id;
    public String title;
    public String description;
    public Date dueDate;
    public boolean completed;
    public String priority;
    public PatientInfo patient;
    
    public CalendarTask() {}
}

class PatientInfo {
    public String id;
    public String fullName;
    public String phone;
    public String email;
    
    public PatientInfo() {}
}
