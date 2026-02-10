import { NextResponse } from 'next/server';
import { cacheSet } from '@/lib/server/cache';

export const dynamic = 'force-dynamic'; // Ensure this route is not statically cached

export async function GET() {
  try {
    // Check for authorization header if you want to secure this endpoint (optional for public cron)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    const timestamp = Date.now();
    
    // Perform a lightweight write to Upstash to keep it active
    // We use a dedicated key for this purpose
    await cacheSet('apexpl:keep-alive', { lastPing: timestamp }, 60 * 60 * 24); // 24 hour TTL

    return NextResponse.json({ 
      success: true, 
      message: 'Upstash keep-alive ping successful', 
      timestamp 
    });
  } catch (error) {
    console.error('Keep-alive cron job failed:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Keep-alive ping failed',
      error: String(error)
    }, { status: 500 });
  }
}
