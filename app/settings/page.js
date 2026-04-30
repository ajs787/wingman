'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, Upload, X, GripVertical, Check, Copy, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { CUISINE_OPTIONS, RACE_ETHNICITY_OPTIONS, SUBSTANCE_USE_OPTIONS, SEXUALITY_OPTIONS, PROFILE_PROMPTS } from '@/lib/constants';

const YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'];
const GENDERS = ['Man', 'Woman', 'Non-binary', 'Prefer not to say', 'Other'];
const LOOKING_FOR = ['Men', 'Women', 'Everyone', 'Non-binary people'];
const PERSONALITY_OPTIONS = [
  'Early bird 🌅',
  'Night owl 🦉',
  'Introvert 🏡',
  'Extrovert 🎉',
  'Ambivert ⚖️',
];

function PhotoSlot({ index, photo, onUpload, onRemove }) {
  const onDrop = useCallback((files) => {
    if (files[0]) onUpload(index, files[0]);
  }, [index, onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: !!photo,
  });

  // photo can be { url } (existing) or { file, dataUrl } (new upload)
  const displaySrc = photo?.dataUrl || photo?.url || null;

  return (
    <div
      {...(photo ? {} : getRootProps())}
      className={`relative aspect-[3/4] rounded-2xl border-2 overflow-hidden transition-all cursor-pointer
        ${photo ? 'border-transparent' : isDragActive ? 'border-gray-400 bg-gray-50' : 'border-dashed border-slate-200 bg-slate-50 hover:border-gray-300 hover:bg-gray-50/30'}`}
    >
      {!photo && <input {...getInputProps()} />}
      {photo ? (
        <>
          <img src={displaySrc} alt={`Photo ${index + 1}`} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(index); }}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="absolute bottom-2 left-2 text-white text-xs font-semibold">
            {index === 0 ? 'Main' : `${index + 1}`}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
          <Upload className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">{index === 0 ? 'Main' : `${index + 1}`}</span>
        </div>
      )}
      {photo && (
        <div className="absolute top-2 left-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center">
          <GripVertical className="w-3 h-3 text-slate-500" />
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Basic info
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [year, setYear] = useState('');
  const [major, setMajor] = useState('');
  const [gender, setGender] = useState('');
  const [sexuality, setSexuality] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [height, setHeight] = useState('');
  const [location, setLocation] = useState('');
  const [job, setJob] = useState('');
  const [religion, setReligion] = useState('');
  const [personalityAnswer, setPersonalityAnswer] = useState('');
  const [hiddenPrompt, setHiddenPrompt] = useState('');
  const [hiddenPromptAnswer, setHiddenPromptAnswer] = useState('');
  const [favoriteCuisines, setFavoriteCuisines] = useState([]);
  const [raceEthnicities, setRaceEthnicities] = useState([]);
  const [raceEthnicityToAdd, setRaceEthnicityToAdd] = useState('');
  const [alcoholUse, setAlcoholUse] = useState('');
  const [weedUse, setWeedUse] = useState('');
  const [drugUse, setDrugUse] = useState('');

  // Photos: each slot is null | { url } | { file, dataUrl }
  const [photos, setPhotos] = useState(Array(5).fill(null));

  // Prompts
  const [prompts, setPrompts] = useState([
    { prompt: '', answer: '' },
    { prompt: '', answer: '' },
    { prompt: '', answer: '' },
  ]);

  // Invite code
  const [inviteCode, setInviteCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);

  // Load from API on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const { profile } = await res.json();
        if (!profile) return;
        if (profile.name) setName(profile.name);
        if (profile.age) setAge(String(profile.age));
        if (profile.year) setYear(profile.year);
        if (profile.major) setMajor(profile.major);
        if (profile.gender) setGender(profile.gender);
        if (profile.sexuality) setSexuality(profile.sexuality);
        if (profile.looking_for) setLookingFor(profile.looking_for);
        if (profile.height) setHeight(profile.height);
        if (profile.location) setLocation(profile.location);
        if (profile.job) setJob(profile.job);
        if (profile.religion) setReligion(profile.religion);
        if (profile.personality_answer) setPersonalityAnswer(profile.personality_answer);
        if (profile.hidden_prompt) setHiddenPrompt(profile.hidden_prompt);
        if (profile.hidden_prompt_answer) setHiddenPromptAnswer(profile.hidden_prompt_answer);
        if (Array.isArray(profile.favorite_cuisines) && profile.favorite_cuisines.length) {
          setFavoriteCuisines(profile.favorite_cuisines.slice(0, 3));
        } else if (profile.favorite_cuisine) {
          setFavoriteCuisines([profile.favorite_cuisine]);
        }
        if (profile.race_ethnicities?.length) setRaceEthnicities(profile.race_ethnicities);
        if (profile.alcohol_use) setAlcoholUse(profile.alcohol_use);
        if (profile.weed_use) setWeedUse(profile.weed_use);
        if (profile.drug_use) setDrugUse(profile.drug_use);
        if (profile.photos?.length) {
          const slots = Array(5).fill(null);
          profile.photos.forEach((p) => {
            if (p.position >= 0 && p.position < 5) {
              slots[p.position] = {
                url: p.url,
                prompt: p.prompt,
                answer: p.prompt_answer,
                existing: true,
              };
            }
          });
          setPhotos(slots);
          // populate prompts from photos
          const photoPrompts = profile.photos
            .filter((p) => p.prompt)
            .map((p) => ({ prompt: p.prompt, answer: p.prompt_answer || '' }));
          const normalizedPrompts = [0, 1, 2].map((idx) => photoPrompts[idx] || { prompt: '', answer: '' });
          setPrompts(normalizedPrompts);
        }
      } catch {}

      // Load current invite code
      try {
        const codeRes = await fetch('/api/invite/current');
        if (codeRes.ok) {
          const { code } = await codeRes.json();
          if (code) setInviteCode(code.code);
        }
      } catch {}
    }
    load();
  }, []);

  async function copyInviteCode() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    toast({ title: 'Copied!', description: 'Your invite code is in your clipboard.' });
  }

  async function regenerateInviteCode() {
    setLoadingCode(true);
    try {
      const res = await fetch('/api/invite/auto-generate', {
        method: 'POST',
      });
      if (res.ok) {
        const { invite } = await res.json();
        setInviteCode(invite.code);
        toast({ title: 'New code generated!', description: 'Your invite code has been updated.' });
      } else {
        toast({ title: 'Error', description: 'Failed to generate new code.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setLoadingCode(false);
    }
  }

  function handlePhotoUpload(index, file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotos((prev) => {
        const next = [...prev];
        next[index] = { file, dataUrl: e.target.result };
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  async function handlePhotoRemove(index) {
    const photo = photos[index];
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    if (photo?.existing) {
      try {
        await fetch(`/api/photos?position=${index}`, { method: 'DELETE' });
      } catch {}
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      // 1. Save profile fields
      const profileRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          age: parseInt(age) || 0,
          year,
          major: major.trim(),
          gender,
          sexuality: sexuality || null,
          looking_for: lookingFor,
          height: height.trim() || null,
          location: location.trim() || null,
          job: job.trim() || null,
          religion: religion.trim() || null,
          personality_answer: personalityAnswer || null,
          hidden_prompt: hiddenPrompt || null,
          hidden_prompt_answer: hiddenPrompt ? (hiddenPromptAnswer.trim() || null) : null,
          favorite_cuisine: favoriteCuisines[0] || null,
          favorite_cuisines: favoriteCuisines,
          race_ethnicities: raceEthnicities,
          alcohol_use: alcoholUse || null,
          weed_use: weedUse || null,
          drug_use: drugUse || null,
        }),
      });
      if (!profileRes.ok) {
        const { error } = await profileRes.json();
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }

      // 2. Upload any new photos
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        if (p?.file) {
          const promptData = prompts[i];
          const fd = new FormData();
          fd.append('file', p.file);
          fd.append('position', String(i));
          if (promptData?.prompt) fd.append('prompt', promptData.prompt);
          if (promptData?.answer) fd.append('prompt_answer', promptData.answer);
          await fetch('/api/photos', { method: 'POST', body: fd });
        }
      }

      toast({ title: 'Profile saved!', description: 'Your changes have been saved.' });
    } catch {
      toast({ title: 'Error', description: 'Could not save profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const photoCount = photos.filter(Boolean).length;

  function toggleCuisine(cuisine) {
    setFavoriteCuisines((prev) => {
      if (prev.includes(cuisine)) return prev.filter((item) => item !== cuisine);
      if (prev.length >= 3) return prev;
      return [...prev, cuisine];
    });
  }

  function toggleRaceEthnicity(option) {
    if (!option) return;
    setRaceEthnicities((prev) => (prev.includes(option) ? prev : [...prev, option]));
    setRaceEthnicityToAdd('');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-5 sticky top-0 bg-white z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/feed">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">My Profile</h1>
              <p className="text-xs text-slate-400">Edit your info, photos &amp; prompts</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-10">

        {/* Share Invite Code */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-4">Share your code</h2>
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            <p className="text-sm text-slate-600">
              Share this code with friends so they can swipe on your behalf.
            </p>
            {inviteCode ? (
              <>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-xs text-slate-500 text-center mb-2 uppercase tracking-wide">Your code</p>
                  <p className="text-center font-mono text-3xl font-bold text-black tracking-widest">{inviteCode}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyInviteCode}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-slate-700 text-sm font-medium transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy code
                  </button>
                  <button
                    onClick={regenerateInviteCode}
                    disabled={loadingCode}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingCode ? 'animate-spin' : ''}`} />
                    New code
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">No invite code yet.</p>
                <button
                  onClick={regenerateInviteCode}
                  disabled={loadingCode}
                  className="w-full py-2 px-4 rounded-lg bg-black hover:bg-gray-800 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loadingCode ? 'Generating...' : 'Generate invite code'}
                </button>
              </>
            )}
          </div>
        </section>

        {/* Photos */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Photos</h2>
          <p className="text-xs text-slate-400 mb-4">{photoCount}/5 uploaded</p>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo, i) => (
              <PhotoSlot key={i} index={i} photo={photo} onUpload={handlePhotoUpload} onRemove={handlePhotoRemove} />
            ))}
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Basic info */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Basic info</h2>

          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="age">Age</Label>
            <Input id="age" type="number" min="17" max="99" value={age} onChange={(e) => setAge(e.target.value)} placeholder="21" className="mt-1 w-28" autoComplete="off" />
          </div>
          <div>
            <Label>Year at Rutgers</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="major">Major</Label>
            <Input id="major" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Computer Science" className="mt-1" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="height">Height</Label>
            <Input id="height" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={"5' 8\""} className="mt-1" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="New Brunswick, NJ" className="mt-1" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="job">Job</Label>
            <Input id="job" value={job} onChange={(e) => setJob(e.target.value)} placeholder="Marketing Intern" className="mt-1" autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="religion">Religion</Label>
            <Input id="religion" value={religion} onChange={(e) => setReligion(e.target.value)} placeholder="Optional" className="mt-1" autoComplete="off" />
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Gender & preferences */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Preferences</h2>
          <div>
            <Label className="mb-2 block">Gender</Label>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <button key={g} type="button" onClick={() => setGender(g)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${gender === g ? 'bg-black text-white border-gray-500' : 'border-slate-200 text-slate-600 hover:border-gray-300'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Looking for</Label>
            <div className="flex flex-wrap gap-2">
              {LOOKING_FOR.map((l) => (
                <button key={l} type="button" onClick={() => setLookingFor(l)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${lookingFor === l ? 'bg-black text-white border-gray-500' : 'border-slate-200 text-slate-600 hover:border-gray-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Sexuality</Label>
            <Select value={sexuality} onValueChange={setSexuality}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select sexuality" /></SelectTrigger>
              <SelectContent>
                {SEXUALITY_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Personality + cuisine + identity */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-4">Personality &amp; lifestyle</h2>
          <div className="space-y-3 mb-5">
            {PERSONALITY_OPTIONS.map((opt) => (
              <button key={opt} type="button" onClick={() => setPersonalityAnswer(opt)}
                className={`w-full text-left px-5 py-3.5 rounded-2xl border-2 text-sm font-medium transition-all ${personalityAnswer === opt ? 'border-gray-500 bg-gray-50 text-rose-700' : 'border-slate-100 text-slate-700 hover:border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  {opt}
                  {personalityAnswer === opt && <Check className="w-4 h-4 text-black" />}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-3 mb-5">
            <Label>Favorite cuisine(s) <span className="text-slate-400 font-normal">(optional, 1-3)</span></Label>
            <div className="grid grid-cols-2 gap-2">
              {CUISINE_OPTIONS.map((cuisine) => (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => toggleCuisine(cuisine)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${favoriteCuisines.includes(cuisine) ? 'border-gray-500 bg-gray-50 text-slate-800' : 'border-slate-100 text-slate-700 hover:border-slate-200 bg-white'}`}
                >
                  <div className="flex items-center justify-between">
                    {cuisine}
                    {favoriteCuisines.includes(cuisine) && <Check className="w-3 h-3 text-black" />}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">{favoriteCuisines.length}/3 selected</p>
          </div>

          <div className="space-y-3 mb-5">
            <Label>Race &amp; ethnicity <span className="text-slate-400 font-normal">(optional, select all that apply)</span></Label>
            <Select value={raceEthnicityToAdd} onValueChange={toggleRaceEthnicity}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Choose a race/ethnicity" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {RACE_ETHNICITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              {raceEthnicities.map((option) => (
                <span key={option} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs">
                  {option}
                  <button type="button" onClick={() => setRaceEthnicities((prev) => prev.filter((item) => item !== option))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Drugs, weed, or alcohol use <span className="text-slate-400 font-normal">(optional)</span></Label>
            <div className="space-y-3">
              <div>
                <Label>Alcohol</Label>
                <Select value={alcoholUse} onValueChange={setAlcoholUse}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select alcohol use" /></SelectTrigger>
                  <SelectContent>
                    {SUBSTANCE_USE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Weed</Label>
                <Select value={weedUse} onValueChange={setWeedUse}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select weed use" /></SelectTrigger>
                  <SelectContent>
                    {SUBSTANCE_USE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Drugs</Label>
                <Select value={drugUse} onValueChange={setDrugUse}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select drug use" /></SelectTrigger>
                  <SelectContent>
                    {SUBSTANCE_USE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Prompts */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Prompts</h2>
          <p className="text-xs text-slate-400 mb-4">You have 3 profile prompts — these show on your profile.</p>
          <div className="space-y-4">
            {prompts.map((ps, i) => (
              <div key={i} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-3">
                <Label className="text-xs text-slate-500 uppercase tracking-wide">Prompt {i + 1}</Label>
                <Select value={ps.prompt} onValueChange={(v) => {
                  const next = [...prompts]; next[i] = { ...next[i], prompt: v }; setPrompts(next);
                }}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Pick a prompt..." /></SelectTrigger>
                  <SelectContent>
                    {PROFILE_PROMPTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                {ps.prompt && (
                  <textarea
                    value={ps.answer}
                    onChange={(e) => {
                      const next = [...prompts]; next[i] = { ...next[i], answer: e.target.value }; setPrompts(next);
                    }}
                    placeholder="Your answer..."
                    maxLength={300}
                    rows={2}
                    className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-3">
            <Label className="text-xs text-slate-500 uppercase tracking-wide">Hidden prompt (unlocks after match)</Label>
            <p className="text-xs text-slate-400">This prompt is only revealed to people after they match with you.</p>
            <Select value={hiddenPrompt} onValueChange={setHiddenPrompt}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Pick your hidden prompt..." /></SelectTrigger>
              <SelectContent>
                {PROFILE_PROMPTS.map((p) => <SelectItem key={`hidden-${p}`} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {hiddenPrompt && (
              <textarea
                value={hiddenPromptAnswer}
                onChange={(e) => setHiddenPromptAnswer(e.target.value)}
                placeholder="Your hidden answer..."
                maxLength={300}
                rows={2}
                className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>
        </section>

        {/* Bottom save */}
        <div className="pb-8">
          <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
            {saving ? 'Saving...' : 'Save profile'}
          </Button>
        </div>

      </div>
    </div>
  );
}
