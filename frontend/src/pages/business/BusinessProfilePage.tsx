import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getMyBusinessProfile,
  updateMyBusinessProfile,
  BusinessPrivateProfile,
} from '../../services/api/businesses';
import { PhotoUpload } from '../../components/ui/PhotoUpload';
import {
  Building2,
  Lock,
  Globe,
  Instagram,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  ArrowLeft,
} from 'lucide-react';

const BUSINESS_CATEGORIES = [
  'Fashion & Apparel',
  'Food & Beverage',
  'Beauty & Cosmetics',
  'Fitness & Wellness',
  'Technology',
  'Retail',
  'E-commerce',
  'Travel & Hospitality',
  'Finance & Banking',
  'Education',
  'Media & Entertainment',
  'Health & Healthcare',
  'Real Estate',
  'Home & Lifestyle',
  'Automotive',
  'Sports',
  'Sustainability & Environment',
  'Other',
];

export const BusinessProfilePage: React.FC = () => {
  const { appUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [profile, setProfile] = useState<BusinessPrivateProfile | null>(null);

  const [formData, setFormData] = useState({
    businessName: '',
    category: '',
    description: '',
    city: '',
    stateOrProvince: '',
    country: '',
    collaborationEmail: '',
    logoUrl: '' as string | null,
    websiteUrl: '',
    instagramUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await getMyBusinessProfile();
        setProfile(data);
        setFormData({
          businessName: data.businessName || '',
          category: data.category || '',
          description: data.description || '',
          city: data.city || '',
          stateOrProvince: data.stateOrProvince || '',
          country: data.country || '',
          collaborationEmail: data.collaborationEmail || '',
          logoUrl: data.logoUrl || null,
          websiteUrl: data.websiteUrl || '',
          instagramUrl: data.instagramUrl || '',
        });
      } catch (err: any) {
        if (err.statusCode === 404) {
          setFormData((prev) => ({
            ...prev,
            collaborationEmail: appUser?.email || '',
          }));
        } else {
          setLoadError(err.message || 'Failed to load business profile.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [appUser]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.businessName.trim()) errs.businessName = 'Business name is required.';
    if (!formData.category.trim()) errs.category = 'Industry category is required.';
    if (!formData.description.trim()) {
      errs.description = 'Description is required.';
    } else if (formData.description.length < 20) {
      errs.description = 'Description should be at least 20 characters.';
    }

    if (!formData.city.trim()) errs.city = 'City is required.';
    if (!formData.stateOrProvince.trim()) errs.stateOrProvince = 'State or Province is required.';
    if (!formData.country.trim()) errs.country = 'Country is required.';

    if (!formData.collaborationEmail.trim()) {
      errs.collaborationEmail = 'Collaboration contact email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.collaborationEmail)) {
      errs.collaborationEmail = 'Enter a valid email address.';
    }

    if (formData.websiteUrl.trim() && !formData.websiteUrl.startsWith('http')) {
      errs.websiteUrl = 'Website URL must begin with http:// or https://';
    }

    if (
      formData.instagramUrl.trim() &&
      !formData.instagramUrl.includes('instagram.com')
    ) {
      errs.instagramUrl = 'Must be a valid Instagram URL.';
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
      const updated = await updateMyBusinessProfile({
        businessName: formData.businessName.trim(),
        category: formData.category.trim(),
        description: formData.description.trim(),
        city: formData.city.trim(),
        stateOrProvince: formData.stateOrProvince.trim(),
        country: formData.country.trim(),
        collaborationEmail: formData.collaborationEmail.trim(),
        logoUrl: formData.logoUrl || null,
        websiteUrl: formData.websiteUrl.trim() || null,
        instagramUrl: formData.instagramUrl.trim() || null,
      });

      setProfile(updated);
      setSaveSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update business profile.');
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
            to="/business/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          {profile?.id && (
            <Link
              to={`/businesses/${profile.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <Eye className="w-4 h-4" /> View Public Brand Card
            </Link>
          )}
        </div>

        {/* Page Title */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Edit Business Profile</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Maintain your brand identity, contact preferences, and public overview.
          </p>
        </div>

        {/* Alerts */}
        {saveSuccess && (
          <div className="p-4 bg-success/10 border border-success/30 rounded-xl flex items-center gap-2 text-sm text-success animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Business profile successfully saved and updated!</span>
          </div>
        )}

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
          {/* Logo Upload */}
          <PhotoUpload
            value={formData.logoUrl}
            onChange={(url) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
            storagePath={`businesses/${appUser?.id || 'temp'}/logo`}
            label="Brand Logo"
            nameFallback={formData.businessName || 'Brand'}
          />

          {/* Business Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Business Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
              />
              {errors.businessName && <p className="mt-1 text-xs text-danger">{errors.businessName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Industry Category <span className="text-danger">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
              >
                <option value="">Select an industry...</option>
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-xs text-danger">{errors.category}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-foreground">
                Brand Overview <span className="text-danger">*</span>
              </label>
              <span className="text-xs text-foreground-muted">
                {formData.description.length} / 2000
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={2000}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent resize-y"
            />
            {errors.description && <p className="mt-1 text-xs text-danger">{errors.description}</p>}
          </div>

          {/* Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                City <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
              />
              {errors.city && <p className="mt-1 text-xs text-danger">{errors.city}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                State / Province <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.stateOrProvince}
                onChange={(e) => setFormData({ ...formData, stateOrProvince: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
              />
              {errors.stateOrProvince && (
                <p className="mt-1 text-xs text-danger">{errors.stateOrProvince}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Country <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
              />
              {errors.country && <p className="mt-1 text-xs text-danger">{errors.country}</p>}
            </div>
          </div>

          {/* Collaboration Email (Private) */}
          <div className="border-t border-border pt-4">
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
              🔒 Private. Only shared with a creator after they accept your collaboration inquiry.
            </p>
            {errors.collaborationEmail && (
              <p className="mt-1 text-xs text-danger">{errors.collaborationEmail}</p>
            )}
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-foreground-muted" /> Website URL
                </span>
              </label>
              <input
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
              />
              {errors.websiteUrl && <p className="mt-1 text-xs text-danger">{errors.websiteUrl}</p>}
            </div>

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
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
              />
              {errors.instagramUrl && (
                <p className="mt-1 text-xs text-danger">{errors.instagramUrl}</p>
              )}
            </div>
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
                  Save Changes <Building2 className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
