'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ArrowLeft, X, Heart, SlidersHorizontal, Cake, Magnet, Ruler, MapPin, Leaf, Pill, School, BookOpen, Brain, Sparkles, Mail } from 'lucide-react';
import { US_COLLEGES, COMMON_MAJORS, CLASS_YEARS, GENDERS, RACE_ETHNICITY_OPTIONS } from '@/lib/constants';

const NOTE_MAX_LENGTH = 300;

function ProfileCard({ candidate, onPass, onLike, swiping = false }) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [friendNote, setFriendNote] = useState('');
  // What the like replies to: null = plain like, or { type: 'prompt'|'photo', ref, label }.
  const [replyTo, setReplyTo] = useState(null);
  const [swipeDir, setSwipeDir] = useState(null);

  const replyOptions = [
    { key: 'none', label: 'Just a like', value: null },
    ...(candidate.prompts || []).filter((p) => p?.prompt).map((p, i) => ({
      key: `prompt-${i}`,
      label: `“${p.prompt}”`,
      value: { type: 'prompt', ref: p.prompt },
    })),
    ...(candidate.photos || []).map((_, i) => ({
      key: `photo-${i}`,
      label: `Photo ${i + 1}`,
      value: { type: 'photo', ref: String(i) },
    })),
  ];

  function handlePassPress() {
    setSwipeDir('pass');
    setTimeout(() => {
      setSwipeDir(null);
      onPass();
    }, 500);
  }

  function handleLikePress() {
    setShowNoteModal(true);
  }

  function confirmLike() {
    setShowNoteModal(false);
    setSwipeDir('like');
    const note = friendNote.trim() || null;
    const reply = replyTo;
    setFriendNote('');
    setReplyTo(null);
    setTimeout(() => {
      setSwipeDir(null);
      onLike(note, reply);
    }, 1500);
  }

  function skipNote() {
    setShowNoteModal(false);
    setSwipeDir('like');
    setFriendNote('');
    setReplyTo(null);
    setTimeout(() => {
      setSwipeDir(null);
      onLike(null, null);
    }, 1500);
  }

  const smokesValue = candidate.weed_use && !['Never', 'Prefer not to say'].includes(candidate.weed_use) ? 'Yes' : 'No';
  const drugsValue = candidate.drug_use && !['Never', 'Prefer not to say'].includes(candidate.drug_use) ? 'Yes' : 'No';

  return (
    <div className="flex flex-col h-full relative">
      <style>{`
        @keyframes fadeScale {
          0%   { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {swipeDir && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none rounded-3xl"
          style={{ animation: 'fadeScale 0.25s ease-out both' }}
        >
          <div className={`rounded-full w-20 h-20 flex items-center justify-center ${
            swipeDir === 'like' ? 'bg-black/90' : 'bg-white border-2 border-slate-200'
          }`}>
            {swipeDir === 'like' ? (
              <Heart className="w-8 h-8 text-white fill-white" />
            ) : (
              <X className="w-8 h-8 text-slate-400" strokeWidth={2.5} />
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg">
          <img
            src={candidate.photos[0]}
            alt={candidate.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {typeof candidate.ranking?.compatibility === 'number' && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md px-3 py-1.5 ring-1 ring-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-white text-xs font-bold tracking-tight">{candidate.ranking.compatibility}% match</span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="text-white text-2xl font-bold">
              {candidate.name}
            </h3>
            <p className="text-white/80 text-sm mt-0.5">
              {candidate.school || candidate.year} · {candidate.majors?.join(', ') || candidate.major}
            </p>
            {candidate.ranking?.explainability?.reasons?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {candidate.ranking.explainability.reasons.slice(0, 3).map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full bg-white/15 backdrop-blur-sm px-2.5 py-0.5 text-[11px] font-medium text-white capitalize"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-black overflow-hidden">
          <div className="grid grid-cols-3 sm:grid-cols-6">
            {[
              { icon: Cake, value: typeof candidate.age === 'number' ? String(candidate.age) : '—' },
              { icon: Magnet, value: candidate.sexuality || '—' },
              { icon: Ruler, value: candidate.height || '—' },
              { icon: MapPin, value: candidate.location || '—' },
              { icon: Leaf, value: smokesValue },
              { icon: Pill, value: drugsValue },
            ].map((item, idx) => (
              <div key={`icon-row-${idx}`} className="px-3 py-3 border-r border-b border-slate-800 last:border-r-0">
                <item.icon className="w-4 h-4 text-slate-300 mb-1" />
                <p className="text-xs font-medium text-white truncate">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 divide-y divide-slate-800">
            {candidate.job && (
              <div className="py-3 text-base text-white">{candidate.job}</div>
            )}
            {candidate.religion && (
              <div className="py-3 text-base text-white">{candidate.religion}</div>
            )}
          </div>
          <div className="grid grid-cols-1 divide-y divide-slate-800 border-t border-slate-800">
            <div className="px-4 py-3 flex items-center gap-3">
              <School className="w-4 h-4 text-slate-300" />
              <span className="text-sm font-medium text-white">{candidate.school || '—'}</span>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-slate-300" />
              <span className="text-sm font-medium text-white">{candidate.majors?.length ? candidate.majors.join(', ') : (candidate.major || '—')}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 divide-y divide-slate-800 border-t border-slate-800">
            <div className="px-4 py-3 flex items-center gap-3">
              <Brain className="w-4 h-4 text-slate-300" />
              <span className="text-sm font-medium text-white">{candidate.personality_answer || '—'}</span>
            </div>
          </div>
        </div>

        {candidate.photos.slice(1).map((photoUrl, photoIdx) => {
          const prompt = candidate.prompts?.[photoIdx];
          return (
            <div key={`${candidate._id}-segment-${photoIdx + 1}`} className="space-y-3">
              {prompt && (
                <div className="rounded-2xl border border-slate-800 bg-black px-8 py-8">
                  <p className="text-slate-300 text-[17px] font-semibold mb-3">
                    {prompt.prompt}
                  </p>
                  <p className="text-white text-[38px] font-serif font-semibold leading-[1.08] tracking-tight">
                    {prompt.prompt_answer}
                  </p>
                </div>
              )}
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg">
                <img
                  src={photoUrl}
                  alt={`${candidate.name} photo ${photoIdx + 2}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          );
        })}

        {(candidate.prompts || []).slice(Math.max(0, candidate.photos.length - 1)).map((prompt, promptIdx) => (
          <div key={`${candidate._id}-prompt-tail-${promptIdx}`} className="rounded-2xl border border-slate-800 bg-black px-8 py-8">
            <p className="text-slate-300 text-[17px] font-semibold mb-3">
              {prompt.prompt}
            </p>
            <p className="text-white text-[38px] font-serif font-semibold leading-[1.08] tracking-tight">
              {prompt.prompt_answer}
            </p>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 flex items-center gap-4 pt-4 pb-6 mt-2 border-t border-slate-100">
        <button
          onClick={handlePassPress}
          disabled={swiping}
          className="flex-1 group relative inline-flex h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-all"
        >
          <X className="w-5 h-5 text-slate-400" />
          <span className="ml-2">Pass</span>
        </button>
        <button
          onClick={handleLikePress}
          disabled={swiping}
          className="flex-1 group relative inline-flex h-12 w-full items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-all"
        >
          <Heart className="w-5 h-5 text-white" />
          <span className="ml-2">Like</span>
        </button>
      </div>

      {showNoteModal && (
        <div className="absolute inset-0 bg-black/20 z-50 flex items-end rounded-3xl">
          <div className="w-full bg-white rounded-t-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Add a note for {candidate.name}?</h3>
            <p className="text-sm text-slate-500">
              Send a plain like, or reply to one of their prompts or photos (optional)
            </p>
            {replyOptions.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {replyOptions.map((option) => {
                  const active = (option.value?.type || 'none') === (replyTo?.type || 'none') && (option.value?.ref ?? null) === (replyTo?.ref ?? null);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setReplyTo(option.value)}
                      className={`flex-shrink-0 max-w-[220px] truncate rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#e0447f] border-[#e0447f] text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
            <textarea
              value={friendNote}
              onChange={(e) => setFriendNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
              placeholder={replyTo ? (replyTo.type === 'photo' ? 'Your take on this photo...' : 'Your take on this answer...') : "E.g., 'You both love hiking and have the same sense of humor!'"}
              maxLength={NOTE_MAX_LENGTH}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-right text-xs text-slate-400 -mt-2">{friendNote.length}/{NOTE_MAX_LENGTH}</p>
            <div className="flex gap-3">
              <button
                onClick={skipNote}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
              >
                Skip
              </button>
              <button
                onClick={confirmLike}
                className="flex-1 px-4 py-3 rounded-xl bg-black text-white font-medium"
              >
                Send like
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterModal({ filters, onSave, onClose }) {
  const ANY_VALUE = '__any__';
  const [school, setSchool] = useState(filters.school || ANY_VALUE);
  const [schoolDealbreaker, setSchoolDealbreaker] = useState(filters.school_dealbreaker || false);
  const [ageMin, setAgeMin] = useState(filters.age_min || 18);
  const [ageMax, setAgeMax] = useState(filters.age_max || 30);
  const [ageDealbreaker, setAgeDealbreaker] = useState(filters.age_dealbreaker || false);
  const [major, setMajor] = useState(filters.majors?.[0] || ANY_VALUE);
  const [majorDealbreaker, setMajorDealbreaker] = useState(filters.majors_dealbreaker || false);
  const [year, setYear] = useState(filters.year || ANY_VALUE);
  const [yearDealbreaker, setYearDealbreaker] = useState(filters.year_dealbreaker || false);
  const [gender, setGender] = useState(filters.gender || ANY_VALUE);
  const [genderDealbreaker, setGenderDealbreaker] = useState(filters.gender_dealbreaker || false);
  const [selectedRaces, setSelectedRaces] = useState(filters.races || []);
  const [racesDealbreaker, setRacesDealbreaker] = useState(filters.races_dealbreaker || false);
  const [distanceMiles, setDistanceMiles] = useState(filters.distance_miles || 50);
  const [distanceDealbreaker, setDistanceDealbreaker] = useState(filters.distance_dealbreaker || false);

  function toggleRace(race) {
    setSelectedRaces((prev) => (
      prev.includes(race)
        ? prev.filter((r) => r !== race)
        : [...prev, race]
    ));
  }

  function handleSave() {
    onSave({
      school: school === ANY_VALUE ? null : school,
      school_dealbreaker: schoolDealbreaker,
      age_min: ageMin,
      age_max: ageMax,
      age_dealbreaker: ageDealbreaker,
      majors: major === ANY_VALUE ? [] : [major],
      majors_dealbreaker: majorDealbreaker,
      year: year === ANY_VALUE ? null : year,
      year_dealbreaker: yearDealbreaker,
      gender: gender === ANY_VALUE ? null : gender,
      gender_dealbreaker: genderDealbreaker,
      races: selectedRaces,
      races_dealbreaker: racesDealbreaker,
      distance_miles: distanceMiles,
      distance_dealbreaker: distanceDealbreaker,
    });
    onClose();
  }

  function handleClear() {
    setSchool(ANY_VALUE);
    setSchoolDealbreaker(false);
    setAgeMin(18);
    setAgeMax(30);
    setAgeDealbreaker(false);
    setMajor(ANY_VALUE);
    setMajorDealbreaker(false);
    setYear(ANY_VALUE);
    setYearDealbreaker(false);
    setGender(ANY_VALUE);
    setGenderDealbreaker(false);
    setSelectedRaces([]);
    setRacesDealbreaker(false);
    setDistanceMiles(50);
    setDistanceDealbreaker(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
      <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">Filters</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Distance preference</Label>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={distanceDealbreaker}
                  onChange={(e) => setDistanceDealbreaker(e.target.checked)}
                  className="rounded"
                />
                Dealbreaker
              </label>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="relative w-full aspect-[2/1] rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.12)_1px,_transparent_1px)] [background-size:20px_20px]" />
                <div
                  className="rounded-full border-2 border-black/40 bg-black/10 transition-all"
                  style={{ width: `${Math.max(24, distanceMiles * 2.2)}px`, height: `${Math.max(24, distanceMiles * 2.2)}px` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={distanceMiles}
                  onChange={(e) => setDistanceMiles(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{distanceMiles} mi</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Age range</Label>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={ageDealbreaker}
                  onChange={(e) => setAgeDealbreaker(e.target.checked)}
                  className="rounded"
                />
                Dealbreaker
              </label>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 bg-white">
              <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                <span>{ageMin}</span>
                <span>{ageMax}</span>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min={17}
                  max={99}
                  value={ageMin}
                  onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax))}
                  className="w-full"
                />
                <input
                  type="range"
                  min={17}
                  max={99}
                  value={ageMax}
                  onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* School filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>School</Label>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={schoolDealbreaker}
                  onChange={(e) => setSchoolDealbreaker(e.target.checked)}
                  className="rounded"
                />
                Dealbreaker
              </label>
            </div>
            <Select value={school} onValueChange={setSchool}>
              <SelectTrigger><SelectValue placeholder="Any school" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={ANY_VALUE}>Any school</SelectItem>
                {US_COLLEGES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Major filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Major</Label>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={majorDealbreaker}
                  onChange={(e) => setMajorDealbreaker(e.target.checked)}
                  className="rounded"
                />
                Dealbreaker
              </label>
            </div>
            <Select value={major} onValueChange={setMajor}>
              <SelectTrigger><SelectValue placeholder="Any major" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={ANY_VALUE}>Any major</SelectItem>
                {COMMON_MAJORS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Year filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Class Year</Label>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={yearDealbreaker}
                  onChange={(e) => setYearDealbreaker(e.target.checked)}
                  className="rounded"
                />
                Dealbreaker
              </label>
            </div>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue placeholder="Any year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_VALUE}>Any year</SelectItem>
                {CLASS_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Gender filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Gender</Label>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={genderDealbreaker}
                  onChange={(e) => setGenderDealbreaker(e.target.checked)}
                  className="rounded"
                />
                Dealbreaker
              </label>
            </div>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger><SelectValue placeholder="Any gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_VALUE}>Any gender</SelectItem>
                {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Race</Label>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={racesDealbreaker}
                  onChange={(e) => setRacesDealbreaker(e.target.checked)}
                  className="rounded"
                />
                Dealbreaker
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {RACE_ETHNICITY_OPTIONS.map((race) => (
                <button
                  key={race}
                  type="button"
                  onClick={() => toggleRace(race)}
                  className={`px-3 py-2 rounded-lg border text-sm text-left ${selectedRaces.includes(race) ? 'border-black bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  {race}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
          >
            Clear all
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-xl bg-black text-white font-medium"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OwnerFeedPage() {
  const { ownerId } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [ownerProfile, setOwnerProfile] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  // null until the first like response; null likesRemaining from the API means unlimited (Pro).
  const [likesRemaining, setLikesRemaining] = useState(undefined);

  useEffect(() => {
    async function load() {
      try {
        const [delegRes, feedRes] = await Promise.all([
          fetch('/api/delegations'),
          fetch(`/api/feed?ownerId=${ownerId}`),
        ]);
        if (delegRes.ok) {
          const { owners } = await delegRes.json();
          const owner = (owners ?? []).find((o) => o._id === ownerId);
          if (owner) {
            setOwnerProfile(owner);
            setFilters(owner.filters || {});
          }
        }
        if (feedRes.ok) {
          const { candidates: cands } = await feedRes.json();
          setCandidates(cands ?? []);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [ownerId]);

  // Filter candidates based on current filters
  const filteredCandidates = candidates.filter(c => {
    if (filters.school && filters.school_dealbreaker && c.school !== filters.school) return false;
    if (filters.age_dealbreaker) {
      if (typeof c.age !== 'number') return false;
      if (filters.age_min && c.age < filters.age_min) return false;
      if (filters.age_max && c.age > filters.age_max) return false;
    }
    if (filters.majors?.length && filters.majors_dealbreaker) {
      const candidateMajors = c.majors || [c.major];
      if (!filters.majors.some(m => candidateMajors.includes(m))) return false;
    }
    if (filters.year && filters.year_dealbreaker && c.year !== filters.year) return false;
    if (filters.gender && filters.gender_dealbreaker && c.gender !== filters.gender) return false;
    if (filters.races?.length && filters.races_dealbreaker) {
      const candidateRaces = c.race_ethnicities || [];
      if (!filters.races.some((race) => candidateRaces.includes(race))) return false;
    }
    return true;
  });

  async function handlePass() {
    const candidate = filteredCandidates[currentIdx];
    if (!candidate || swiping) return;
    setSwiping(true);
    try {
      await fetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_user_id: ownerId,
          target_user_id: candidate._id,
          direction: 'left',
        }),
      });
    } catch {}
    setCurrentIdx((i) => i + 1);
    setSwiping(false);
  }

  async function handleLike(friendNote, replyTo) {
    const candidate = filteredCandidates[currentIdx];
    if (!candidate || swiping) return;
    setSwiping(true);
    try {
      const res = await fetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_user_id: ownerId,
          target_user_id: candidate._id,
          direction: 'right',
          friend_note: friendNote || undefined,
          comment_type: replyTo?.type || 'none',
          comment_ref: replyTo?.ref ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      // Owner is out of daily likes — nudge toward Pro, keep the card in place.
      if (res.status === 429) {
        toast({
          title: 'Out of likes for today',
          description: `${ownerProfile?.name ?? 'Your friend'} is out of daily likes. Upgrade to Wingman Pro for unlimited likes.`,
          variant: 'destructive',
        });
        setSwiping(false);
        return;
      }

      if (res.ok) {
        if (data.likeQuota) {
          setLikesRemaining(data.likeQuota.likesRemaining);
        }
        // A like no longer matches instantly — it goes to the other side's wingmen.
        if (data.sent) {
          toast({
            title: 'Like sent 💌',
            description: `${candidate.name}'s wingmen will review it. If one says yes, it's a match.`,
          });
        }
      }
    } catch {}
    setCurrentIdx((i) => i + 1);
    setSwiping(false);
  }

  async function handleSaveFilters(newFilters) {
    setFilters(newFilters);
    setCurrentIdx(0); // Reset to first candidate with new filters
    // Save filters to profile
    try {
      await fetch('/api/profile/filters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: newFilters }),
      });
    } catch {}
  }

  const currentCandidate = filteredCandidates[currentIdx];
  const isExhausted = !loading && currentIdx >= filteredCandidates.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!loading && filteredCandidates.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6">
        <p className="text-slate-200">No candidates found for this friend.</p>
        {Object.values(filters).some(Boolean) && (
          <p className="text-slate-400 text-sm mt-2">Try adjusting your filters</p>
        )}
        <Link href="/feed" className="mt-4">
          <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800">Back to feed</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <Link href="/feed">
            <Button variant="ghost" size="icon" className="text-slate-200 hover:bg-slate-800 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Swiping for</p>
            <div className="flex items-center gap-2">
              {ownerProfile?.photos?.[0]?.url && (
                <div className="w-6 h-6 rounded-full overflow-hidden">
                  <img src={ownerProfile.photos[0].url} alt={ownerProfile.name} className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-sm font-bold text-slate-100">{ownerProfile?.name || '...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link href={`/likes/${ownerId}`} title="Review incoming likes">
              <Button variant="ghost" size="icon" className="text-slate-200 hover:bg-slate-800 hover:text-white">
                <Mail className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setShowFilters(true)} className="text-slate-200 hover:bg-slate-800 hover:text-white">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-500 mt-1.5">
          Likes go to their wingmen for a final yes
        </p>

        {likesRemaining !== undefined && (
          <div className="max-w-sm mx-auto mt-2 flex justify-center">
            {likesRemaining === null ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-300">
                <Sparkles className="w-3 h-3" /> Unlimited likes · Pro
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                <Heart className="w-3 h-3" />
                {likesRemaining} {likesRemaining === 1 ? 'like' : 'likes'} left today
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden px-6 pt-4 max-w-sm mx-auto w-full">
        {isExhausted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">You&apos;re all caught up!</h3>
            <p className="text-slate-300 text-sm mb-6">
              You&apos;ve swiped through everyone for {ownerProfile?.name || 'your friend'}.
            </p>
            <Link href="/feed">
              <Button className="w-full">Back to feed</Button>
            </Link>
          </div>
        ) : (
          <ProfileCard
            key={currentCandidate._id}
            candidate={currentCandidate}
            onPass={handlePass}
            onLike={handleLike}
            swiping={swiping}
          />
        )}
      </div>

      {showFilters && (
        <FilterModal
          filters={filters}
          onSave={handleSaveFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
