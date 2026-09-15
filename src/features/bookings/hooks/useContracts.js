import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contractService } from '../services/contractService';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from '@/stores/uiStore';
import { getErrorMessage } from '@/utils/errors';

/* -------------------------------------------------------------------------- */
/* Templates                                                                   */
/* -------------------------------------------------------------------------- */

/** The 25-cell coverage grid — the Contract Templates landing view. */
export const useContractCoverage = () =>
  useQuery({
    queryKey: queryKeys.contracts.coverage(),
    queryFn: contractService.getCoverage,
  });

/** Every template (draft/published/retired) for one region+stay_type cell — the cell-detail history. */
export const useTemplatesForCell = (region, stayType) =>
  useQuery({
    queryKey: queryKeys.contracts.templatesForCell(region, stayType),
    queryFn: () => contractService.getTemplatesForCell({ region, stayType }),
    enabled: Boolean(region && stayType),
  });

/** The flat "All templates" search view, optionally filtered. */
export const useTemplates = (params = {}) =>
  useQuery({
    queryKey: queryKeys.contracts.templates(params),
    queryFn: () => contractService.getTemplates(params),
    placeholderData: keepPreviousData,
  });

export const useMergeFields = () =>
  useQuery({
    queryKey: queryKeys.contracts.mergeFields(),
    queryFn: contractService.getMergeFields,
    staleTime: 1000 * 60 * 10,
  });

const invalidateCell = (queryClient, region, stayType) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.contracts.coverage() });
  queryClient.invalidateQueries({ queryKey: queryKeys.contracts.templatesForCell(region, stayType) });
  queryClient.invalidateQueries({ queryKey: queryKeys.contracts.templates() });
};

export const useCreateTemplateDraft = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values) => contractService.createTemplateDraft(values),
    onSuccess: (template) => {
      invalidateCell(queryClient, template.region, template.stayType);
      toast.success('Draft created', `${template.name} · v${template.version}`);
    },
    onError: (error) => toast.error('Could not create the draft', getErrorMessage(error)),
  });
  return { createDraft: mutation.mutate, createDraftAsync: mutation.mutateAsync, isCreating: mutation.isPending };
};

/**
 * Draft-only edits — a `not_editable` rejection is a real possibility here
 * (the template moved to published/retired since the editor loaded), so this
 * doesn't auto-toast: the editor inspects the error itself and shows the
 * doc's specific copy inline rather than a generic failure toast.
 */
export const useUpdateTemplateDraft = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, patch }) => contractService.updateTemplateDraft(id, patch),
    onSuccess: (template) => invalidateCell(queryClient, template.region, template.stayType),
  });
  return { updateDraft: mutation.mutate, updateDraftAsync: mutation.mutateAsync, isSaving: mutation.isPending };
};

/** `not_deletable` is a normal, expected outcome (published, or a draft already in use) — left for the caller to render inline. */
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id }) => contractService.deleteTemplate(id),
    onSuccess: (_result, { region, stayType }) => {
      invalidateCell(queryClient, region, stayType);
      toast.success('Draft deleted');
    },
  });
  return { deleteTemplate: mutation.mutate, deleteTemplateAsync: mutation.mutateAsync, isDeleting: mutation.isPending };
};

/** Validation failures (`unknown_fields`/`missing_signature_field`/`missing_values`) are shown inline by the editor, not toasted. */
export const usePublishTemplate = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id }) => contractService.publishTemplate(id),
    onSuccess: ({ published }) => {
      if (published) invalidateCell(queryClient, published.region, published.stayType);
      toast.success('Template published', published ? `${published.name} · v${published.version} is now live.` : undefined);
    },
  });
  return { publish: mutation.mutate, publishAsync: mutation.mutateAsync, isPublishing: mutation.isPending };
};

/** The first call (no confirm) is expected to 400 with `confirmation_required` — that's the two-step flow, not a failure; left unhandled here on purpose. */
export const useRetireTemplate = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, confirm }) => contractService.retireTemplate(id, { confirm }),
    onSuccess: (template) => {
      invalidateCell(queryClient, template.region, template.stayType);
      toast.success('Template retired');
    },
  });
  return { retire: mutation.mutate, retireAsync: mutation.mutateAsync, isRetiring: mutation.isPending };
};

export const useDuplicateTemplate = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, target }) => contractService.duplicateTemplate(id, target),
    onSuccess: (template) => {
      invalidateCell(queryClient, template.region, template.stayType);
      toast.success('New draft created', `${template.name} · v${template.version}`);
    },
    onError: (error) => toast.error('Could not duplicate the template', getErrorMessage(error)),
  });
  return { duplicate: mutation.mutate, duplicateAsync: mutation.mutateAsync, isDuplicating: mutation.isPending };
};

/** No mutation — a pure render call, so the editor drives it directly rather than through `useMutation`'s success/error ceremony. */
export const usePreviewTemplate = () => {
  const mutation = useMutation({ mutationFn: (values) => contractService.previewTemplate(values) });
  return { preview: mutation.mutate, previewAsync: mutation.mutateAsync, isPreviewing: mutation.isPending, result: mutation.data };
};

/* -------------------------------------------------------------------------- */
/* Signing pipeline                                                            */
/* -------------------------------------------------------------------------- */

export const useContractList = (params = {}) =>
  useQuery({
    queryKey: queryKeys.contracts.list(params),
    queryFn: () => contractService.listContracts(params),
    placeholderData: keepPreviousData,
  });

export const useUnsentContracts = (params = {}) =>
  useQuery({
    queryKey: queryKeys.contracts.unsent(params),
    queryFn: () => contractService.getUnsentContracts(params),
    placeholderData: keepPreviousData,
  });

export const useContractSummary = () =>
  useQuery({
    queryKey: queryKeys.contracts.summary(),
    queryFn: contractService.getContractSummary,
    staleTime: 1000 * 30,
  });

export const useContractDetail = (contractId) =>
  useQuery({
    queryKey: queryKeys.contracts.detail(contractId),
    queryFn: () => contractService.getContractDetail(contractId),
    enabled: Boolean(contractId),
  });

export const useContractEvents = (contractId) =>
  useQuery({
    queryKey: queryKeys.contracts.events(contractId),
    queryFn: () => contractService.getContractEvents(contractId),
    enabled: Boolean(contractId),
  });

/** Whether — and what — has already been issued for one booking, before a contract id is known. */
export const useContractForBooking = (bookingId) =>
  useQuery({
    queryKey: queryKeys.contracts.forBooking(bookingId),
    queryFn: () => contractService.getContractForBooking(bookingId),
    enabled: Boolean(bookingId),
  });

const invalidateBoard = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
};

/**
 * `override_reason_required` and `already_active` are real, expected outcomes
 * of picking a non-default template or double-sending — left for the caller
 * to render inline (a reason field appearing, or a "void first" prompt)
 * rather than a generic failure toast.
 */
export const useSendContract = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload) => contractService.sendContract(payload),
    onSuccess: (_data, { bookingId }) => {
      invalidateBoard(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.forBooking(bookingId) });
      toast.success('Contract sent', 'The guest has been emailed a signing link.');
    },
  });
  return { sendContract: mutation.mutate, sendContractAsync: mutation.mutateAsync, isSending: mutation.isPending, pendingId: mutation.variables?.bookingId };
};

/** `not_voidable` is expected if the status changed underneath the drawer — left for the caller. */
export const useVoidContract = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ contractId, reason, reissue }) => contractService.voidContract(contractId, { reason, reissue }),
    onSuccess: (_result, { contractId }) => {
      invalidateBoard(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      toast.success('Contract voided');
    },
  });
  return { voidContract: mutation.mutate, voidContractAsync: mutation.mutateAsync, isVoiding: mutation.isPending };
};

/** `too_soon` (429, with `retry_after_seconds`) is expected under the cooldown — left for the caller to show a countdown. */
export const useRemindContract = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (contractId) => contractService.remindContract(contractId),
    onSuccess: (_result, contractId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      toast.success('Reminder sent');
    },
  });
  return { remind: mutation.mutate, remindAsync: mutation.mutateAsync, isReminding: mutation.isPending };
};

/** Always fetched fresh — the URL is short-lived, never cached in query state. */
export const useContractDocument = () => {
  const mutation = useMutation({
    mutationFn: ({ contractId, download }) => contractService.getContractDocument(contractId, { download }),
    onError: (error) => toast.error('Could not open the document', getErrorMessage(error)),
  });
  return { fetchDocument: mutation.mutateAsync, isFetching: mutation.isPending };
};
