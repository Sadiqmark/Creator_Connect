import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { updateMyCreatorProfile } from '../../services/api/creators';
import { StepIndicator, Step } from '../../components/ui/StepIndicator';
import { PhotoUpload } from '../../components/ui/PhotoUpload';
import { SpecialtiesSelect } from '../../components/ui/SpecialtiesSelect';
import { AvatarWithFallback } from '../../components/ui/AvatarWithFallback';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
  Instagram,
  Youtube,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const ONBOARDING_STEPS: Step[] = [
  { number: 1, label: 'Basics' },
  { number: 2, label: 'Socials & Contact' },
  { number: 3, label: 'Bio & Content Specialties' },
];

const POPULAR_NICHES = [
  'Fashion & Style',
  'Beauty & Skincare',
  'Fitness & Health',
  'Food & Culinary',
  'Travel & Adventure',
  'Technology & Gaming',
  'Lifestyle',
  'Business & Finance',
  'Art & Design',
  'Music & Entertainment',
];

export const CreatorOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { appUser, refreshMe } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    niche: '',
    location: '',
    profilePhotoUrl: '' as string | null,
    instagramUrl: '',
    youtubeUrl: '',
    collaborationEmail: appUser?.email || '',
    bio: '',
    specialties: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) errs.name = 'Full name or creator handle is required.';
      if (!formData.niche.trim()) errs.niche = 'Primary niche is required.';
      if (!formData.location.trim()) errs.location = 'Location (e.g. Los Angeles, CA) is required.';
    }

    if (step === 2) {
      const hasInstagram = !!formData.instagramUrl.trim();
      const hasYoutube = !!formData.youtubeUrl.trim();

      if (!hasInstagram && !hasYoutube) {
        errs.socials = 'At least one social profile (Instagram or YouTube) is required.';
      }

      if (hasInstagram && !formData.instagramUrl.includes('instagram.com')) {
        errs.instagramUrl = 'Must be a valid Instagram URL (e.g. https://instagram.com/username).';
      }

      if (hasYoutube && !formData.youtubeUrl.includes('youtube.com')) {
        errs.youtubeUrl = 'Must be a valid YouTube URL (e.g. https://youtube.com/@channel).';
      }

      if (!formData.collaborationEmail.trim()) {
        errs.collaborationEmail = 'Collaboration email is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.collaborationEmail)) {
        errs.collaborationEmail = 'Enter a valid email address.';
      }
    }

    if (step === 3) {
      if (!formData.bio.trim()) {
        errs.bio = 'Bio is required so brands understand your audience and style.';
      } else if (formData.bio.length < 20) {
        errs.bio = 'Bio should be at least 20 characters.';
      }

      if (formData.specialties.length === 0) {
        errs.specialties = 'Select at least one content specialty.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await updateMyCreatorProfile({
        name: formData.name.trim(),
        niche: formData.niche.trim(),
        location: formData.location.trim(),
        bio: formData.bio.trim(),
        specialties: formData.specialties,
        instagramUrl: formData.instagramUrl.trim() || null,
        youtubeUrl: formData.youtubeUrl.trim() || null,
        collaborationEmail: formData.collaborationEmail.trim(),
        profilePhotoUrl: formData.profilePhotoUrl || null,
      });

      await refreshMe();
      navigate('/creator/dashboard', { replace: true });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to complete profile. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Creator Onboarding
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Complete Your Creator Profile
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Tell brands who you are and unlock discovery in the Creator Connect marketplace.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 bg-surface p-4 rounded-xl border border-border shadow-card">
          <StepIndicator
            steps={ONBOARDING_STEPS}
            currentStep={currentStep}
            onStepClick={(num) => num < currentStep && setCurrentStep(num)}
          />
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-3 text-sm text-danger animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to save profile</p>
              <p>{submitError}</p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-card space-y-6">
          {/* STEP 1: BASICS */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Basic Information</h2>
                <p className="text-xs text-foreground-muted">
                  Your identity and primary area of creative focus.
                </p>
              </div>

              {/* Photo Upload */}
              <PhotoUpload
                value={formData.profilePhotoUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, profilePhotoUrl: url }))}
                storagePath={`creators/${appUser?.id || 'temp'}/avatar`}
                label="Profile Photo"
                nameFallback={formData.name || 'Creator'}
              />

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Creator Name or Handle <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Maya Lin"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
                />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
              </div>

              {/* Niche */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Primary Niche <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.niche}
                  onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                  placeholder="e.g. Fitness & Health"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent mb-2"
                />
                {/* Popular suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_NICHES.map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setFormData({ ...formData, niche: n })}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        formData.niche === n
                          ? 'bg-foreground text-surface border-foreground'
                          : 'bg-surface-muted text-foreground-muted border-border hover:border-foreground-muted'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {errors.niche && <p className="mt-1 text-xs text-danger">{errors.niche}</p>}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Location <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Los Angeles, CA or London, UK"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
                />
                {errors.location && <p className="mt-1 text-xs text-danger">{errors.location}</p>}
              </div>
            </div>
          )}

          {/* STEP 2: SOCIALS & CONTACT */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Socials & Contact</h2>
                <p className="text-xs text-foreground-muted">
                  Provide at least one active social link so brands can inspect your work.
                </p>
              </div>

              {errors.socials && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errors.socials}
                </div>
              )}

              {/* Instagram URL */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <span className="flex items-center gap-1.5">
                    <Instagram className="w-4 h-4 text-pink-600" />
                    Instagram Profile URL
                  </span>
                </label>
                <input
                  type="url"
                  value={formData.instagramUrl}
                  onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/yourhandle"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
                />
                {errors.instagramUrl && <p className="mt-1 text-xs text-danger">{errors.instagramUrl}</p>}
              </div>

              {/* YouTube URL */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <span className="flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-red-600" />
                    YouTube Channel URL
                  </span>
                </label>
                <input
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                  placeholder="https://youtube.com/@yourchannel"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
                />
                {errors.youtubeUrl && <p className="mt-1 text-xs text-danger">{errors.youtubeUrl}</p>}
              </div>

              <div className="border-t border-border pt-4">
                {/* Collaboration Email */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-foreground">
                      Collaboration Email <span className="text-danger">*</span>
                    </label>
                    <span className="inline-flex items-center gap-1 text-xs text-foreground-muted">
                      <Lock className="w-3 h-3 text-warning" /> Private
                    </span>
                  </div>
                  <input
                    type="email"
                    value={formData.collaborationEmail}
                    onChange={(e) => setFormData({ ...formData, collaborationEmail: e.target.value })}
                    placeholder="partnerships@yourdomain.com"
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
                  />
                  <p className="mt-1.5 text-xs text-foreground-muted flex items-start gap-1">
                    <span>🔒</span>
                    <span>
                      Kept strictly private. This is never displayed on your public profile or in
                      discovery searches. Only revealed to a verified brand partner after you accept
                      their collaboration inquiry.
                    </span>
                  </p>
                  {errors.collaborationEmail && (
                    <p className="mt-1 text-xs text-danger">{errors.collaborationEmail}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BIO & CONTENT SPECIALTIES */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Bio & Content Specialties</h2>
                <p className="text-xs text-foreground-muted">
                  Highlight your unique voice and the specific content specialties you focus on.
                </p>
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-foreground">
                    Creator Bio <span className="text-danger">*</span>
                  </label>
                  <span className="text-xs text-foreground-muted">
                    {formData.bio.length} / 2000
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Share your creative mission, audience demographics, notable past campaigns, or production specialties..."
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent resize-y"
                />
                {errors.bio && <p className="mt-1 text-xs text-danger">{errors.bio}</p>}
              </div>

              {/* Specialties */}
              <SpecialtiesSelect
                value={formData.specialties}
                onChange={(specs) => setFormData({ ...formData, specialties: specs })}
                error={errors.specialties}
              />

              {/* Review Card */}
              <div className="p-4 bg-surface-muted/50 rounded-xl border border-border space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Profile Ready for Discovery
                </div>
                <div className="flex items-center gap-3">
                  <AvatarWithFallback
                    src={formData.profilePhotoUrl}
                    alt={formData.name || 'Creator'}
                    size="lg"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{formData.name || 'Unnamed'}</h3>
                    <p className="text-xs text-foreground-muted">
                      {formData.niche} • {formData.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-sm font-medium text-foreground bg-surface-muted hover:bg-border rounded-lg border border-border flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg shadow-subtle flex items-center gap-1.5 transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg shadow-subtle flex items-center gap-2 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Profile...
                  </>
                ) : (
                  <>
                    Complete Profile <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
