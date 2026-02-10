import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { fetchBootstrap } from '@/lib/server/fpl-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const report: any = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // 1. Check Environment Variables
  report.checks.env = {
    UPSTASH_URL: process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Missing',
    UPSTASH_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Missing',
  };

  // 2. Check Redis Connection via Upstash SDK
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    
    const start = Date.now();
    await redis.set('apexpl:diagnose', 'ok');
    const value = await redis.get('apexpl:diagnose');
    const latency = Date.now() - start;
    
    report.checks.redis = {
      status: value === 'ok' ? 'OK' : 'Failed (Value mismatch)',
      latency: `${latency}ms`,
    };
  } catch (error) {
    report.checks.redis = {
      status: 'Error',
      error: String(error),
    };
  }

  // 3. Check FPL API Connectivity
  try {
    const start = Date.now();
    // We try to fetch bootstrap but forcefully skip cache to test network
    const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
        headers: { 'User-Agent': 'ApexPL/Diagnose' }
    });
    
    if (res.ok) {
         const data = await res.json();
         // Basic validation
         const valid = data && data.elements && data.elements.length > 0;
         report.checks.fpl_api = {
             status: valid ? 'OK' : 'Invalid Data',
             latency: `${Date.now() - start}ms`,
             elements_count: data?.elements?.length
         };
    } else {
        report.checks.fpl_api = {
            status: `HTTP ${res.status}`,
            latency: `${Date.now() - start}ms`
        };
    }
  } catch (error) {
    report.checks.fpl_api = {
      status: 'Error',
      error: String(error),
    };
  }

  return NextResponse.json(report);
}
