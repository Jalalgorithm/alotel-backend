/** Public API of the properties feature. */
export { PropertiesPage } from './components/PropertiesPage';
export { PropertyWizardPage } from './components/PropertyWizardPage';
export { PropertyDetailPage } from './components/PropertyDetailPage';
export { PricingPage } from './components/PricingPage';
export { PropertyReviewPage } from './components/PropertyReviewPage';
export { AddressFields } from './components/AddressFields';

export {
  useProperties,
  useProperty,
  usePropertyImages,
  usePropertyStatus,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty,
} from './hooks/useProperties';
export {
  usePropertyReviews,
  useRespondToReview,
  useFlagReview,
  useDiscountRules,
  useDiscountRuleMutations,
  usePricingConfigs,
  usePricingConfigMutations,
  usePricingRules,
  useUpsertPricingRule,
} from './hooks/useCatalogue';

export { propertyService } from './services/propertyService';
