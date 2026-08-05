import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth';
import { landingPathFor } from './navigation';

/** 404 fallback inside the portal shell. */
export const NotFoundPage = () => {
  const { capabilities, role } = useAuth();

  return (
    <EmptyState
      className="min-h-[60vh]"
      icon={<Compass className="size-5 text-brand-600" aria-hidden="true" />}
      title="Screen not found"
      description="The page you are looking for doesn't exist or has been moved."
      action={
        <Button variant="primary" to={landingPathFor(capabilities, role)}>
          Back to my dashboard
        </Button>
      }
    />
  );
};
