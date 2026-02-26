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
import { ArrowLeft, Upload, X, GripVertical, Check, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

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
const SAMPLE_PROMPTS = [
  "My go-to stress reliever...",
  "The way to my heart is...",
  "We'll get along if...",
  "My most controversial opinion...",
  "I'm secretly really good at...",
];

function getCurrentNetid() {
  try {
    const u = JSON.parse(localStorage.getItem('wingru_current_user') || '{}');
    return u.netid || 'default';
  } catch { return 'default'; }
}

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
        ${photo ? 'border-transparent' : isDragActive ? 'border-rose-400 bg-rose-50' : 'border-dashed border-slate-200 bg-slate-50 hover:border-rose-300 hover:bg-rose-50/30'}`}
    >
      {!photo && <input {...getInputProps()} />}
      {photo ? (
        <>
          <img src={photo.dataUrl} alt={`Photo ${index + 1}`} className="absolute inset-0 w-full h-full object-cover" />
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
  const [lookingFor, setLookingFor] = useState('');
  const [personalityAnswer, setPersonalityAnswer] = useState('');

  // Photos
  const [photos, setPhotos] = useState(Array(5).fill(null));

  // Prompts
  const [prompts, setPrompts] = useState([
    { prompt: '', answer: '' },
    { prompt: '', answer: '' },
  ]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const netid = getCurrentNetid();
      const savedProfile = JSON.parse(localStorage.getItem(`wingru_profile_${netid}`) || 'null');
      if (savedProfile) {
        if (savedProfile.name) setName(savedProfile.name);
        if (savedProfile.age) setAge(String(savedProfile.age));
        if (savedProfile.year) setYear(savedProfile.year);
        if (savedProfile.major) setMajor(savedProfile.major);
        if (savedProfile.gender) setGender(savedProfile.gender);
        if (savedProfile.looking_for) setLookingFor(savedProfile.looking_for);
        if (savedProfile.personality_answer) setPersonalityAnswer(savedProfile.personality_answer);
        if (savedProfile.prompts?.length) setPrompts(savedProfile.prompts);
      }

      const savedPhotos = JSON.parse(localStorage.getItem(`wingru_photos_${netid}`) || 'null');
      if (Array.isArray(savedPhotos)) {
        setPhotos(savedPhotos.map((d) => d ? { dataUrl: d } : null));
      }
    } catch {}
  }, []);

  function handlePhotoUpload(index, file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPhotos((prev) => {
        const next = [...prev];
        next[index] = { dataUrl };
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

  function handleSave() {
    setSaving(true);
    try {
      const netid = getCurrentNetid();
      const profile = {
        name: name.trim(),
        age: parseInt(age) || 0,
        year,
        major: major.trim(),
        gender,
        looking_for: lookingFor,
        personality_answer: personalityAnswer,
        prompts,
      };
      localStorage.setItem(`wingru_profile_${netid}`, JSON.stringify(profile));
      localStorage.setItem(
        `wingru_photos_${netid}`,
        JSON.stringify(photos.map((p) => p ? p.dataUrl : null))
      );
      toast({ title: 'Profile saved!', description: 'Your changes have been saved.' });
    } catch {
      toast({ title: 'Error', description: 'Could not save profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const photoCount = photos.filter(Boolean).length;

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
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${gender === g ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-200 text-slate-600 hover:border-rose-300'}`}>
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
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${lookingFor === l ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-200 text-slate-600 hover:border-rose-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Vibe */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-4">Your vibe</h2>
          <div className="space-y-2">
            {PERSONALITY_OPTIONS.map((opt) => (
              <button key={opt} type="button" onClick={() => setPersonalityAnswer(opt)}
                className={`w-full text-left px-5 py-3.5 rounded-2xl border-2 text-sm font-medium transition-all ${personalityAnswer === opt ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-100 text-slate-700 hover:border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  {opt}
                  {personalityAnswer === opt && <Check className="w-4 h-4 text-rose-500" />}
                </div>
              </button>
            ))}
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Prompts */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Prompts</h2>
          <p className="text-xs text-slate-400 mb-4">Answer at least 2 — these show on your profile.</p>
          <div className="space-y-4">
            {prompts.map((ps, i) => (
              <div key={i} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-500 uppercase tracking-wide">Prompt {i + 1}</Label>
                  {prompts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPrompts(prompts.filter((_, idx) => idx !== i))}
                      className="text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Select value={ps.prompt} onValueChange={(v) => {
                  const next = [...prompts]; next[i] = { ...next[i], prompt: v }; setPrompts(next);
                }}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Pick a prompt..." /></SelectTrigger>
                  <SelectContent>
                    {SAMPLE_PROMPTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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
            {prompts.length < 5 && (
              <button
                type="button"
                onClick={() => setPrompts([...prompts, { prompt: '', answer: '' }])}
                className="flex items-center gap-2 text-sm text-rose-500 hover:underline"
              >
                <Plus className="w-4 h-4" /> Add another prompt
              </button>
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
