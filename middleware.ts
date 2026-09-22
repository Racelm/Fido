import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Temporary development mode: Fido is fully accessible without authentication.
  // Authentication will be re-enabled after the core product workflows are complete.
  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
