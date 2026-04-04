import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

// DEV ONLY: Drop problematic indexes
export async function POST(request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 });
  }

  await connectDB();

  const results = [];

  try {
    // Drop the phone_number index that's causing issues with null values
    await mongoose.connection.collection('users').dropIndex('phone_number_1');
    results.push('Dropped phone_number_1 index');
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      results.push('phone_number_1 index does not exist (already dropped)');
    } else {
      results.push(`Error dropping phone_number_1: ${err.message}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
