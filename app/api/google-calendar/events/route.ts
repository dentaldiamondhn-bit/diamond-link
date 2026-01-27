import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

function getTokensFromRequest(request: NextRequest) {
  const cookies = request.cookies.get('google_tokens')
  console.log('Google tokens cookie:', cookies?.value ? 'exists' : 'not found')
  return cookies ? JSON.parse(cookies.value) : null
}


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tokens = getTokensFromRequest(request)
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    oauth2Client.setCredentials(tokens)

    const now = new Date()
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: oneYearAgo.toISOString(),
      timeMax: oneYearFromNow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = response.data.items || []
    const transformedEvents = events.map((event: any) => {
      // Extract reminder information from Google Calendar event
      let reminders: number[] = [10]; // Default 10 minutes
      if (event.reminders && event.reminders.useDefault === false && event.reminders.overrides) {
        reminders = event.reminders.overrides
          .filter((r: any) => r.method === 'popup' || r.method === 'email')
          .map((r: any) => r.minutes || 10);
      } else if (event.reminders && event.reminders.useDefault === true) {
        reminders = [10]; // Default reminder for Google Calendar
      }

      return {
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description,
        location: event.location,
        start: event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date),
        end: event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date),
        allDay: !event.start.dateTime,
        attendees: event.attendees?.map((a: any) => a.email) || [],
        googleEventId: event.id,
        reminders,
        reminder: reminders[0], // Backward compatibility
      }
    })

    return NextResponse.json(transformedEvents)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokens = getTokensFromRequest(request)
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    oauth2Client.setCredentials(tokens)
    const eventData = await request.json()

    const googleEvent = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: eventData.allDay 
        ? { date: new Date(eventData.start).toISOString().split('T')[0] }
        : { dateTime: new Date(eventData.start).toISOString() },
      end: eventData.allDay 
        ? { date: new Date(eventData.end).toISOString().split('T')[0] }
        : { dateTime: new Date(eventData.end).toISOString() },
      reminders: {
        useDefault: false,
        overrides: (eventData.reminders || []).filter((minutes: number) => minutes > 0).map((minutes: number) => ({
          method: 'popup',
          minutes
        }))
      },
      ...(eventData.attendees && eventData.attendees.length > 0 && {
        attendees: eventData.attendees.map((email: string) => ({ email }))
      })
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: googleEvent,
    })

    const data = response.data

    const transformedEvent = {
      id: data.id,
      title: data.summary || 'Untitled Event',
      description: data.description,
      location: data.location,
      start: data.start?.dateTime ? new Date(data.start.dateTime) : new Date(data.start?.date),
      end: data.end?.dateTime ? new Date(data.end.dateTime) : new Date(data.end?.date),
      allDay: !data.start?.dateTime,
      attendees: data.attendees?.map((a: any) => a.email) || [],
      googleEventId: data.id,
      reminders: eventData.reminders || [10],
      reminder: (eventData.reminders || [10])[0], // Backward compatibility
    }

    return NextResponse.json(transformedEvent)
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
