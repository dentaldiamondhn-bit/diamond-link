import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    const cookies = request.cookies.get('google_tokens')
    console.log('Status check - Google tokens cookie:', cookies?.value ? 'exists' : 'not found')
    if (!cookies) {
      return NextResponse.json({ connected: false, reason: 'no_cookies' })
    }

    const tokens = JSON.parse(cookies.value)
    console.log('Status check - Tokens parsed:', tokens ? 'success' : 'failed')
    oauth2Client.setCredentials(tokens)

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    // Test: connection by trying to list calendars
    await calendar.calendarList.list({ maxResults: 1 })

    return NextResponse.json({ connected: true })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ connected: false, reason: 'api_error' })
  }
}
