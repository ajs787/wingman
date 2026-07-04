export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Delegation from '@/lib/models/Delegation';
import { getSession } from '@/lib/auth';

// Only available in development
export async function POST(request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
  }

  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const DEMO_PROFILES = [
    { name: 'Jordan Lee',    age: 21, year: 'Junior',    major: 'Computer Science', gender: 'Man',       looking_for: 'Everyone', personality_answer: 'Night owl 🦉' },
    { name: 'Morgan Kim',    age: 20, year: 'Sophomore', major: 'Biology',          gender: 'Woman',     looking_for: 'Men',      personality_answer: 'Early bird 🌅' },
    { name: 'Taylor Patel',  age: 22, year: 'Senior',    major: 'Psychology',       gender: 'Non-binary',looking_for: 'Everyone', personality_answer: 'Ambivert ⚖️' },
    { name: 'Casey Williams',age: 19, year: 'Freshman',  major: 'Economics',        gender: 'Man',       looking_for: 'Women',    personality_answer: 'Extrovert 🎉' },
    { name: 'Riley Nguyen',  age: 21, year: 'Junior',    major: 'Math',             gender: 'Woman',     looking_for: 'Everyone', personality_answer: 'Introvert 🏡' },
    { name: 'Avery Chen',    age: 23, year: 'Graduate',  major: 'Statistics',       gender: 'Man',       looking_for: 'Everyone', personality_answer: 'Night owl 🦉' },
    { name: 'Quinn Santos',  age: 20, year: 'Sophomore', major: 'Art & Design',     gender: 'Woman',     looking_for: 'Women',    personality_answer: 'Early bird 🌅' },
    { name: 'Blake Okonjo',  age: 22, year: 'Senior',    major: 'History',          gender: 'Man',       looking_for: 'Women',    personality_answer: 'Extrovert 🎉' },
    { name: 'Skyler Zhang',  age: 21, year: 'Junior',    major: 'Physics',          gender: 'Non-binary',looking_for: 'Everyone', personality_answer: 'Ambivert ⚖️' },
    { name: 'Drew Hoffman',  age: 20, year: 'Sophomore', major: 'Business',         gender: 'Man',       looking_for: 'Everyone', personality_answer: 'Introvert 🏡' },
  ];

  const created = [];
  const errors = [];

  for (const demoInfo of DEMO_PROFILES) {
    const netid = `demo_${demoInfo.name.toLowerCase().replace(/\s/g, '_')}`;
    const email = `${netid}@scarletmail.rutgers.edu`;

    try {
      const user = await User.findOneAndUpdate(
        { email },
        { $setOnInsert: { email, netid, ...demoInfo } },
        { upsert: true, new: true }
      );
      // If already existed and name isn't set, update profile
      if (!user.name) {
        await User.updateOne({ _id: user._id }, { $set: demoInfo });
      }
      created.push({ id: user._id.toString(), netid, name: demoInfo.name });
    } catch (err) {
      errors.push(`${netid}: ${err.message}`);
    }
  }

  // Create delegations: current user as delegate for first 2 demo profiles
  const delegatesFor = created.slice(0, 2);
  for (const owner of delegatesFor) {
    try {
      await Delegation.findOneAndUpdate(
        { owner_user_id: owner.id, delegate_user_id: session.sub },
        { $set: { status: 'active' } },
        { upsert: true }
      );
    } catch (err) {
      errors.push(`delegation for ${owner.netid}: ${err.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    created: created.length,
    delegations_created: delegatesFor.length,
    delegated_for: delegatesFor.map((d) => d.name),
    errors,
  });
}
