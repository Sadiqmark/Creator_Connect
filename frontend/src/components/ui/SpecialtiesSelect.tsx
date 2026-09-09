import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

const DEFAULT_SPECIALTIES = [
  'Short-Form Video',
  'Long-Form Video',
  'Product Reviews',
  'Sponsored Posts',
  'UGC',
  'Brand Ambassadorship',
  'Event Appearance',
  'Podcast Feature',
  'Livestreaming',
  'Photography',
];

interface SpecialtiesSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
  error?: string;
}

export const SpecialtiesSelect: React.FC<SpecialtiesSelectProps> = ({
  value = [],
  onChange,
  max = 10,
  error,
}) => {
  const [customInput, setCustomInput] = useState('');

  const toggleSpecialty = (spec: string) => {
    if (value.includes(spec)) {
      onChange(value.filter((s) => s !== spec));
    } else {
      if (value.length >= max) return;
      onChange([...value, spec]);
    }
  };

  const addCustom = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed) && value.length < max) {
      onChange([...value, trimmed]);
    }
    setCustomInput('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          Content Specialties <span className="text-danger">*</span>
        </label>
        <span className="text-xs text-foreground-muted">
          {value.length} / {max} selected
        </span>
      </div>

      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-surface-muted/50 rounded-lg border border-border">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface border border-border-strong rounded-full text-xs font-medium text-foreground shadow-subtle animate-fadeIn"
            >
              {tag}
              <button
                type="button"
                onClick={() => toggleSpecialty(tag)}
                className="hover:text-danger focus:outline-none transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Suggested popular specialties */}
      <div>
        <span className="text-xs font-medium text-foreground-muted block mb-1.5">
          Select from popular content specialties:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_SPECIALTIES.map((spec) => {
            const isSelected = value.includes(spec);
            return (
              <button
                type="button"
                key={spec}
                disabled={!isSelected && value.length >= max}
                onClick={() => toggleSpecialty(spec)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  isSelected
                    ? 'bg-foreground text-surface border-foreground font-medium'
                    : 'bg-surface text-foreground-muted border-border hover:border-foreground-muted disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {isSelected ? '✓ ' : '+ '}
                {spec}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add custom tag */}
      {value.length < max && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={addCustom}
            placeholder="Add custom content specialty..."
            className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={addCustom}
            className="px-3 py-2 text-sm bg-surface-muted hover:bg-border text-foreground font-medium rounded-lg border border-border flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      )}

      {error && <p className="text-xs text-danger font-medium">{error}</p>}
    </div>
  );
};
