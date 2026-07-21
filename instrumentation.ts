export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {

  }
}

export async function onRequestError(err: any, request: any, context: any) {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getPostHogServer } = await import('./lib/posthog-server')
    const posthog = getPostHogServer()

    let distinctId: string | undefined

    if (request?.headers?.cookie) {
      const cookieString = Array.isArray(request.headers.cookie)
        ? request.headers.cookie.join('; ')
        : request.headers.cookie
      const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
      if (token) {
        const cookieName = `ph_${token}_posthog`
        const match = cookieString.match(new RegExp(`${cookieName}=([^;]+)`))
        if (match) {
          try {
            const decoded = decodeURIComponent(match[1])
            const data = JSON.parse(decoded)
            distinctId = data.distinct_id
          } catch {}
        }
      }
    }

    await posthog.captureException(err, distinctId || undefined)
  }
}
