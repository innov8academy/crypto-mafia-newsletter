import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();
        const sitePassword = process.env.SITE_PASSWORD;

        if (!sitePassword) {
            // No password configured, allow access
            return NextResponse.json({ success: true });
        }

        if (password === sitePassword) {
            const response = NextResponse.json({ success: true });

            // Set authentication cookie (expires in 7 days)
            response.cookies.set('site-auth', password, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: '/',
            });

            return response;
        }

        return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    } catch {
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
