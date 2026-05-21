export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
import Swipe from '@/lib/models/Swipe';

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

  try {
    // Old schema allowed only one swipe per owner+target. The native app now needs one vote per wingman.
    await mongoose.connection.collection('swipes').dropIndex('owner_user_id_1_target_user_id_1');
    results.push('Dropped owner_user_id_1_target_user_id_1 index');
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      results.push('owner_user_id_1_target_user_id_1 index does not exist (already dropped)');
    } else {
      results.push(`Error dropping owner_user_id_1_target_user_id_1: ${err.message}`);
    }
  }

  try {
    await Swipe.syncIndexes();
    results.push('Synced swipe indexes');
  } catch (err) {
    results.push(`Error syncing swipe indexes: ${err.message}`);
  }

  return NextResponse.json({ success: true, results });
}
