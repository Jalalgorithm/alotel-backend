import { useMemo, useState } from 'react';
import { ChevronDown, LifeBuoy, Mail } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/classNames';
import { useHelpArticles } from '../hooks/useSystem';

/** Searchable help centre, grouped by category. */
export const HelpPage = () => {
  const { data: articles = [], isLoading } = useHelpArticles();
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);

  const grouped = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matched = needle
      ? articles.filter(
          (article) =>
            article.title.toLowerCase().includes(needle) || article.body.toLowerCase().includes(needle),
        )
      : articles;

    return matched.reduce((groups, article) => {
      groups[article.category] = groups[article.category] ?? [];
      groups[article.category].push(article);
      return groups;
    }, {});
  }, [articles, search]);

  const categories = Object.keys(grouped);

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Help" subtitle="How the portal works, and who to ask when it doesn't." />

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search the help centre…"
        aria-label="Search the help centre"
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-card" />
          ))}
        </div>
      ) : categories.length ? (
        categories.map((category) => (
          <Card key={category}>
            <CardHeader title={category} subtitle={`${grouped[category].length} articles`} />

            <ul className="divide-y divide-line border-t border-line">
              {grouped[category].map((article) => {
                const isOpen = openId === article.id;

                return (
                  <li key={article.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : article.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-line-soft"
                    >
                      <span className="text-[12.5px] font-medium text-ink">{article.title}</span>
                      <ChevronDown
                        aria-hidden="true"
                        className={cn('size-4 shrink-0 text-ink-muted transition-transform', isOpen && 'rotate-180')}
                      />
                    </button>

                    {isOpen && (
                      <p className="animate-fade-up px-4 pb-3.5 text-[12px] leading-6 text-ink-soft">
                        {article.body}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))
      ) : (
        <Card>
          <EmptyState
            title={`Nothing matches “${search}”`}
            description="Try a different phrase, or contact the platform team."
          />
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
            <LifeBuoy className="size-4 text-brand-600" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink">Still stuck?</p>
            <p className="text-[11.5px] text-ink-muted">
              The platform team answers within one business hour, 08:00–18:00 WAT.
            </p>
          </div>

          <Button
            variant="primary"
            href="mailto:platform@alotelspaces.com"
            leftIcon={<Mail className="size-3.5" aria-hidden="true" />}
          >
            Contact support
          </Button>
        </div>
      </Card>
    </div>
  );
};
