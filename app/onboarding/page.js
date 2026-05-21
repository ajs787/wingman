'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useDropzone } from 'react-dropzone';
import { ArrowLeft, ArrowRight, Upload, X, GripVertical, Check, Copy, Bird, Plus } from 'lucide-react';
import {
  US_COLLEGES,
  COMMON_MAJORS,
  CLASS_YEARS,
  AGES,
  GENDERS,
  LOOKING_FOR,
  PERSONALITY_OPTIONS,
  CUISINE_OPTIONS,
  RACE_ETHNICITY_OPTIONS,
  SUBSTANCE_USE_OPTIONS,
  PROFILE_PROMPTS,
} from '@/lib/constants';

const TOTAL_STEPS = 5;

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

  return (
    <div
      {...(photo ? {} : getRootProps())}
      className={`relative aspect-[3/4] rounded-2xl border-2 overflow-hidden transition-all cursor-pointer
        ${photo ? 'border-transparent' : isDragActive ? 'border-gray-400 bg-gray-50' : 'border-dashed border-slate-200 bg-slate-50 hover:border-gray-300 hover:bg-gray-50/30'}`}
    >
      {!photo && <input {...getInputProps()} />}
      {photo ? (
        <>
          <img
            src={photo.dataUrl}
            alt={`Photo ${index + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
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
          <Upload className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">{index === 0 ? 'Main photo' : `Photo ${index + 1}`}</span>
        </div>
      )}
      {photo && (
        <div className="absolute top-2 left-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center cursor-grab">
          <GripVertical className="w-3 h-3 text-slate-500" />
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Step 1 — Basic info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [school, setSchool] = useState('');
  const [customSchool, setCustomSchool] = useState('');
  const [year, setYear] = useState('');
  const [majors, setMajors] = useState(['']);
  const [minors, setMinors] = useState([]);
  const [customMajor, setCustomMajor] = useState('');
  const [gender, setGender] = useState('');
  const [lookingFor, setLookingFor] = useState('');

  // Step 2 — Personality & Cuisine
  const [personalityAnswer, setPersonalityAnswer] = useState('');
  const [favoriteCuisines, setFavoriteCuisines] = useState([]);
  const [raceEthnicities, setRaceEthnicities] = useState([]);
  const [raceEthnicityToAdd, setRaceEthnicityToAdd] = useState('');
  const [alcoholUse, setAlcoholUse] = useState('');
  const [weedUse, setWeedUse] = useState('');
  const [drugUse, setDrugUse] = useState('');

  // Step 3 — Photos (5 slots)
  const [photos, setPhotos] = useState(Array(5).fill(null));

  // Step 4 — Prompts (exactly 3 required)
  const [promptSelections, setPromptSelections] = useState([
    { prompt: '', answer: '' },
    { prompt: '', answer: '' },
    { prompt: '', answer: '' },
  ]);

  // Load existing profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const { profile } = await res.json();
        if (!profile) return;
        if (profile.first_name) setFirstName(profile.first_name);
        if (profile.last_name) setLastName(profile.last_name);
        if (profile.age) setAge(String(profile.age));
        if (profile.school) setSchool(profile.school);
        if (profile.year) setYear(profile.year);
        if (profile.majors?.length) setMajors(profile.majors);
        if (profile.minors?.length) setMinors(profile.minors);
        if (profile.gender) setGender(profile.gender);
        if (profile.looking_for) setLookingFor(profile.looking_for);
        if (profile.personality_answer) setPersonalityAnswer(profile.personality_answer);
        if (Array.isArray(profile.favorite_cuisines) && profile.favorite_cuisines.length) {
          setFavoriteCuisines(profile.favorite_cuisines.slice(0, 3));
        } else if (profile.favorite_cuisine) {
          setFavoriteCuisines([profile.favorite_cuisine]);
        }
        if (profile.race_ethnicities?.length) setRaceEthnicities(profile.race_ethnicities);
        if (profile.alcohol_use) setAlcoholUse(profile.alcohol_use);
        if (profile.weed_use) setWeedUse(profile.weed_use);
        if (profile.drug_use) setDrugUse(profile.drug_use);
      } catch {
        // ignore
      }
    }
    loadProfile();
  }, []);

  function canProceedStep1() {
    const hasSchool = school === 'Other' ? customSchool.trim() : school;
    const hasOneMajor = majors.some(m => m.trim() || customMajor.trim());
    return firstName.trim() && lastName.trim() && age && hasSchool && year && hasOneMajor && gender && lookingFor;
  }
  function canProceedStep2() {
    return true;
  }
  function canProceedStep3() {
    return photos.filter((p) => p?.file || p?.existing).length === 5;
  }
  function canProceedStep4() {
    return promptSelections.every((p) => p.prompt && p.answer.trim().length > 0);
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

  function handlePhotoRemove(index) {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }

  function addMajor() {
    if (majors.length < 3) setMajors([...majors, '']);
  }
  function removeMajor(index) {
    setMajors(majors.filter((_, i) => i !== index));
  }
  function updateMajor(index, value) {
    const next = [...majors];
    next[index] = value;
    setMajors(next);
  }

  function addMinor() {
    if (minors.length < 3) setMinors([...minors, '']);
  }
  function removeMinor(index) {
    setMinors(minors.filter((_, i) => i !== index));
  }
  function updateMinor(index, value) {
    const next = [...minors];
    next[index] = value;
    setMinors(next);
  }

  async function handleFinish() {
    if (!canProceedStep4()) {
      toast({ title: 'Finish all prompts', description: 'Please complete all 3 prompts before signing up.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const finalSchool = school === 'Other' ? customSchool.trim() : school;
      const finalMajors = majors.filter(m => m.trim()).map(m => m === 'Other' ? customMajor.trim() : m).filter(Boolean);
      const finalMinors = minors.filter(m => m.trim());
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      // 1. Save profile fields
      const profileRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          name: fullName,
          age: parseInt(age),
          school: finalSchool,
          year,
          majors: finalMajors,
          minors: finalMinors,
          major: finalMajors[0] || '', // backwards compat
          gender,
          looking_for: lookingFor,
          personality_answer: personalityAnswer.trim() || null,
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
        toast({ title: 'Error saving profile', description: error, variant: 'destructive' });
        return;
      }

      // 2. Upload new photos
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        if (p?.file) {
          const promptEl = promptSelections[i];
          const fd = new FormData();
          fd.append('file', p.file);
          fd.append('position', String(i));
          if (promptEl?.prompt) fd.append('prompt', promptEl.prompt);
          if (promptEl?.answer) fd.append('prompt_answer', promptEl.answer);
          await fetch('/api/photos', { method: 'POST', body: fd });
        }
      }

      // 3. Auto-generate invite code
      const inviteRes = await fetch('/api/invite/auto-generate', { method: 'POST' });
      if (inviteRes.ok) {
        const { invite } = await inviteRes.json();
        setInviteCode(invite.code);
        setShowInviteModal(true);
      } else {
        router.push('/feed');
      }
    } catch {
      toast({ title: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const stepProgress = Math.round((step / TOTAL_STEPS) * 100);

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

  function copyToClipboard() {
    navigator.clipboard.writeText(inviteCode);
    toast({ title: 'Code copied!', description: 'Your invite code is in your clipboard.' });
  }

  function proceedToFeed() {
    setShowInviteModal(false);
    router.push('/feed');
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
               <Bird className="w-6 h-6 text-black" />
                 <span className="text-2xl font-display font-bold tracking-wide text-black -mt-1">Wingman</span>
          </div>
          <span className="text-sm text-slate-400">Step {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={stepProgress} className="h-1.5" />
      </div>

      {/* Content */}
      <div className="flex-1 px-6 max-w-lg mx-auto w-full animate-fade-in overflow-y-auto">
        {step === 1 && (
          <div className="space-y-5 py-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Let's build your profile</h2>
              <p className="text-slate-500 mt-1">Basic info your friends will use to swipe for you.</p>
              <p className="text-xs text-slate-400 mt-2">All selections are editable later in your profile settings.</p>
            </div>
            <div className="space-y-4">
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Alex" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Johnson" className="mt-1" />
                </div>
              </div>

              {/* Age dropdown */}
              <div>
                <Label>Age</Label>
                <Select value={age} onValueChange={setAge}>
                  <SelectTrigger className="mt-1 w-28"><SelectValue placeholder="Age" /></SelectTrigger>
                  <SelectContent>
                    {AGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* School dropdown */}
              <div>
                <Label>School</Label>
                <Select value={school} onValueChange={setSchool}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select your school" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {US_COLLEGES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {school === 'Other' && (
                  <Input
                    value={customSchool}
                    onChange={(e) => setCustomSchool(e.target.value)}
                    placeholder="Enter your school name"
                    className="mt-2"
                  />
                )}
              </div>

              {/* Class Year */}
              <div>
                <Label>Class Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>
                    {CLASS_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Majors */}
              <div>
                <Label>Major(s)</Label>
                {majors.map((major, i) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <Select value={major} onValueChange={(v) => updateMajor(i, v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select major" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {COMMON_MAJORS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {majors.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMajor(i)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {majors.some(m => m === 'Other') && (
                  <Input
                    value={customMajor}
                    onChange={(e) => setCustomMajor(e.target.value)}
                    placeholder="Enter your major"
                    className="mt-2"
                  />
                )}
                {majors.length < 3 && (
                  <button type="button" onClick={addMajor} className="text-sm text-black hover:underline mt-2 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add another major
                  </button>
                )}
              </div>

              {/* Minors */}
              <div>
                <Label>Minor(s) <span className="text-slate-400 font-normal">(optional)</span></Label>
                {minors.length === 0 ? (
                  <button type="button" onClick={addMinor} className="text-sm text-black hover:underline mt-1 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add a minor
                  </button>
                ) : (
                  <>
                    {minors.map((minor, i) => (
                      <div key={i} className="flex gap-2 mt-1">
                        <Select value={minor} onValueChange={(v) => updateMinor(i, v)}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Select minor" /></SelectTrigger>
                          <SelectContent className="max-h-60">
                            {COMMON_MAJORS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMinor(i)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {minors.length < 3 && (
                      <button type="button" onClick={addMinor} className="text-sm text-black hover:underline mt-2 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add another minor
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Gender */}
              <div>
                <Label>Gender</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {GENDERS.map((g) => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${gender === g ? 'bg-black text-white border-gray-500' : 'border-slate-200 text-slate-600 hover:border-gray-300'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Looking for */}
              <div>
                <Label>Looking for</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {LOOKING_FOR.map((l) => (
                    <button key={l} type="button" onClick={() => setLookingFor(l)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${lookingFor === l ? 'bg-black text-white border-gray-500' : 'border-slate-200 text-slate-600 hover:border-gray-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 py-6">
            {/* Personality Type */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  What's your personality type? <span className="text-sm font-normal text-slate-400">(optional)</span>
                </h2>
                <p className="text-slate-500 mt-1">Pick one that best describes you.</p>
              </div>
              <div className="space-y-3">
                {PERSONALITY_OPTIONS.map((opt) => (
                  <button key={opt} type="button" onClick={() => setPersonalityAnswer(opt)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border-2 text-sm font-medium transition-all ${personalityAnswer === opt ? 'border-gray-500 bg-gray-50 text-slate-800' : 'border-slate-100 text-slate-700 hover:border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between">
                      {opt}
                      {personalityAnswer === opt && <Check className="w-4 h-4 text-black" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Cuisine */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Favorite Cuisine? <span className="text-sm font-normal text-slate-400">(optional)</span>
                </h2>
                <p className="text-slate-500 mt-1">Select 1–3 cuisines you love.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CUISINE_OPTIONS.map((cuisine) => (
                  <button key={cuisine} type="button" onClick={() => toggleCuisine(cuisine)}
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${favoriteCuisines.includes(cuisine) ? 'border-gray-500 bg-gray-50 text-slate-800' : 'border-slate-100 text-slate-700 hover:border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between">
                      {cuisine}
                      {favoriteCuisines.includes(cuisine) && <Check className="w-3 h-3 text-black" />}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">{favoriteCuisines.length}/3 selected</p>
            </div>

            <div className="space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Race & ethnicity <span className="text-sm font-normal text-slate-400">(optional)</span>
                </h2>
                <p className="text-slate-500 mt-1">Select all that apply.</p>
              </div>
              <div className="space-y-2">
                <Select value={raceEthnicityToAdd} onValueChange={toggleRaceEthnicity}>
                  <SelectTrigger><SelectValue placeholder="Choose a race/ethnicity" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {RACE_ETHNICITY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Drugs, weed, or alcohol use <span className="text-sm font-normal text-slate-400">(optional)</span>
                </h2>
              </div>
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
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 py-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Add your photos</h2>
              <p className="text-slate-500 mt-1">Upload exactly 5 photos. First is your main photo.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, i) => (
                <PhotoSlot key={i} index={i} photo={photo} onUpload={handlePhotoUpload} onRemove={handlePhotoRemove} />
              ))}
            </div>
            <p className="text-xs text-slate-400 text-center">{photos.filter(Boolean).length}/5 photos added</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 py-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Add your prompts</h2>
              <p className="text-slate-500 mt-1">Complete all 3 prompts so people get to know you.</p>
            </div>
            {promptSelections.map((ps, i) => (
              <div key={i} className="space-y-2 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                <Label>Prompt {i + 1}</Label>
                <Select value={ps.prompt} onValueChange={(v) => {
                  const next = [...promptSelections]; next[i] = { ...next[i], prompt: v }; setPromptSelections(next);
                }}>
                  <SelectTrigger><SelectValue placeholder="Pick a prompt..." /></SelectTrigger>
                  <SelectContent>
                    {PROFILE_PROMPTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                {ps.prompt && (
                  <textarea value={ps.answer}
                    onChange={(e) => {
                      const next = [...promptSelections]; next[i] = { ...next[i], answer: e.target.value }; setPromptSelections(next);
                    }}
                    placeholder="Your answer..." maxLength={300} rows={3}
                    className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
                )}
              </div>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 py-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Looking good, {firstName}!</h2>
              <p className="text-slate-500 mt-1">Review your profile and hit Done to get started.</p>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Name', value: `${firstName} ${lastName}` },
                { label: 'Age', value: age },
                { label: 'School', value: school === 'Other' ? customSchool : school },
                { label: 'Class Year', value: year },
                { label: 'Major(s)', value: majors.filter(Boolean).map(m => m === 'Other' ? customMajor : m).join(', ') },
                { label: 'Minor(s)', value: minors.filter(Boolean).join(', ') || 'None' },
                { label: 'Gender', value: gender },
                { label: 'Looking for', value: lookingFor },
                { label: 'Personality', value: personalityAnswer || 'Skipped' },
                { label: 'Favorite Cuisine(s)', value: favoriteCuisines.join(', ') || 'Skipped' },
                { label: 'Race & ethnicity', value: raceEthnicities.join(', ') || 'Skipped' },
                { label: 'Alcohol use', value: alcoholUse || 'Skipped' },
                { label: 'Weed use', value: weedUse || 'Skipped' },
                { label: 'Drugs use', value: drugUse || 'Skipped' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-800 text-right max-w-[60%]">{value}</span>
                </div>
              ))}
              <div className="py-2">
                <span className="text-slate-500">Photos</span>
                <span className="ml-2 font-medium text-slate-800">{photos.filter(Boolean).length}/5 uploaded</span>
              </div>
              <div className="py-2">
                <span className="text-slate-500">Prompts answered</span>
                <span className="ml-2 font-medium text-slate-800">
                  {promptSelections.filter((p) => p.prompt && p.answer.trim()).length}/3
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 py-6 max-w-lg mx-auto w-full flex items-center justify-between border-t border-slate-100">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {step < TOTAL_STEPS ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 1 && !canProceedStep1()) ||
              (step === 2 && !canProceedStep2()) ||
              (step === 3 && !canProceedStep3()) ||
              (step === 4 && !canProceedStep4())
            }
            className="gap-2"
          >
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={saving} size="lg">
            {saving ? 'Saving...' : 'Done — Start swiping!'}
          </Button>
        )}
      </div>

      {/* Invite Code Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Your invite code is ready!</h2>
              <p className="text-slate-500">Share this code with friends — they can use it to swipe for you.</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 space-y-4">
              <p className="text-xs text-slate-500 text-center">YOUR INVITE CODE</p>
              <p className="text-center font-mono text-3xl font-bold text-slate-900 tracking-widest">{inviteCode}</p>
              <p className="text-xs text-slate-400 text-center">Expires in 10 minutes</p>
            </div>

            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy code
            </button>

            <Button onClick={proceedToFeed} size="lg" className="w-full">
              Continue to feed
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
