import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple password protection for the newsletter app
// Set SITE_PASSWORD in your environment variables

export function middleware(request: NextRequest) {
    const sitePassword = process.env.SITE_PASSWORD;

    // If no password is set, allow all requests
    if (!sitePassword) {
        return NextResponse.next();
    }

    // Allow API routes without password
    if (request.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Allow static files
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.includes('.') // files with extensions
    ) {
        return NextResponse.next();
    }

    // Check for password cookie
    const authCookie = request.cookies.get('site-auth');

    if (authCookie?.value === sitePassword) {
        return NextResponse.next();
    }

    // Redirect to login page
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: [
        // Match all paths except static files and api
        '/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png).*)',
    ],
};
