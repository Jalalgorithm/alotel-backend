import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Download } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Alert } from '@/components/ui/Alert';
import { CSV_TEMPLATE_COLUMNS } from '@/lib/taxSchema';
import { getErrorMessage } from '@/utils/errors';
import { bulkImportTaxRules } from '../../hooks/useFinance';

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
 * `POST /properties/taxes/bulk-import/` — the raw file is sent as-is; the
 * server parses and validates it. All-or-nothing: any invalid row rejects the
 * whole file with a per-line error list and creates nothing, unlike the old
 * per-row loop this replaced (which could partially succeed). Client-side
 * parsing below is only for the row-count preview shown before submitting.
 */
export const ImportCsvModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => {
    setFile(null);
    setFileName('');
    setRows([]);
    setParseError('');
    setResult(null);
  };

  const handleFile = (selected) => {
    reset();
    if (!selected) return;
    setFile(selected);
    setFileName(selected.name);

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
    reader.readAsText(selected);
  };

  const runImport = async () => {
    setIsImporting(true);
    try {
      const { importedCount } = await bulkImportTaxRules({ file, rows });
      queryClient.invalidateQueries({ queryKey: ['finance', 'tax-rules'] });
      setResult({ success: true, importedCount });
    } catch (error) {
      setResult({
        success: false,
        message: getErrorMessage(error),
        rowErrors: error?.response?.data?.row_errors ?? [],
      });
    }
    setIsImporting(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Import tax rules from CSV"
      description="Every imported row lands in Pending review. The whole file is all-or-nothing — if any row fails validation, nothing is imported."
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" leftIcon={<Download className="size-3.5" aria-hidden="true" />} onClick={downloadTemplate}>
            Download template
          </Button>
          <div className="flex gap-2">
            <Button onClick={close}>{result ? 'Done' : 'Cancel'}</Button>
            {!result?.success && (
              <Button variant="primary" isLoading={isImporting} disabled={!file} onClick={runImport}>
                {isImporting ? 'Importing…' : `Import ${rows.length} row${rows.length === 1 ? '' : 's'}`}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <FileDropzone accept="text/csv,.csv" hint="CSV, up to 20MB" fileName={fileName} onFileSelected={handleFile} />

        {parseError && <Alert variant="error">{parseError}</Alert>}

        {rows.length > 0 && !result && (
          <p className="text-[12px] text-ink-muted">
            Found {rows.length} row{rows.length === 1 ? '' : 's'} in <span className="font-semibold text-ink">{fileName}</span>.
          </p>
        )}

        {result?.success && (
          <Alert variant="success">
            {result.importedCount} rule{result.importedCount === 1 ? '' : 's'} imported, all landed in Pending review.
          </Alert>
        )}

        {result && !result.success && (
          <div className="space-y-2">
            <Alert variant="error">{result.message}</Alert>
            {result.rowErrors.length > 0 && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {result.rowErrors.map((rowError) => (
                  <div key={rowError.line} className="flex items-start gap-2 rounded-lg border border-line bg-white px-3 py-2 text-[11.5px]">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">Line {rowError.line}</p>
                      <p className="text-danger">{rowError.errors.join(' ')}</p>
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
