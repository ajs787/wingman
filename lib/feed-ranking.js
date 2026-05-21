import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Delegation from '@/lib/models/Delegation';
import Swipe from '@/lib/models/Swipe';
import Match from '@/lib/models/Match';
import { getBlockedUserIds } from '@/lib/safety/blocking';

function normalizeString(value) {
  return (value || '').toString().trim().toLowerCase();
}

function normalizeArray(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => normalizeString(value)).filter(Boolean);
}

function tokenize(text) {
  return new Set(
    normalizeString(text)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );
}

function jaccardScore(a, b) {
  const setA = a instanceof Set ? a : new Set(a);
  const setB = b instanceof Set ? b : new Set(b);
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function mapGender(gender) {
  const normalized = normalizeString(gender);
  if (normalized.includes('man') && !normalized.includes('woman')) return 'man';
  if (normalized.includes('woman')) return 'woman';
  if (normalized.includes('non')) return 'non-binary';
  return normalized;
}

function isGenderPreferred(lookingFor, gender) {
  const preferences = normalizeString(lookingFor)
    .split(',')
    .map((preference) => preference.trim())
    .filter(Boolean);
  const normalizedGender = mapGender(gender);
  if (!preferences.length || preferences.includes('everyone')) return true;
  if (preferences.includes('men') && normalizedGender === 'man') return true;
  if (preferences.includes('women') && normalizedGender === 'woman') return true;
  if (preferences.includes('non-binary people') && normalizedGender === 'non-binary') return true;
  if (preferences.includes('non-binary') && normalizedGender === 'non-binary') return true;
  if (preferences.some((preference) => ['men', 'women', 'non-binary people', 'non-binary'].includes(preference))) {
    return false;
  }
  return true;
}

function estimatedDistanceMiles(owner, candidate) {
  const ownerLocation = normalizeString(owner.location);
  const candidateLocation = normalizeString(candidate.location);
  const ownerSchool = normalizeString(owner.school);
  const candidateSchool = normalizeString(candidate.school);

  if (ownerLocation && candidateLocation && ownerLocation === candidateLocation) return 5;
  if (ownerSchool && candidateSchool && ownerSchool === candidateSchool) return 10;
  if (ownerLocation && candidateLocation) return 40;
  return 25;
}

function getCandidateMajors(candidate) {
  const majors = normalizeArray(candidate.majors);
  const major = normalizeString(candidate.major);
  if (major && !majors.includes(major)) majors.push(major);
  return majors;
}

function getCandidateInterests(candidate) {
  return normalizeArray(candidate.favorite_cuisines?.length ? candidate.favorite_cuisines : [candidate.favorite_cuisine]);
}

function buildExplainability(reasons, scoreParts, distanceMiles) {
  const uniqueReasons = [...new Set(reasons)].slice(0, 4);
  return {
    summary: uniqueReasons.length ? `Matched on ${uniqueReasons.join(' + ')}` : 'General profile compatibility',
    reasons: uniqueReasons,
    distanceMiles,
    scores: scoreParts,
  };
}

function serializeCandidate(candidate, score, explainability) {
  const uid = candidate._id.toString();
  const sortedPhotos = (candidate.photos ?? []).slice().sort((a, b) => a.position - b.position);
  return {
    _id: uid,
    name: candidate.name,
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    age: candidate.show_age !== false ? candidate.age : null,
    school: candidate.show_school !== false ? candidate.school : null,
    year: candidate.year,
    major: candidate.major,
    majors: candidate.majors,
    minors: candidate.minors,
    gender: candidate.gender,
    sexuality: candidate.sexuality,
    height: candidate.height,
    location: candidate.location,
    job: candidate.job,
    religion: candidate.religion,
    weed_use: candidate.weed_use,
    drug_use: candidate.drug_use,
    race_ethnicities: candidate.race_ethnicities ?? [],
    looking_for: candidate.looking_for,
    personality_answer: candidate.personality_answer,
    favorite_cuisine: candidate.favorite_cuisine,
    favorite_cuisines: candidate.favorite_cuisines ?? [],
    photos: sortedPhotos.map((p) => (p.filename ? `/uploads/${uid}/${p.filename}` : null)).filter(Boolean),
    prompts: sortedPhotos.filter((p) => p.prompt).map((p) => ({ prompt: p.prompt, prompt_answer: p.prompt_answer })),
    ranking: {
      score: Number(score.toFixed(4)),
      explainability,
    },
  };
}

function passesHardConstraints(owner, candidate, filters) {
  if (!isGenderPreferred(owner.looking_for, candidate.gender)) return { pass: false, reason: 'owner gender preference' };
  if (!isGenderPreferred(candidate.looking_for, owner.gender)) return { pass: false, reason: 'candidate gender preference' };

  if (filters.age_dealbreaker && filters.age_min && typeof candidate.age === 'number' && candidate.age < filters.age_min) {
    return { pass: false, reason: 'age minimum' };
  }
  if (filters.age_dealbreaker && filters.age_max && typeof candidate.age === 'number' && candidate.age > filters.age_max) {
    return { pass: false, reason: 'age maximum' };
  }

  const distanceLimit = Number(filters.distance_miles || 50);
  const distanceMiles = estimatedDistanceMiles(owner, candidate);
  if (filters.distance_dealbreaker && distanceMiles > distanceLimit) {
    return { pass: false, reason: 'distance', distanceMiles };
  }

  const normalizedSchoolFilter = normalizeString(filters.school);
  const normalizedCandidateSchool = normalizeString(candidate.school);
  if (filters.school_dealbreaker && normalizedSchoolFilter && normalizedSchoolFilter !== normalizedCandidateSchool) {
    return { pass: false, reason: 'school dealbreaker', distanceMiles };
  }

  const filterMajors = normalizeArray(filters.majors);
  const candidateMajors = getCandidateMajors(candidate);
  if (filters.majors_dealbreaker && filterMajors.length && !filterMajors.some((major) => candidateMajors.includes(major))) {
    return { pass: false, reason: 'major dealbreaker', distanceMiles };
  }

  const filterYear = normalizeString(filters.year);
  if (filters.year_dealbreaker && filterYear && filterYear !== normalizeString(candidate.year)) {
    return { pass: false, reason: 'year dealbreaker', distanceMiles };
  }

  const filterGender = normalizeString(filters.gender);
  if (filters.gender_dealbreaker && filterGender && mapGender(candidate.gender) !== mapGender(filterGender)) {
    return { pass: false, reason: 'gender dealbreaker', distanceMiles };
  }

  const filterRaces = normalizeArray(filters.races);
  const candidateRaces = normalizeArray(candidate.race_ethnicities);
  if (filters.races_dealbreaker && filterRaces.length && !filterRaces.some((race) => candidateRaces.includes(race))) {
    return { pass: false, reason: 'race dealbreaker', distanceMiles };
  }

  return { pass: true, distanceMiles };
}

function recencyScore(updatedAt) {
  if (!updatedAt) return 0.4;
  const daysSince = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0.05, Math.min(1, 1 - daysSince / 30));
}

function newUserBoost(createdAt) {
  if (!createdAt) return 0;
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince <= 14) return 1;
  if (daysSince <= 45) return Math.max(0, 1 - (daysSince - 14) / 31);
  return 0;
}

function personalitySimilarity(owner, candidate) {
  const ownerPersonality = normalizeString(owner.personality_answer);
  const candidatePersonality = normalizeString(candidate.personality_answer);
  if (ownerPersonality && candidatePersonality && ownerPersonality === candidatePersonality) return 1;

  const ownerText = [owner.personality_answer, ...(owner.photos || []).map((p) => p.prompt_answer)].filter(Boolean).join(' ');
  const candidateText = [candidate.personality_answer, ...(candidate.photos || []).map((p) => p.prompt_answer)].filter(Boolean).join(' ');
  return jaccardScore(tokenize(ownerText), tokenize(candidateText));
}

function sharedContextScore(owner, candidate) {
  const reasons = [];
  let score = 0;

  const sameSchool = normalizeString(owner.school) && normalizeString(owner.school) === normalizeString(candidate.school);
  if (sameSchool) {
    score += 0.35;
    reasons.push('school');
  }

  const ownerMajors = getCandidateMajors(owner);
  const candidateMajors = getCandidateMajors(candidate);
  const majorOverlap = ownerMajors.length && candidateMajors.length
    ? ownerMajors.filter((major) => candidateMajors.includes(major)).length / new Set([...ownerMajors, ...candidateMajors]).size
    : 0;
  if (majorOverlap > 0) {
    score += 0.35 * majorOverlap;
    reasons.push('majors');
  }

  const ownerInterests = getCandidateInterests(owner);
  const candidateInterests = getCandidateInterests(candidate);
  const interestOverlap = ownerInterests.length && candidateInterests.length
    ? ownerInterests.filter((interest) => candidateInterests.includes(interest)).length / new Set([...ownerInterests, ...candidateInterests]).size
    : 0;
  if (interestOverlap > 0) {
    score += 0.2 * interestOverlap;
    reasons.push('interests');
  }

  const ownerTokens = tokenize((owner.photos || []).map((p) => p.prompt_answer).filter(Boolean).join(' '));
  const candidateTokens = tokenize((candidate.photos || []).map((p) => p.prompt_answer).filter(Boolean).join(' '));
  const promptSimilarity = jaccardScore(ownerTokens, candidateTokens);
  if (promptSimilarity > 0) {
    score += 0.1 * promptSimilarity;
    reasons.push('prompt vibe');
  }

  return { score: Math.min(1, score), reasons };
}

function desirabilityScore(stats) {
  if (!stats) return 0.5;
  const totalLikes = stats.totalLikes || 0;
  const rightLikes = stats.rightLikes || 0;
  const matchCount = stats.matchCount || 0;
  const likeRate = totalLikes > 0 ? rightLikes / totalLikes : 0.5;
  const matchRate = Math.min(1, matchCount / 15);
  return Math.max(0.1, Math.min(1, likeRate * 0.6 + matchRate * 0.4));
}

async function getCandidateStats(candidateObjectIds) {
  if (!candidateObjectIds.length) return new Map();

  const [swipeStats, matchStats] = await Promise.all([
    Swipe.aggregate([
      { $match: { target_user_id: { $in: candidateObjectIds } } },
      {
        $group: {
          _id: '$target_user_id',
          totalLikes: { $sum: 1 },
          rightLikes: { $sum: { $cond: [{ $eq: ['$direction', 'right'] }, 1, 0] } },
        },
      },
    ]),
    Match.aggregate([
      { $match: { $or: [{ user_a: { $in: candidateObjectIds } }, { user_b: { $in: candidateObjectIds } }] } },
      { $project: { participants: ['$user_a', '$user_b'] } },
      { $unwind: '$participants' },
      { $match: { participants: { $in: candidateObjectIds } } },
      { $group: { _id: '$participants', matchCount: { $sum: 1 } } },
    ]),
  ]);

  const statsById = new Map();
  for (const row of swipeStats) {
    statsById.set(row._id.toString(), {
      totalLikes: row.totalLikes,
      rightLikes: row.rightLikes,
      matchCount: 0,
    });
  }
  for (const row of matchStats) {
    const key = row._id.toString();
    const existing = statsById.get(key) || { totalLikes: 0, rightLikes: 0, matchCount: 0 };
    existing.matchCount = row.matchCount;
    statsById.set(key, existing);
  }

  return statsById;
}

export async function getRankedCandidates({ ownerId, delegateId, limit = 25, randomness = 0.15 }) {
  if (!ownerId || !delegateId) {
    return { error: 'ownerId and delegateId required', status: 400 };
  }

  if (ownerId === delegateId) {
    return { error: 'You cannot swipe for yourself.', status: 400 };
  }

  const delegation = await Delegation.findOne({
    owner_user_id: ownerId,
    delegate_user_id: delegateId,
    status: 'active',
  }).lean();

  if (!delegation) {
    return { error: 'No active delegation found. Ask the owner to share their code.', status: 403 };
  }

  const owner = await User.findById(ownerId).lean();
  if (!owner) {
    return { error: 'Owner not found.', status: 404 };
  }

  const swipedRows = await Swipe.find({
    owner_user_id: ownerId,
    delegate_user_id: delegateId,
  }).select('target_user_id').lean();
  const swipedIds = swipedRows.map((row) => row.target_user_id.toString());
  const [ownerBlocked, delegateBlocked] = await Promise.all([
    getBlockedUserIds(ownerId),
    getBlockedUserIds(delegateId),
  ]);

  const excludeIds = [
    ...new Set([
      ownerId,
      delegateId,
      ...swipedIds,
      ...ownerBlocked.allBlockedIds,
      ...delegateBlocked.allBlockedIds,
    ]),
  ];
  const excludeObjectIds = excludeIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const candidatePool = await User.find({
    _id: { $nin: excludeObjectIds },
    name: { $ne: null, $exists: true },
    hidden: { $ne: true },
  })
    .limit(300)
    .lean();

  const candidateObjectIds = candidatePool.map((candidate) => candidate._id);
  const statsById = await getCandidateStats(candidateObjectIds);

  const ownerNormalized = {
    ...owner,
    email: normalizeString(owner.email),
    school: normalizeString(owner.school),
    major: normalizeString(owner.major),
    majors: normalizeArray(owner.majors),
    location: normalizeString(owner.location),
  };

  const ranked = [];

  for (const candidate of candidatePool) {
    const candidateNormalized = {
      ...candidate,
      email: normalizeString(candidate.email),
      school: normalizeString(candidate.school),
      major: normalizeString(candidate.major),
      majors: normalizeArray(candidate.majors),
      location: normalizeString(candidate.location),
    };

    const hardConstraint = passesHardConstraints(ownerNormalized, candidateNormalized, owner.filters || {});
    if (!hardConstraint.pass) continue;

    const context = sharedContextScore(ownerNormalized, candidateNormalized);
    const personality = personalitySimilarity(ownerNormalized, candidateNormalized);
    const activity = recencyScore(candidate.updatedAt);
    const newUser = newUserBoost(candidate.createdAt);
    const desirability = desirabilityScore(statsById.get(candidate._id.toString()));

    const scoreParts = {
      sharedContext: Number(context.score.toFixed(4)),
      personality: Number(personality.toFixed(4)),
      activity: Number(activity.toFixed(4)),
      newUserBoost: Number(newUser.toFixed(4)),
      desirability: Number(desirability.toFixed(4)),
    };

    const baseScore = (
      context.score * 0.35 +
      personality * 0.25 +
      activity * 0.2 +
      newUser * 0.1 +
      desirability * 0.1
    );

    const noiseAmplitude = Math.min(0.2, Math.max(0.1, Number(randomness) || 0.15));
    const noise = (Math.random() * 2 - 1) * noiseAmplitude;
    const finalScore = Math.max(0, baseScore * (1 + noise));

    const reasons = [...context.reasons];
    if (personality > 0.5) reasons.push('personality');
    if (activity > 0.65) reasons.push('recently active');
    if (newUser > 0.5) reasons.push('new profile');

    const explainability = buildExplainability(reasons, scoreParts, hardConstraint.distanceMiles);

    ranked.push({
      candidate,
      finalScore,
      explainability,
    });
  }

  ranked.sort((a, b) => b.finalScore - a.finalScore);

  const limited = ranked.slice(0, Math.max(1, Math.min(100, Number(limit) || 25)));

  return {
    status: 200,
    candidates: limited.map((row) => serializeCandidate(row.candidate, row.finalScore, row.explainability)),
    meta: {
      totalScored: ranked.length,
      returned: limited.length,
      randomness: Math.min(0.2, Math.max(0.1, Number(randomness) || 0.15)),
      scoringWeights: {
        sharedContext: 0.35,
        personality: 0.25,
        activity: 0.2,
        newUserBoost: 0.1,
        desirability: 0.1,
      },
    },
  };
}
