import { NextResponse, type NextRequest } from 'next/server';

// Panel subdomain split:
//   - Marketplace host + /seller or /admin → 308 to panel host (canonical URL)
//   - Panel host + /                       → 302 to /seller/dashboard
// Auth, public pages, etc. stay reachable on whichever host the user lands on
// — cookies span both via Better-Auth cookieDomain (=.<root>).
//
// Inert when NEXT_PUBLIC_PANEL_URL is empty (localhost dev).
const PANEL_HOST = readHost(process.env.NEXT_PUBLIC_PANEL_URL);
const WEB_HOST = readHost(process.env.NEXT_PUBLIC_WEB_URL);

function readHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function isPanelPath(pathname: string): boolean {
  return pathname.startsWith('/seller') || pathname.startsWith('/admin');
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get('host') ?? '';
  const onPanel = PANEL_HOST !== null && host === PANEL_HOST;
  const onWeb = WEB_HOST !== null && host === WEB_HOST;

  if (onWeb && PANEL_HOST && isPanelPath(url.pathname)) {
    const target = new URL(url.pathname + url.search, `https://${PANEL_HOST}`);
    return NextResponse.redirect(target, 308);
  }

  if (onPanel && url.pathname === '/') {
    return NextResponse.redirect(new URL('/seller/dashboard', url), 302);
  }

  const res = NextResponse.next();
  if (!req.cookies.get('yorecebimde_device_id')) {
    res.cookies.set('yorecebimde_device_id', crypto.randomUUID(), {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false,
    });
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
