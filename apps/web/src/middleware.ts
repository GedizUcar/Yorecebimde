import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware:
 *  - DeviceID cookie üret (misafir wishlist/cart için)
 *  - i18n locale tespiti (next-intl bunu kendisi yapıyor; bu middleware sadece ek koruma)
 *  - Faz 4-5'te /seller ve /admin route'ları için role check eklenecek (şimdilik backend RLS koruyor)
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get('yorecebimde_device_id')) {
    res.cookies.set('yorecebimde_device_id', crypto.randomUUID(), {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: false, // misafir cart için client tarafından okunabilmeli
    });
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
