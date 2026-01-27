import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL('/calendario?error=access_denied', `http://localhost:3000`)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/calendario?error=no_code', `http://localhost:3000`)
    )
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    const { tokens } = await oauth2Client.getToken(code)
    console.log('Google OAuth tokens received:', tokens ? 'success' : 'failed')
    
    const response = NextResponse.redirect(new URL('/calendario?success=true', `http://localhost:3000`))
    
    response.cookies.set('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    
    console.log('Setting google_tokens cookie')

    return response
  } catch (error) {
    console.error('Google Calendar callback error:', error)
    return NextResponse.redirect(
      new URL('/calendario?error=callback_failed', `http://localhost:3000`)
    )
  }
}
