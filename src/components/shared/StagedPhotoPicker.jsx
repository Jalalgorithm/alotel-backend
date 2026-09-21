import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/classNames';

const MAX_MB = 10;

/**
 * Minimal multi-photo staging control — drag/drop or browse, thumbnail,
 * optional caption, remove. No domain-specific tagging (unlike the
 * properties `PhotoPicker`, which also assigns a room type per photo).
 * Shares the same staged-before-upload shape as `PhotoPicker` and the
 * booking inspection staging list, for anywhere that just needs "attach some
 * photos with optional captions before submitting."
 *
 * @param {{ photos: Array<{ id, file, previewUrl, caption }>, onChange: (photos) => void }} props
 */
export const StagedPhotoPicker = ({ photos, onChange, disabled = false, hint = 'JPG, PNG or WebP · up to 10MB each' }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const addFiles = (fileList) => {
    const incoming = [...fileList];
    if (!incoming.length) return;

    const tooBig = incoming.filter((file) => file.size > MAX_MB * 1024 * 1024);
    const wrongType = incoming.filter((file) => !file.type.startsWith('image/'));

    if (tooBig.length || wrongType.length) {
      setError(
        [
          tooBig.length && `${tooBig.length} file(s) over ${MAX_MB}MB`,
          wrongType.length && `${wrongType.length} non-image file(s)`,
        ]
          .filter(Boolean)
          .join(' and ') + ' were skipped.',
      );
    } else {
      setError('');
    }

    const accepted = incoming
      .filter((file) => file.type.startsWith('image/') && file.size <= MAX_MB * 1024 * 1024)
      .map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
      }));

    const existing = new Set(photos.map((photo) => photo.id));
    onChange([...photos, ...accepted.filter((photo) => !existing.has(photo.id))]);
  };

  const remove = (id) => {
    const photo = photos.find((entry) => entry.id === id);
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    onChange(photos.filter((entry) => entry.id !== id));
  };

  const update = (id, patch) =>
    onChange(photos.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo)));

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed px-4 py-6 transition-colors',
          isDragging ? 'border-brand-600 bg-brand-50' : 'border-line bg-line-soft hover:border-brand-300',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-50">
          <ImagePlus className="size-4 text-brand-600" aria-hidden="true" />
        </span>
        <span className="text-[13px] font-semibold text-ink">Drag photos here, or click to browse</span>
        <span className="text-[11.5px] text-ink-muted">{hint}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {error && <p className="text-[11.5px] text-warn">{error}</p>}

      {photos.length > 0 && (
        <ul className="space-y-2">
          {photos.map((photo) => (
            <li key={photo.id} className="flex items-start gap-3 rounded-lg border border-line bg-white p-2.5">
              <div className="size-16 shrink-0 overflow-hidden rounded-md bg-line-soft">
                <img src={photo.previewUrl} alt="" className="size-full object-cover" />
              </div>

              <div className="min-w-0 flex-1">
                <Input
                  value={photo.caption}
                  onChange={(event) => update(photo.id, { caption: event.target.value })}
                  placeholder="Caption (optional)"
                  aria-label={`Caption for ${photo.file.name}`}
                  disabled={disabled}
                />
                <p className="mt-1 truncate text-[10.5px] text-ink-muted">
                  {photo.file.name} · {(photo.file.size / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>

              <button
                type="button"
                onClick={() => remove(photo.id)}
                disabled={disabled}
                aria-label={`Remove ${photo.file.name}`}
                className="flex size-6 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-30"
              >
                <Trash2 className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
