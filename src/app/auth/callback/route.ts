import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const view = requestUrl.searchParams.get('view')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // URL to redirect to after sign in process completes
  if (view === 'reset-password') {
    return NextResponse.redirect(`${requestUrl.origin}?view=reset-password`)
  }

  return NextResponse.redirect(requestUrl.origin)
}
