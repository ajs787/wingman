export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function GET() {
  const startedAt = Date.now();

  try {
    await connectDB();
    return NextResponse.json({
      ok: true,
      runtime,
      database: 'connected',
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        runtime,
        database: 'unavailable',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
