import { useEffect, useRef, useState } from 'react';
import { GripVertical, ImagePlus, Star, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/classNames';

/** The room types the API accepts on a property image. */
export const ROOM_TYPES = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Entrance', 'Other'];

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_MB = 10;

/**
 * Guess a room type from the file name so a well-named upload needs no editing.
 * Separators are stripped from both sides, so `living-room.png`, `living_room`
 * and `LivingRoom` all match.
 */
const normalise = (value) => value.toLowerCase().replace(/[^a-z]/g, '');

const guessRoomType = (name = '') => {
  const flat = normalise(name);
  return ROOM_TYPES.find((room) => flat.includes(normalise(room)) && room !== 'Other') ?? 'Other';
};

/**
 * Multi-photo picker with previews, room tagging and ordering.
 *
 * Files are held as objects rather than bare `File`s so each one can carry its
 * own room type and caption — the API stores both per image — and so the
 * preview URL can be revoked when the photo is removed.
 *
 * @param {{ photos: Array<{ id, file, previewUrl, roomType, caption }>, onChange: (photos) => void }} props
 */
export const PhotoPicker = ({ photos, onChange, disabled = false }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  // Object URLs are a leak if they outlive their photo; release them when the
  // picker unmounts.
  useEffect(
    () => () => photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
    [],
  );

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
        roomType: guessRoomType(file.name),
        caption: '',
      }));

    // The same file picked twice would upload twice; key on name+size+mtime.
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

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;

    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
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
          'flex w-full flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed px-4 py-8 transition-colors',
          isDragging ? 'border-brand-600 bg-brand-50' : 'border-line bg-line-soft hover:border-brand-300',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-50">
          <ImagePlus className="size-4 text-brand-600" aria-hidden="true" />
        </span>
        <span className="text-[13px] font-semibold text-ink">Drag photos here, or click to browse</span>
        <span className="text-[11.5px] text-ink-muted">JPG, PNG or WebP · up to {MAX_MB}MB each</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          // Reset so re-picking the same file still fires a change event.
          event.target.value = '';
        }}
      />

      {error && <p className="text-[11.5px] text-warn">{error}</p>}

      {/* Selected photos */}
      {photos.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11.5px] text-ink-muted">
              {photos.length} photo{photos.length === 1 ? '' : 's'} · the first is the listing&apos;s cover
            </p>
            <Button size="sm" onClick={() => onChange([])} disabled={disabled}>
              Clear all
            </Button>
          </div>

          <ul className="space-y-2">
            {photos.map((photo, index) => (
              <li
                key={photo.id}
                className="flex items-start gap-3 rounded-lg border border-line bg-white p-2.5"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-line-soft">
                  <img src={photo.previewUrl} alt="" className="size-full object-cover" />
                  {index === 0 && (
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-brand-700/90 py-0.5 text-[9px] font-semibold text-white">
                      <Star className="size-2 fill-current" aria-hidden="true" />
                      Cover
                    </span>
                  )}
                </div>

                <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                  <Select
                    value={photo.roomType}
                    onChange={(event) => update(photo.id, { roomType: event.target.value })}
                    options={ROOM_TYPES}
                    aria-label={`Room type for ${photo.file.name}`}
                    disabled={disabled}
                  />
                  <Input
                    value={photo.caption}
                    onChange={(event) => update(photo.id, { caption: event.target.value })}
                    placeholder="Caption (optional)"
                    aria-label={`Caption for ${photo.file.name}`}
                    disabled={disabled}
                  />
                  <p className="truncate text-[10.5px] text-ink-muted sm:col-span-2">
                    {photo.file.name} · {(photo.file.size / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={disabled || index === 0}
                      aria-label={`Move ${photo.file.name} earlier`}
                      className="flex size-6 items-center justify-center rounded text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-30"
                    >
                      <GripVertical className="size-3 rotate-90" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={disabled || index === photos.length - 1}
                      aria-label={`Move ${photo.file.name} later`}
                      className="flex size-6 items-center justify-center rounded text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-30"
                    >
                      <GripVertical className="size-3 -rotate-90" aria-hidden="true" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(photo.id)}
                    disabled={disabled}
                    aria-label={`Remove ${photo.file.name}`}
                    className="flex size-6 items-center justify-center rounded text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

/** Compact "add more photos" control for a property that already exists. */
export const PhotoUploadButton = ({ onFiles, isPending, disabled }) => {
  const inputRef = useRef(null);

  return (
    <>
      <Button
        size="sm"
        onClick={() => inputRef.current?.click()}
        isLoading={isPending}
        disabled={disabled}
        leftIcon={<Upload className="size-3.5" aria-hidden="true" />}
      >
        Add photos
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          const files = [...event.target.files];
          event.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
};
