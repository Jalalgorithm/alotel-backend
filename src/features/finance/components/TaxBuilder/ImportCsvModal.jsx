import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Alert } from '@/components/ui/Alert';
import { CSV_TEMPLATE_COLUMNS } from '@/lib/taxSchema';
import { getErrorMessage } from '@/utils/errors';
import { importTaxRuleCsvRow } from '../../hooks/useFinance';

/** Minimal RFC4180-subset parser — quoted fields with embedded commas, doubled-quote escaping. Not built for arbitrary hostile CSVs, just the template this modal itself generates. */
const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
};

const parseCsv = (text) => {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== '');
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(header.map((col, i) => [col, (values[i] ?? '').trim()]));
  });
};

const downloadTemplate = () => {
  const example = ['NYC Occupancy Tax', 'USA', 'New York', '', 'New York City', 'percentage', '5.875', 'per_night', 'Occupancy Tax'];
  const csv = [CSV_TEMPLATE_COLUMNS.join(','), example.join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tax-rules-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Every imported row lands in `pending_review` — there is no bulk-import
 * backend endpoint, so this parses client-side and issues one
 * `POST /properties/taxes/` per row (`importTaxRuleCsvRow`), sequentially,
 * with a per-row success/failure summary rather than one pass/fail result.
 */
export const ImportCsvModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);

  const reset = () => {
    setFileName('');
    setRows([]);
    setParseError('');
    setProgress(0);
    setResults(null);
  };

  const handleFile = (file) => {
    reset();
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result ?? ''));
        if (!parsed.length) {
          setParseError('No data rows found — check the file has a header row plus at least one rule.');
          return;
        }
        setRows(parsed);
      } catch {
        setParseError('Could not read that file as CSV.');
      }
    };
    reader.onerror = () => setParseError('Could not read that file.');
    reader.readAsText(file);
  };

  const runImport = async () => {
    setIsImporting(true);
    setProgress(0);
    const outcomes = [];

    for (const row of rows) {
      try {
        // Deliberately sequential (not Promise.all) — see module doc comment.
        await importTaxRuleCsvRow(row);
        outcomes.push({ row, success: true });
      } catch (error) {
        outcomes.push({ row, success: false, error: getErrorMessage(error) });
      }
      setProgress((current) => current + 1);
    }

    queryClient.invalidateQueries({ queryKey: ['finance', 'tax-rules'] });
    setResults(outcomes);
    setIsImporting(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failureCount = results ? results.length - successCount : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Import tax rules from CSV"
      description="Every imported row lands in Pending review. Nothing is activated by an import."
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" leftIcon={<Download className="size-3.5" aria-hidden="true" />} onClick={downloadTemplate}>
            Download template
          </Button>
          <div className="flex gap-2">
            <Button onClick={close}>{results ? 'Done' : 'Cancel'}</Button>
            {!results && (
              <Button variant="primary" isLoading={isImporting} disabled={!rows.length} onClick={runImport}>
                {isImporting ? `Importing ${progress} of ${rows.length}…` : `Import ${rows.length} row${rows.length === 1 ? '' : 's'}`}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <FileDropzone accept="text/csv,.csv" hint="CSV, up to 20MB" fileName={fileName} onFileSelected={handleFile} />

        {parseError && <Alert variant="error">{parseError}</Alert>}

        {rows.length > 0 && !results && (
          <p className="text-[12px] text-ink-muted">
            Found {rows.length} row{rows.length === 1 ? '' : 's'} in <span className="font-semibold text-ink">{fileName}</span>.
          </p>
        )}

        {results && (
          <div className="space-y-2">
            <Alert variant={failureCount ? 'warn' : 'success'}>
              {successCount} imported{failureCount ? `, ${failureCount} failed` : ''}.
            </Alert>
            {failureCount > 0 && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {results.map((outcome, index) => (
                  <div key={index} className="flex items-start gap-2 rounded-lg border border-line bg-white px-3 py-2 text-[11.5px]">
                    {outcome.success ? (
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{outcome.row.rule_name || outcome.row.country || `Row`}</p>
                      {!outcome.success && <p className="text-danger">{outcome.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
