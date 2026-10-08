import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { LEAD_GOAL_META, WORKOUT_TIME_META } from '@/constants';
import { PROGRAM_NAMES } from '@/constants/content';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea, Checkbox } from '@/components/ui/Field';

const SOURCE_OPTIONS = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'META_ADS', label: 'Meta Ads' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'MANUAL', label: 'Manual' },
] as const;

export default function JoinPage() {
  const { submitLead } = useApp();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [goal, setGoal] = useState('');
  const [workoutTime, setWorkoutTime] = useState('');
  const [program, setProgram] = useState('');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('WEBSITE');
  const [requestedTrial, setRequestedTrial] = useState(true);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = submitLead({
      name,
      phone,
      email: email.trim() || null,
      goal: goal as any,
      workoutTime: workoutTime as any,
      program: program.trim() || null,
      message: message.trim() || null,
      source: source as any,
      requestedTrial,
    });
    setSubmitting(false);
    if (result.ok && result.leadId) {
      navigate(`/admin/leads/${result.leadId}`);
      return;
    }
    setError(result.error ?? 'Could not submit the form.');
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Card padded className="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Book a free trial</h1>
        <p className="mt-1 text-[15px] text-ink/55">
          Takes less than 30 seconds. We'll call you back within the hour.
        </p>
        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arjun Mehta"
            />
            <Input
              label="Phone number"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <Input
            label="Email (optional)"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Goal"
              required
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              options={Object.entries(LEAD_GOAL_META).map(([k, v]) => ({ value: k, label: v.label }))}
              placeholder="Select a goal"
            />
            <Select
              label="Preferred time"
              required
              value={workoutTime}
              onChange={(e) => setWorkoutTime(e.target.value)}
              options={Object.entries(WORKOUT_TIME_META).map(([k, v]) => ({ value: k, label: v.label }))}
              placeholder="When works best?"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Program (optional)"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              options={[{ value: '', label: 'Let us recommend' }, ...PROGRAM_NAMES.map((p) => ({ value: p, label: p }))]}
            />
            <Select
              label="How did you hear about us?"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              options={SOURCE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
            />
          </div>
          <Textarea
            label="Message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What would you like to focus on?"
          />
          <Checkbox
            label="I want a free trial"
            checked={requestedTrial}
            onChange={setRequestedTrial}
          />
          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
          <Button type="submit" size="lg" loading={submitting} className="w-full sm:w-fit">
            Submit
          </Button>
        </form>
      </Card>
    </div>
  );
}
