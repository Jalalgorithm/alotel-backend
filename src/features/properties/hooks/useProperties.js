import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../services/propertyService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';
import { STATUS_LABELS } from '@/lib/propertySchema';
import { paths } from '@/routes/paths';

/**
 * Paginated / filtered property list.
 * `placeholderData` holds the current page on screen while the next one loads,
 * so filtering never flashes an empty table.
 */
export const useProperties = (params = {}) =>
  useQuery({
    queryKey: queryKeys.properties.list(params),
    queryFn: () => propertyService.getProperties(params),
    placeholderData: keepPreviousData,
  });

export const useProperty = (id) =>
  useQuery({
    queryKey: queryKeys.properties.detail(id),
    queryFn: () => propertyService.getProperty(id),
    enabled: Boolean(id),
  });

/**
 * Resolve a handful of properties by id, independent of pagination/search —
 * for rendering something already chosen elsewhere (e.g. a staff member's
 * assigned-properties list) even when it isn't on the current results page.
 */
export const usePropertiesByIds = (ids = []) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.properties.detail(id),
      queryFn: () => propertyService.getProperty(id),
      enabled: Boolean(id),
      staleTime: Infinity,
    })),
  });

/**
 * The property's gallery. Photos change far less often than the listing
 * itself, so this keeps its own longer staleness rather than being refetched
 * every time a status flips.
 */
export const usePropertyImages = (id) =>
  useQuery({
    queryKey: queryKeys.properties.images(id),
    queryFn: () => propertyService.getPropertyImages(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10,
  });

/**
 * Upload a set of photos to a property.
 *
 * The endpoint takes one file per request, so these are sent sequentially
 * rather than in parallel: a burst of ten multipart uploads is the fastest way
 * to trip the server's throttle, and ordering matters — `order` is what the
 * gallery sorts by.
 *
 * The first photo also becomes the property's `thumbNail`, which is what the
 * card grids and the guest listing show.
 */
export const useUploadPropertyImages = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ propertyId, photos, startOrder = 0, setThumbnail = false }) => {
      const uploaded = [];

      for (const [index, photo] of photos.entries()) {
        uploaded.push(
          await propertyService.uploadPropertyImage({
            propertyId,
            file: photo.file,
            roomType: photo.roomType ?? 'Other',
            caption: photo.caption ?? '',
            order: startOrder + index,
          }),
        );
      }

      if (setThumbnail && photos.length) {
        await propertyService.setPropertyThumbnail({ propertyId, file: photos[0].file });
      }

      return uploaded;
    },
    onSuccess: (_uploaded, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.images(propertyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
    },
    onError: (error) => toast.error('Could not upload photos', getErrorMessage(error)),
  });

  return {
    uploadImages: mutation.mutate,
    uploadImagesAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
};

/** Promote a photo that is already in the gallery to the listing's cover. */
export const useSetCoverPhoto = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ propertyId, imageUrl }) =>
      propertyService.setPropertyThumbnail({ propertyId, imageUrl }),
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
      if (property?.id) queryClient.setQueryData(queryKeys.properties.detail(property.id), property);
      toast.success('Cover photo updated', 'It is what guests see in search results.');
    },
    onError: (error) => toast.error('Could not set the cover photo', getErrorMessage(error)),
  });

  return { setCover: mutation.mutate, isPending: mutation.isPending, pendingUrl: mutation.variables?.imageUrl };
};

export const useDeletePropertyImage = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ propertyId, imageId }) => propertyService.deletePropertyImage({ propertyId, imageId }),
    onSuccess: (_result, { propertyId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.images(propertyId) });
      toast.success('Photo removed');
    },
    onError: (error) => toast.error('Could not remove photo', getErrorMessage(error)),
  });

  return { deleteImage: mutation.mutate, isPending: mutation.isPending };
};

/** Publish / archive / return-to-draft. */
export const usePropertyStatus = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }) => propertyService.setPropertyStatus(id, status),
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
      queryClient.setQueryData(queryKeys.properties.detail(property.id), property);
      toast.success(
        property.status === 'published' ? 'Property published' : 'Status updated',
        `${property.name} is now ${STATUS_LABELS[property.status] ?? property.status}.`,
      );
    },
    onError: (error) => toast.error('Could not update property', getErrorMessage(error)),
  });

  return {
    setStatus: mutation.mutate,
    setStatusAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    pendingId: mutation.variables?.id,
  };
};

/**
 * Create a listing from the wizard.
 *
 * Takes `{ form, publish }` — publishing is a second API call the service
 * chains on, so the caller only ever sees one promise.
 */
export const useCreateProperty = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: propertyService.createProperty,
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
      queryClient.setQueryData(queryKeys.properties.detail(property.id), property);
      toast.success(
        property.status === 'published' ? 'Property published' : 'Draft saved',
        `${property.name} · ${property.id}`,
      );
    },
    onError: (error) => toast.error('Could not save property', getErrorMessage(error)),
  });

  return {
    createProperty: mutation.mutate,
    createPropertyAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
};

/** Inline edits from the detail page. */
export const useUpdateProperty = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, patch }) => propertyService.updateProperty(id, patch),
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
      queryClient.setQueryData(queryKeys.properties.detail(property.id), property);
      toast.success('Changes saved', `${property.name} updated.`);
    },
    onError: (error) => toast.error('Could not save changes', getErrorMessage(error)),
  });

  return {
    updateProperty: mutation.mutate,
    updatePropertyAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
};

/** Deleting is terminal, so the caller sends the admin back to the list. */
export const useDeleteProperty = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (id) => propertyService.deleteProperty(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.properties.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all });
      toast.success('Property deleted', 'The listing has been removed.');
      navigate(paths.properties);
    },
    onError: (error) => toast.error('Could not delete property', getErrorMessage(error)),
  });

  return { deleteProperty: mutation.mutate, isPending: mutation.isPending };
};
