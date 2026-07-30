import posthog from 'posthog-js'

const persistence: 'localStorage' | 'memory' = (() => {
  try {
    localStorage.setItem('__ph_test', '1')
    localStorage.removeItem('__ph_test')
    return 'localStorage'
  } catch {
    return 'memory'
  }
})()

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  capture_pageview: false,
  persistence,
  advanced_disable_decide: true,
  disable_surveys: true,
  disable_toolbar: true,
  loaded: (ph) => {
    ph.opt_out_capturing()
  },
})
