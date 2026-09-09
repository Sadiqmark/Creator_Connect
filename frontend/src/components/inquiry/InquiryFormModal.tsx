import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInquiry, InquiryDTO } from '../../services/api/inquiries';
import { AvatarWithFallback } from '../ui/AvatarWithFallback';
import {
  X,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  MapPin,
  Tag,
} from 'lucide-react';

const COLLABORATION_TYPE_PRESETS = [
  'Sponsored Reel',
  'Product Review',
  'Brand Ambassadorship',
  'Event Feature',
  'UGC Content',
];

const PLATFORM_OPTIONS = [
  'Instagram',
  'YouTube',
  'Instagram & YouTube',
  'Other',
] as const;

// Today in YYYY-MM-DD
const todayStr = new Date().toISOString().split('T')[0];

const inquiryFormSchema = z
  .object({
    collaborationType: z
      .string()
      .trim()
      .min(1, 'Collaboration type is required')
      .max(100, 'Collaboration type cannot exceed 100 characters'),
    platformSelect: z.enum(['Instagram', 'YouTube', 'Instagram & YouTube', 'Other'], {
      required_error: 'Please select a platform',
    }),
    customPlatform: z.string().trim().max(50, 'Custom platform cannot exceed 50 characters').optional(),
    deliverables: z
      .string()
      .trim()
      .min(10, 'Deliverables must be at least 10 characters')
      .max(1000, 'Deliverables cannot exceed 1000 characters'),
    timelineStart: z.string().optional(),
    timelineEnd: z.string().optional(),
    brief: z
      .string()
      .trim()
      .min(20, 'Brief must be at least 20 characters')
      .max(3000, 'Brief cannot exceed 3000 characters'),
    additionalRequirements: z
      .string()
      .trim()
      .max(1500, 'Additional requirements cannot exceed 1500 characters')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.platformSelect === 'Other') {
        return !!data.customPlatform && data.customPlatform.length > 0;
      }
      return true;
    },
    {
      message: 'Please specify the platform',
      path: ['customPlatform'],
    }
  )
  .refine(
    (data) => {
      if (data.timelineStart && data.timelineStart < todayStr) {
        return false;
      }
      return true;
    },
    {
      message: 'Start date cannot be in the past',
      path: ['timelineStart'],
    }
  )
  .refine(
    (data) => {
      if (data.timelineStart && data.timelineEnd) {
        return data.timelineEnd >= data.timelineStart;
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['timelineEnd'],
    }
  );

type InquiryFormData = z.infer<typeof inquiryFormSchema>;

interface InquiryFormModalProps {
  creator: {
    id: string; // canonical CreatorProfile.id
    name: string;
    profilePhotoUrl?: string | null;
    niche: string;
    location: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (inquiry: InquiryDTO) => void;
}

export const InquiryFormModal: React.FC<InquiryFormModalProps> = ({
  creator,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      collaborationType: '',
      platformSelect: 'Instagram',
      customPlatform: '',
      deliverables: '',
      timelineStart: '',
      timelineEnd: '',
      brief: '',
      additionalRequirements: '',
    },
  });

  const selectedPlatform = watch('platformSelect');
  const deliverablesVal = watch('deliverables') || '';
  const briefVal = watch('brief') || '';

  const mutation = useMutation({
    mutationFn: (data: InquiryFormData) => {
      const finalPlatform =
        data.platformSelect === 'Other'
          ? data.customPlatform || 'Other'
          : data.platformSelect;

      return createInquiry({
        creatorId: creator.id,
        collaborationType: data.collaborationType,
        platform: finalPlatform,
        deliverables: data.deliverables,
        timelineStart: data.timelineStart ? data.timelineStart : null,
        timelineEnd: data.timelineEnd ? data.timelineEnd : null,
        brief: data.brief,
        additionalRequirements: data.additionalRequirements || null,
      });
    },
    onSuccess: (res) => {
      setIsSubmittedSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['active-inquiry', creator.id] });
      if (onSuccess) {
        onSuccess(res.inquiry);
      }
      setTimeout(() => {
        setIsSubmittedSuccess(false);
        reset();
        onClose();
      }, 1500);
    },
    onError: (err: any) => {
      if (err.code === 'DUPLICATE_ACTIVE_INQUIRY' || err.statusCode === 409) {
        setConflictError(
          err.message || 'You already have an active inquiry with this creator.'
        );
      } else {
        setGeneralError(err.message || 'Failed to submit inquiry. Please try again.');
      }
    },
  });

  const onSubmit = (data: InquiryFormData) => {
    setConflictError(null);
    setGeneralError(null);
    mutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6 bg-surface-muted/40">
          <div className="flex items-center gap-4">
            <AvatarWithFallback
              src={creator.profilePhotoUrl}
              alt={creator.name}
              className="w-12 h-12 rounded-xl border border-border shadow-sm text-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Collaboration Proposal
                </span>
              </div>
              <h2 id="inquiry-modal-title" className="text-lg font-bold text-foreground">
                Send Inquiry to {creator.name}
              </h2>
              <div className="flex items-center gap-3 text-xs text-foreground-muted mt-0.5">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-foreground-subtle" />
                  {creator.niche}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-foreground-subtle" />
                  {creator.location}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Confirmation State */}
        {isSubmittedSuccess ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Inquiry Sent Successfully</h3>
            <p className="text-sm text-foreground-muted max-w-md">
              Your structured proposal has been delivered to {creator.name}. You will be notified when they respond.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Conflict Error (409) */}
            {conflictError && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">{conflictError}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    You cannot submit a new inquiry while an existing one is Pending or Accepted.
                  </p>
                </div>
              </div>
            )}

            {/* General Error */}
            {generalError && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{generalError}</p>
              </div>
            )}

            {/* Collaboration Type */}
            <div className="space-y-2">
              <label htmlFor="collaborationType" className="block text-xs font-semibold text-foreground">
                Collaboration Type <span className="text-destructive">*</span>
              </label>
              <input
                id="collaborationType"
                type="text"
                maxLength={100}
                placeholder="e.g. Sponsored Instagram Reel & Story Series"
                {...register('collaborationType')}
                className={`w-full px-3.5 py-2 bg-background border rounded-xl text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent ${
                  errors.collaborationType ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.collaborationType && (
                <p className="text-xs text-destructive">{errors.collaborationType.message}</p>
              )}

              {/* Presets Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-foreground-subtle">Suggestions:</span>
                {COLLABORATION_TYPE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setValue('collaborationType', preset, { shouldValidate: true })}
                    className="px-2 py-0.5 text-[11px] rounded-md bg-surface-muted hover:bg-border text-foreground-muted hover:text-foreground transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Platform <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLATFORM_OPTIONS.map((plat) => (
                  <label
                    key={plat}
                    className={`flex items-center justify-center px-3 py-2 border rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      selectedPlatform === plat
                        ? 'bg-accent/10 border-accent text-accent font-semibold'
                        : 'bg-background border-border text-foreground hover:bg-surface-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      value={plat}
                      {...register('platformSelect')}
                      className="sr-only"
                    />
                    {plat}
                  </label>
                ))}
              </div>

              {selectedPlatform === 'Other' && (
                <div className="pt-2">
                  <input
                    type="text"
                    maxLength={50}
                    placeholder="Specify platform (e.g. TikTok, Podcast, Newsletter)"
                    {...register('customPlatform')}
                    className={`w-full px-3.5 py-2 bg-background border rounded-xl text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent ${
                      errors.customPlatform ? 'border-destructive' : 'border-border'
                    }`}
                  />
                  {errors.customPlatform && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.customPlatform.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Deliverables */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="deliverables" className="block text-xs font-semibold text-foreground">
                  Expected Deliverables <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-foreground-subtle">
                  {deliverablesVal.length} / 1000
                </span>
              </div>
              <textarea
                id="deliverables"
                rows={3}
                maxLength={1000}
                placeholder="01  1 Dedicated 60s Reel&#10;02  3 Instagram Stories with link sticker"
                {...register('deliverables')}
                className={`w-full px-3.5 py-2 bg-background border rounded-xl text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent resize-none ${
                  errors.deliverables ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.deliverables && (
                <p className="text-xs text-destructive">{errors.deliverables.message}</p>
              )}
            </div>

            {/* Timeline: Start & End Dates (Optional) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Calendar className="w-3.5 h-3.5 text-foreground-muted" />
                <span>Estimated Campaign Timeline (Optional)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="timelineStart" className="block text-[11px] text-foreground-muted mb-1">
                    Start Date
                  </label>
                  <input
                    id="timelineStart"
                    type="date"
                    min={todayStr}
                    {...register('timelineStart')}
                    className={`w-full px-3.5 py-1.5 bg-background border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent ${
                      errors.timelineStart ? 'border-destructive' : 'border-border'
                    }`}
                  />
                  {errors.timelineStart && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.timelineStart.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="timelineEnd" className="block text-[11px] text-foreground-muted mb-1">
                    End Date
                  </label>
                  <input
                    id="timelineEnd"
                    type="date"
                    min={todayStr}
                    {...register('timelineEnd')}
                    className={`w-full px-3.5 py-1.5 bg-background border rounded-xl text-sm text-foreground focus:outline-none focus:border-accent ${
                      errors.timelineEnd ? 'border-destructive' : 'border-border'
                    }`}
                  />
                  {errors.timelineEnd && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.timelineEnd.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Campaign Brief */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="brief" className="block text-xs font-semibold text-foreground">
                  Collaboration Brief <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-foreground-subtle">
                  {briefVal.length} / 3000
                </span>
              </div>
              <textarea
                id="brief"
                rows={4}
                maxLength={3000}
                placeholder="Describe your brand goals, campaign context, product details, creative angle, or visual direction..."
                {...register('brief')}
                className={`w-full px-3.5 py-2 bg-background border rounded-xl text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent resize-none ${
                  errors.brief ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.brief && (
                <p className="text-xs text-destructive">{errors.brief.message}</p>
              )}
            </div>

            {/* Additional Requirements (Optional) */}
            <div className="space-y-2">
              <label htmlFor="additionalRequirements" className="block text-xs font-semibold text-foreground">
                Additional Requirements / Asset Usage (Optional)
              </label>
              <textarea
                id="additionalRequirements"
                rows={2}
                maxLength={1500}
                placeholder="e.g. Whitelisting rights for 30 days, raw B-roll delivery, content approval timeline..."
                {...register('additionalRequirements')}
                className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {/* Footer Notice & Actions */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[11px] text-foreground-muted flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>Contact details will become available only upon acceptance.</span>
              </p>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={mutation.isPending}
                  className="flex-1 sm:flex-initial px-4 py-2 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-surface-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent/90 flex items-center justify-center gap-2 shadow-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Inquiry</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
