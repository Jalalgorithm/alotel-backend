import { useRef, useState } from 'react';
import { FileCheck2, Upload, X } from 'lucide-react';
import { cn } from '@/utils/classNames';
import { Button } from './Button';

const DEFAULT_ACCEPT = 'image/jpeg,image/png,application/pdf';

/**
 * Drag-and-drop file picker used by photo capture and document upload flows.
 *
 * @param {{
 *   onFileSelected?: (file: File | null) => void,
 *   accept?: string,
 *   maxSizeMb?: number,
 *   hint?: string,
 *   fileName?: string,
 * }} props
 */
export const FileDropzone = ({
  onFileSelected,
  accept = DEFAULT_ACCEPT,
  maxSizeMb = 20,
  hint = 'JPG, PNG or PDF, up to 20MB',
  fileName,
  compact = false,
  className,
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedName, setSelectedName] = useState(fileName ?? '');
  const [error, setError] = useState('');

  const acceptFile = (file) => {
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File is larger than ${maxSizeMb}MB. Please upload a smaller file.`);
      return;
    }

    setError('');
    setSelectedName(file.name);
    onFileSelected?.(file);
  };

  const clear = () => {
    setSelectedName('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
    onFileSelected?.(null);
  };

  return (
    <div className={className}>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          acceptFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors',
          compact ? 'px-4 py-6' : 'px-6 py-9',
          isDragging ? 'border-brand-600 bg-brand-50' : 'border-line bg-white',
          error && 'border-danger',
        )}
      >
        {selectedName ? (
          <>
            <FileCheck2 className="size-6 text-brand-600" aria-hidden="true" />
            <p className="mt-2 text-[12px] font-semibold text-ink">{selectedName}</p>
            <button
              type="button"
              onClick={clear}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ink-muted transition-colors hover:text-danger"
            >
              <X className="size-3" /> Remove file
            </button>
          </>
        ) : (
          <>
            <Upload className="size-5 text-ink-muted" aria-hidden="true" />
            <p className="mt-2 text-[13px] font-semibold text-ink">Choose a file or drag &amp; drop</p>
            <p className="mt-0.5 text-[11px] text-ink-muted">{hint}</p>
            <Button type="button" size="xs" className="mt-3" onClick={() => inputRef.current?.click()}>
              Browse file
            </Button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />
      </div>

      {error && <p className="mt-1.5 text-[11px] text-danger">{error}</p>}
    </div>
  );
};
