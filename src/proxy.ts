import { NextResponse, type NextRequest } from "next/server"
import { carrySession, updateSession } from "@/lib/supabase/middleware"

const PUBLIC_PATHS = ["/login", "/auth/callback"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let session: Awaited<ReturnType<typeof updateSession>>
  try {
    session = await updateSession(request)
  } catch {
    return NextResponse.next({ request })
  }

  if (!session.configured) {
    return session.response
  }

  const { response, user } = session

  if (!user && pathname.startsWith("/api/")) {
    return carrySession(
      response,
      NextResponse.json({ error: "Nejste přihlášeni." }, { status: 401 }),
    )
  }

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.search = ""
    return carrySession(response, NextResponse.redirect(loginUrl))
  }

  if (user && pathname === "/login") {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = "/"
    homeUrl.search = ""
    return carrySession(response, NextResponse.redirect(homeUrl))
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
