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
import { ArrowLeft, ArrowRight, Upload, X, GripVertical, Check } from 'lucide-react';

const TOTAL_STEPS = 5;

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

function getCurrentNetid() {
  try {
    const u = JSON.parse(localStorage.getItem('wingru_current_user') || '{}');
    return u.netid || 'default';
  } catch { return 'default'; }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Basic info
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [year, setYear] = useState('');
  const [major, setMajor] = useState('');
  const [gender, setGender] = useState('');
  const [lookingFor, setLookingFor] = useState('');

  // Step 2 — Personality
  const [personalityAnswer, setPersonalityAnswer] = useState('');

  // Step 3 — Photos (5 slots)
  const [photos, setPhotos] = useState(Array(5).fill(null));

  // Step 4 — Prompts (at least 2)
  const [promptSelections, setPromptSelections] = useState([
    { prompt: '', answer: '' },
    { prompt: '', answer: '' },
  ]);

  // Load saved data from localStorage on mount (per-user keys)
  useEffect(() => {
    try {
      const netid = getCurrentNetid();
      const savedProfile = localStorage.getItem(`wingru_profile_${netid}`);
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        if (p.name) setName(p.name);
        if (p.age) setAge(String(p.age));
        if (p.year) setYear(p.year);
        if (p.major) setMajor(p.major);
        if (p.gender) setGender(p.gender);
        if (p.looking_for) setLookingFor(p.looking_for);
        if (p.personality_answer) setPersonalityAnswer(p.personality_answer);
        if (p.prompts) setPromptSelections(p.prompts);
      }

      const savedPhotos = localStorage.getItem(`wingru_photos_${netid}`);
      if (savedPhotos) {
        const parsed = JSON.parse(savedPhotos);
        if (Array.isArray(parsed)) {
          setPhotos(parsed.map((d) => d ? { dataUrl: d } : null));
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  function canProceedStep1() {
    return name.trim() && age && parseInt(age) >= 17 && year && major.trim() && gender && lookingFor;
  }
  function canProceedStep2() {
    return personalityAnswer.trim().length > 0;
  }
  function canProceedStep3() {
    return photos.filter(Boolean).length === 5;
  }
  function canProceedStep4() {
    const filled = promptSelections.filter((p) => p.prompt && p.answer.trim().length > 0);
    return filled.length >= 2;
  }

  function handlePhotoUpload(index, file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPhotos((prev) => {
        const next = [...prev];
        next[index] = { dataUrl };
        try {
          const netid = getCurrentNetid();
          localStorage.setItem(`wingru_photos_${netid}`, JSON.stringify(next.map((p) => p ? p.dataUrl : null)));
        } catch {}
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  function handlePhotoRemove(index) {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = null;
      try {
        const netid = getCurrentNetid();
        localStorage.setItem(`wingru_photos_${netid}`, JSON.stringify(next.map((p) => p ? p.dataUrl : null)));
      } catch {}
      return next;
    });
  }

  function handleSaveProfile() {
    const netid = getCurrentNetid();
    const profile = {
      name: name.trim(),
      age: parseInt(age),
      year,
      major: major.trim(),
      gender,
      looking_for: lookingFor,
      personality_answer: personalityAnswer.trim(),
      prompts: promptSelections,
    };
    try {
      localStorage.setItem(`wingru_profile_${netid}`, JSON.stringify(profile));
    } catch {}
    return true;
  }

  function handleFinish() {
    setSaving(true);
    handleSaveProfile();
    toast({ title: 'Profile complete!', description: 'Welcome to WingRu.' });
    router.push('/feed');
  }

  const stepProgress = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-rose-500">WingRu</span>
          <span className="text-sm text-slate-400">Step {step} of {TOTAL_STEPS}</span>
        </div>
        <Progress value={stepProgress} className="h-1.5" />
      </div>

      {/* Content */}
      <div className="flex-1 px-6 max-w-lg mx-auto w-full animate-fade-in">
        {step === 1 && (
          <div className="space-y-6 py-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Let's build your profile</h2>
              <p className="text-slate-500 mt-1">Basic info your friends will use to swipe for you.</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Johnson" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" min="17" max="99" value={age} onChange={(e) => setAge(e.target.value)} placeholder="21" className="mt-1 w-28" />
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
                <Input id="major" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Computer Science" className="mt-1" />
              </div>
              <div>
                <Label>Gender</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {GENDERS.map((g) => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${gender === g ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-200 text-slate-600 hover:border-rose-300'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Looking for</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {LOOKING_FOR.map((l) => (
                    <button key={l} type="button" onClick={() => setLookingFor(l)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${lookingFor === l ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-200 text-slate-600 hover:border-rose-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">What's your vibe?</h2>
              <p className="text-slate-500 mt-1">Pick one that best describes you.</p>
            </div>
            <div className="space-y-3">
              {PERSONALITY_OPTIONS.map((opt) => (
                <button key={opt} type="button" onClick={() => setPersonalityAnswer(opt)}
                  className={`w-full text-left px-5 py-4 rounded-2xl border-2 text-sm font-medium transition-all ${personalityAnswer === opt ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-100 text-slate-700 hover:border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    {opt}
                    {personalityAnswer === opt && <Check className="w-4 h-4 text-rose-500" />}
                  </div>
                </button>
              ))}
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
              <p className="text-slate-500 mt-1">Answer at least 2 prompts so people get to know you.</p>
            </div>
            {promptSelections.map((ps, i) => (
              <div key={i} className="space-y-2 p-4 rounded-2xl border border-slate-100 bg-slate-50">
                <Label>Prompt {i + 1}</Label>
                <Select value={ps.prompt} onValueChange={(v) => {
                  const next = [...promptSelections]; next[i] = { ...next[i], prompt: v }; setPromptSelections(next);
                }}>
                  <SelectTrigger><SelectValue placeholder="Pick a prompt..." /></SelectTrigger>
                  <SelectContent>
                    {SAMPLE_PROMPTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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
            {promptSelections.length < 3 && (
              <button type="button" onClick={() => setPromptSelections([...promptSelections, { prompt: '', answer: '' }])}
                className="text-sm text-rose-500 hover:underline">
                + Add another prompt
              </button>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 py-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Looking good, {name}!</h2>
              <p className="text-slate-500 mt-1">Review your profile and hit Done to get started.</p>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Name', value: name },
                { label: 'Age', value: age },
                { label: 'Year', value: year },
                { label: 'Major', value: major },
                { label: 'Gender', value: gender },
                { label: 'Looking for', value: lookingFor },
                { label: 'Vibe', value: personalityAnswer },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-800">{value}</span>
                </div>
              ))}
              <div className="py-2">
                <span className="text-slate-500">Photos</span>
                <span className="ml-2 font-medium text-slate-800">{photos.filter(Boolean).length}/5 uploaded</span>
              </div>
              <div className="py-2">
                <span className="text-slate-500">Prompts answered</span>
                <span className="ml-2 font-medium text-slate-800">
                  {promptSelections.filter((p) => p.prompt && p.answer.trim()).length}
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
    </div>
  );
}
