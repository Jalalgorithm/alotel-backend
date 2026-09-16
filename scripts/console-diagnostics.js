/**
 * Alotel Spaces Admin — live API diagnostics.
 *
 * What this is: a paste-into-DevTools-console script, not a build-time test.
 * There's no test runner in this project yet, and the fastest way to find out
 * *why* a screen looks broken in production — auth, a 500, a genuinely empty
 * result, or something else — is to hit the same endpoints the page hits and
 * read the real status code and error body back, instead of reading tea
 * leaves off a blank column.
 *
 * How to use it:
 *   1. Open the admin portal in your browser and log in normally.
 *   2. Open DevTools → Console.
 *   3. Paste this entire file's contents and press Enter.
 *   4. Read the table. Every FAIL row shows the real HTTP status and the
 *      backend's error body — that's the actual cause, not a guess.
 *
 * It works on any environment (local, staging, production) with zero setup:
 * it auto-detects the API base URL from a request the page already made
 * (via the Resource Timing API), and reads your session's bearer token from
 * localStorage the same way the app itself does.
 *
 * Deliberately read-only: every check here is a GET. It never approves,
 * rejects, sends, or voids anything — safe to run against a real, live
 * environment with real guests and real contracts.
 */
(async () => {
  const apiEntry = performance
    .getEntriesByType('resource')
    .find((r) => /\/api\/v\d+\//.test(r.name));

  if (!apiEntry) {
    console.error(
      'Could not detect the API base URL. Reload the page (so it makes at least one API call), ' +
        'wait for it to finish loading, then paste this script again.',
    );
    return;
  }

  const API_BASE = apiEntry.name.match(/^(https?:\/\/[^/]+\/api\/v\d+)/)[1];
  const token = localStorage.getItem('alotel.admin.token');

  if (!token) {
    console.error('No auth token in localStorage (alotel.admin.token) — make sure you are logged in.');
    return;
  }

  // One row per screen this covers: the Contracts board's five columns plus
  // summary counts, the Templates coverage grid + library, and the KYC queue
  // that was reported broken alongside it.
  const CHECKS = [
    ['Contract coverage grid', '/contracts/templates/coverage/'],
    ['Contract templates — list', '/contracts/templates/'],
    ['Contracts — summary counts', '/contracts/summary/'],
    ['Contracts board — Not sent', '/contracts/unsent/'],
    ['Contracts board — Awaiting', '/contracts/?status=sent'],
    ['Contracts board — Declined', '/contracts/?status=declined'],
    ['Contracts board — Expired', '/contracts/?status=expired'],
    ['Contracts board — Signed', '/contracts/?status=signed'],
    ['Contracts — unfiltered list', '/contracts/'],
    ['KYC — pending queue', '/kyc/full/pending/'],
  ];

  console.log(`Running Alotel diagnostics against ${API_BASE} …`);

  const results = [];
  for (const [label, path] of CHECKS) {
    const startedAt = performance.now();
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const elapsedMs = Math.round(performance.now() - startedAt);
      let body = null;
      try {
        body = await res.json();
      } catch {
        /* non-JSON body — leave null, status code still tells the story */
      }

      const rowCount = Array.isArray(body?.results)
        ? body.results.length
        : Array.isArray(body)
          ? body.length
          : null;

      results.push({
        Check: label,
        Status: res.status,
        Result: res.ok ? 'PASS' : 'FAIL',
        'Time (ms)': elapsedMs,
        Detail: res.ok
          ? rowCount === null
            ? 'ok'
            : `${rowCount} row(s)`
          : (body?.error ?? res.statusText),
      });
    } catch (err) {
      results.push({
        Check: label,
        Status: '—',
        Result: 'FAIL',
        'Time (ms)': '—',
        Detail: `Network error: ${err.message}`,
      });
    }
  }

  console.table(results);

  const failed = results.filter((r) => r.Result === 'FAIL');
  if (failed.length) {
    console.warn(
      `${failed.length} of ${results.length} check(s) failed. Each FAIL row's "Detail" column is the ` +
        'backend\'s actual error — a 401/403 means an auth/permission problem, a 500 means a backend ' +
        'exception (check its "error" field), and a network error means the request never reached the API at all.',
    );
  } else {
    console.log(`All ${results.length} checks passed — the API is answering these endpoints correctly.`);
  }
})();
