import { ImageOff } from 'lucide-react';
import { ROOM_AREAS } from '@/lib/checkoutSchema';

const roomLabel = (value) => ROOM_AREAS.find((room) => room.value === value)?.label ?? value;

/**
 * Every already-saved inspection photo for a stage, as one flat, evenly
 * sized grid with a room-area chip on each thumbnail — replaces the old
 * "one heading + one mini-grid per room area" layout (up to 7 stacked
 * sections) that was the source of the confusing, ever-reflowing page as
 * photos came in one at a time. One gallery shape, reused everywhere a
 * stage's photos are shown: the check-in/check-out capture flow
 * (`CheckInOutPage`) and the post-checkout review (`CheckoutReportDetailModal`).
 */
export const RoomPhotoGallery = ({ photos = [], emptyLabel = 'No photos yet.' }) => {
  if (!photos.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-ink-muted">
        <ImageOff className="size-5" aria-hidden="true" />
        <p className="text-[11.5px]">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {photos.map((photo) => (
        <a
          key={photo.id}
          href={photo.file}
          target="_blank"
          rel="noreferrer"
          className="group relative block overflow-hidden rounded-lg border border-line"
        >
          <img
            src={photo.file}
            alt={photo.caption || roomLabel(photo.room_area)}
            className="aspect-square w-full object-cover"
            loading="lazy"
          />
          <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.04em] text-white">
            {roomLabel(photo.room_area)}
          </span>
        </a>
      ))}
    </div>
  );
};
