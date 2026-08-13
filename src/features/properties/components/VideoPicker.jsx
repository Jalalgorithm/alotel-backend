import { useEffect, useRef, useState } from 'react';
import { Film, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/classNames';

/** `PropertyVideo.roomType` choices. */
export const VIDEO_ROOM_TYPES = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Entrance', 'Walkthrough', 'Other'];

const ACCEPT = 'video/mp4,video/quicktime,video/webm';
const MAX_MB = 100;

/**
 * Multi-video picker, mirroring `PhotoPicker`'s UX (drag-drop, room tagging,
 * per-file caption) but for `property_video` uploads. No cover-video concept
 * (unlike photos, videos don't have a "thumbnail of the listing" role), so no
 * ordering/promote-to-cover controls.
 *
 * @param {{ videos: Array<{ id, file, previewUrl, roomType, caption }>, onChange: (videos) => void }} props
 */
export const VideoPicker = ({ videos, onChange, disabled = false }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  useEffect(
    () => () => videos.forEach((video) => URL.revokeObjectURL(video.previewUrl)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
    [],
  );

  const addFiles = (fileList) => {
    const incoming = [...fileList];
    if (!incoming.length) return;

    const tooBig = incoming.filter((file) => file.size > MAX_MB * 1024 * 1024);
    const wrongType = incoming.filter((file) => !file.type.startsWith('video/'));

    if (tooBig.length || wrongType.length) {
      setError(
        [
          tooBig.length && `${tooBig.length} file(s) over ${MAX_MB}MB`,
          wrongType.length && `${wrongType.length} non-video file(s)`,
        ]
          .filter(Boolean)
          .join(' and ') + ' were skipped.',
      );
    } else {
      setError('');
    }

    const accepted = incoming
      .filter((file) => file.type.startsWith('video/') && file.size <= MAX_MB * 1024 * 1024)
      .map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        previewUrl: URL.createObjectURL(file),
        roomType: 'Walkthrough',
        caption: '',
      }));

    const existing = new Set(videos.map((video) => video.id));
    onChange([...videos, ...accepted.filter((video) => !existing.has(video.id))]);
  };

  const remove = (id) => {
    const video = videos.find((entry) => entry.id === id);
    if (video) URL.revokeObjectURL(video.previewUrl);
    onChange(videos.filter((entry) => entry.id !== id));
  };

  const update = (id, patch) => onChange(videos.map((video) => (video.id === id ? { ...video, ...patch } : video)));

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
          'flex w-full flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed px-4 py-8 transition-colors',
          isDragging ? 'border-brand-600 bg-brand-50' : 'border-line bg-line-soft hover:border-brand-300',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-50">
          <Film className="size-4 text-brand-600" aria-hidden="true" />
        </span>
        <span className="text-[13px] font-semibold text-ink">Drag videos here, or click to browse</span>
        <span className="text-[11.5px] text-ink-muted">MP4, MOV or WebM · up to {MAX_MB}MB each</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {error && <p className="text-[11.5px] text-warn">{error}</p>}

      {videos.length > 0 && (
        <ul className="space-y-2">
          {videos.map((video) => (
            <li key={video.id} className="flex items-start gap-3 rounded-lg border border-line bg-white p-2.5">
              <video src={video.previewUrl} className="size-16 shrink-0 rounded-md bg-black object-cover" muted />

              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <Select
                  value={video.roomType}
                  onChange={(event) => update(video.id, { roomType: event.target.value })}
                  options={VIDEO_ROOM_TYPES}
                  aria-label={`Room type for ${video.file.name}`}
                  disabled={disabled}
                />
                <Input
                  value={video.caption}
                  onChange={(event) => update(video.id, { caption: event.target.value })}
                  placeholder="Caption (optional)"
                  aria-label={`Caption for ${video.file.name}`}
                  disabled={disabled}
                />
                <p className="truncate text-[10.5px] text-ink-muted sm:col-span-2">
                  {video.file.name} · {(video.file.size / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>

              <button
                type="button"
                onClick={() => remove(video.id)}
                disabled={disabled}
                aria-label={`Remove ${video.file.name}`}
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

/** Compact "add a video" control for a property that already exists, mirroring `PhotoUploadButton`. */
export const VideoUploadButton = ({ onFiles, isPending, disabled }) => {
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
        Add video
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

