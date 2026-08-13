/** Public API of the properties feature. */
export { PropertiesPage } from './components/PropertiesPage';
export { PropertyWizardPage } from './components/PropertyWizardPage';
export { PropertyDetailPage } from './components/PropertyDetailPage';
export { UnitsPage } from './components/UnitsPage';
export { AmenitiesPage } from './components/AmenitiesPage';
export { PricingPage } from './components/PricingPage';
export { PropertyReviewPage } from './components/PropertyReviewPage';

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
  useUnits,
  useUnitStatus,
  useAmenities,
  useToggleAmenity,
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
