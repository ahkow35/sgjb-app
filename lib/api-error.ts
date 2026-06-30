import { NextResponse } from 'next/server'

/**
 * Standard 500 response for unexpected server/database errors.
 *
 * Logs the full error (including any nested `cause`, which is where
 * drizzle/postgres put the real failure reason) to the server log, and
 * returns a generic message to the client. Never serialise the raw error
 * to the response — drizzle's error message embeds the full SQL query and
 * every bound parameter value, which leaks data and hides the real cause.
 */
export function serverError(e: unknown, context: string): NextResponse {
  console.error(`[api] ${context}:`, e)
  if (e instanceof Error && e.cause) {
    console.error(`[api] ${context} cause:`, e.cause)
  }
  return NextResponse.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 },
  )
}
