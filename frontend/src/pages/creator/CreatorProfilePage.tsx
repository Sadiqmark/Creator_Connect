import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getMyCreatorProfile,
  updateMyCreatorProfile,
  CreatorPrivateProfile,
} from '../../services/api/creators';
import { PhotoUpload } from '../../components/ui/PhotoUpload';
import { SpecialtiesSelect } from '../../components/ui/SpecialtiesSelect';
import {
  Sparkles,
  Lock,
  Instagram,
  Youtube,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  ArrowLeft,
} from 'lucide-react';

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

export const CreatorProfilePage: React.FC = () => {
  const { appUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [profile, setProfile] = useState<CreatorPrivateProfile | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    niche: '',
    location: '',
    profilePhotoUrl: '' as string | null,
    instagramUrl: '',
    youtubeUrl: '',
    collaborationEmail: '',
    bio: '',
    specialties: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await getMyCreatorProfile();
        setProfile(data);
        setFormData({
          name: data.name || '',
          niche: data.niche || '',
          location: data.location || '',
          profilePhotoUrl: data.profilePhotoUrl || null,
          instagramUrl: data.instagramUrl || '',
          youtubeUrl: data.youtubeUrl || '',
          collaborationEmail: data.collaborationEmail || '',
          bio: data.bio || '',
          specialties: data.specialties || [],
        });
      } catch (err: any) {
        if (err.statusCode === 404) {
          // No profile created yet
          setFormData((prev) => ({
            ...prev,
            collaborationEmail: appUser?.email || '',
          }));
        } else {
          setLoadError(err.message || 'Failed to load profile.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [appUser]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) errs.name = 'Creator name is required.';
    if (!formData.niche.trim()) errs.niche = 'Primary niche is required.';
    if (!formData.location.trim()) errs.location = 'Location is required.';
    if (!formData.bio.trim()) errs.bio = 'Bio is required.';
    if (formData.specialties.length === 0) errs.specialties = 'At least one specialty is required.';

    const hasIg = !!formData.instagramUrl.trim();
    const hasYt = !!formData.youtubeUrl.trim();

    if (!hasIg && !hasYt) {
      errs.socials = 'At least one social profile (Instagram or YouTube) is required.';
    }

    if (hasIg && !formData.instagramUrl.includes('instagram.com')) {
      errs.instagramUrl = 'Enter a valid Instagram profile URL.';
    }

    if (hasYt && !formData.youtubeUrl.includes('youtube.com')) {
      errs.youtubeUrl = 'Enter a valid YouTube channel URL.';
    }

    if (!formData.collaborationEmail.trim()) {
      errs.collaborationEmail = 'Collaboration email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.collaborationEmail)) {
      errs.collaborationEmail = 'Enter a valid email address.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const updated = await updateMyCreatorProfile({
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

      setProfile(updated);
      setSaveSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/creator/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          {profile?.id && (
            <Link
              to={`/creators/${profile.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <Eye className="w-4 h-4" /> View Public Profile
            </Link>
          )}
        </div>

        {/* Page Title */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Edit Creator Profile</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Keep your creative portfolio, specialties, and contact details up-to-date.
          </p>
        </div>

        {/* Discoverability Status Banner (Strictly 2 states per Phase 4A locked decision #1) */}
        {profile && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              profile.isDiscoverable
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-warning/10 border-warning/30 text-warning'
            }`}
          >
            {profile.isDiscoverable ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-sm">
                {profile.isDiscoverable
                  ? 'Profile Complete — Discoverable'
                  : 'Profile Incomplete — Not Discoverable'}
              </p>
              <p className="text-xs mt-0.5 opacity-90">
                {profile.isDiscoverable
                  ? 'Your profile is publicly discoverable by brands in search results.'
                  : 'Complete all required fields (Name, Niche, Location, Bio, Content Specialties, and at least one Social link) to appear in brand searches.'}
              </p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {saveSuccess && (
          <div className="p-4 bg-success/10 border border-success/30 rounded-xl flex items-center gap-2 text-sm text-success animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Profile successfully saved and updated!</span>
          </div>
        )}

        {/* Error Alert */}
        {saveError && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl flex items-center gap-2 text-sm text-danger animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {loadError && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSave}
          className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-card space-y-6"
        >
          {/* Photo */}
          <PhotoUpload
            value={formData.profilePhotoUrl}
            onChange={(url) => setFormData((prev) => ({ ...prev, profilePhotoUrl: url }))}
            storagePath={`creators/${appUser?.id || 'temp'}/avatar`}
            label="Profile Photo"
            nameFallback={formData.name || 'Creator'}
          />

          {/* Name & Niche */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Creator Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
              />
              {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Primary Niche <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.niche}
                onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
              />
              {errors.niche && <p className="mt-1 text-xs text-danger">{errors.niche}</p>}
            </div>
          </div>

          {/* Quick suggestions for niche */}
          <div className="flex flex-wrap gap-1.5 -mt-3">
            {POPULAR_NICHES.map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setFormData({ ...formData, niche: n })}
                className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                  formData.niche === n
                    ? 'bg-foreground text-surface border-foreground'
                    : 'bg-surface-muted text-foreground-muted border-border hover:border-foreground-muted'
                }`}
              >
                {n}
              </button>
            ))}
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
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
            />
            {errors.location && <p className="mt-1 text-xs text-danger">{errors.location}</p>}
          </div>

          {/* Socials & Email */}
          <div className="border-t border-border pt-4 space-y-4">
            <h2 className="text-base font-semibold text-foreground">Socials & Direct Contact</h2>

            {errors.socials && (
              <p className="text-xs text-danger font-medium">{errors.socials}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <span className="flex items-center gap-1.5">
                    <Instagram className="w-4 h-4 text-pink-600" /> Instagram Profile URL
                  </span>
                </label>
                <input
                  type="url"
                  value={formData.instagramUrl}
                  onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/handle"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                />
                {errors.instagramUrl && (
                  <p className="mt-1 text-xs text-danger">{errors.instagramUrl}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  <span className="flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-red-600" /> YouTube Channel URL
                  </span>
                </label>
                <input
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                  placeholder="https://youtube.com/@handle"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
                />
                {errors.youtubeUrl && (
                  <p className="mt-1 text-xs text-danger">{errors.youtubeUrl}</p>
                )}
              </div>
            </div>

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
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
              />
              <p className="mt-1 text-xs text-foreground-muted">
                🔒 Private. Never displayed on your public creator page or in discovery.
              </p>
              {errors.collaborationEmail && (
                <p className="mt-1 text-xs text-danger">{errors.collaborationEmail}</p>
              )}
            </div>
          </div>

          {/* Bio & Specialties */}
          <div className="border-t border-border pt-4 space-y-4">
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
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent resize-y"
              />
              {errors.bio && <p className="mt-1 text-xs text-danger">{errors.bio}</p>}
            </div>

            <SpecialtiesSelect
              value={formData.specialties}
              onChange={(specs) => setFormData({ ...formData, specialties: specs })}
              error={errors.specialties}
            />
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-border flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl shadow-subtle text-sm font-bold text-white bg-accent hover:bg-accent/90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                </>
              ) : (
                <>
                  Save Changes <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
