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

export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const tokens = getTokensFromRequest(request)
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    oauth2Client.setCredentials(tokens)
    const eventData = await request.json()
    const eventId = params.eventId

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

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

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
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
    console.error('Error updating event:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const tokens = getTokensFromRequest(request)
    if (!tokens) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    oauth2Client.setCredentials(tokens)
    const eventId = params.eventId

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
