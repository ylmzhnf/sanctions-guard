import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Çerezlerden 'access_token' değerini okumaya çalışıyoruz
  const token = request.cookies.get('access_token')?.value;

  // Eğer token yoksa, kullanıcıyı Login sayfasına yönlendir
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Token varsa sayfanın açılmasına izin ver
  return NextResponse.next();
}

// Bu kuralın sadececlear hangi sayfalarda çalışacağını belirliyoruz
export const config = {
  matcher: ['/dashboard/:path*'], // Dashboard ve altındaki tüm sayfalar korunur
};