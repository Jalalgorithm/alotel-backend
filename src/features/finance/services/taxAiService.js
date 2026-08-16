import { env } from '@/lib/env';

/**
 * AI Tax Companion — Gemini-backed rate research, called directly from the
 * browser. The backend's own `POST /properties/taxes/suggest/` mirrors this
 * exact prompt/model-list/parsing logic (`aotel-backend/property/tax_ai.py`)
 * but is unavailable in this environment (`google-genai` isn't installed in
 * its virtualenv) — this is a client-side stand-in with an identical output
 * shape, not a redesign. Read-only: this module never writes a `TaxRule`,
 * same as the backend version — saving still goes through the real
 * `POST /properties/taxes/` via `financeService.createTaxRule`.
 */

/** Priority order — tried in turn until one succeeds. Mirrors `_GEMINI_MODELS` in `tax_ai.py`. */
const GEMINI_MODELS = ['gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'gemini-2.5-flash'];

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const RETRY_ATTEMPTS_PER_MODEL = 3;
const RETRY_BASE_DELAY_MS = 500;

/** Same instructions the backend sends Gemini, verbatim — see `_build_prompt` in `tax_ai.py`. */
const buildPrompt = (country, state, city) => {
  const scope = [city, state, country].filter(Boolean).join(', ');
  return (
    'You are a tax research assistant for a short/medium/long-stay property booking ' +
    `platform. List the lodging/occupancy/sales taxes that actually apply to a booking ` +
    `at this location: ${scope}. Only include taxes with a real legal basis you can cite ` +
    'a source for. Do not pad the list to look complete — if there is genuinely no local ' +
    'lodging tax, return fewer items rather than inventing one.\n\n' +
    'Respond with ONLY a JSON array (no markdown fences, no prose). Each item must have ' +
    'exactly these keys: rule_name (string), scope_level ("country"|"state"|"city"), ' +
    'tax_type ("percentage"|"fixed"), value (number), frequency ("per_night"|"per_booking"), ' +
    'display_label (string), confidence ("high"|"medium"|"low"), source_url (string), ' +
    'caveat (string or null).'
  );
};

/** Strip markdown code fences if Gemini wrapped the JSON in them — mirrors `_parse_json_response`. */
const parseJsonResponse = (text) => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }
  return JSON.parse(cleaned);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One model, with a short retry-with-backoff on transient errors — mirrors the SDK's built-in retry the backend relied on. */
const callGeminiModel = async (model, prompt, apiKey) => {
  let lastError;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS_PER_MODEL; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini returned an empty response.');
      return text;
    }

    lastError = new Error(`Gemini model "${model}" failed (${response.status}).`);
    if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === RETRY_ATTEMPTS_PER_MODEL) break;
    await sleep(RETRY_BASE_DELAY_MS * attempt);
  }

  throw lastError;
};

/** Tries each model in `GEMINI_MODELS` until one succeeds — mirrors `_generate_with_model_switcher`. */
const generateWithModelSwitcher = async (prompt, apiKey) => {
  let lastError;
  for (const model of GEMINI_MODELS) {
    try {
      return await callGeminiModel(model, prompt, apiKey);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`All Gemini models failed: ${lastError?.message ?? 'unknown error'}`);
};

/**
 * Mode A (country only) or Mode B (country + state + city) — same as the
 * backend. Returns `{mode, queried, suggestions}`, identical to what
 * `POST /properties/taxes/suggest/` returned, so nothing downstream (the
 * modal, `suggestionToRuleValues`, the save flow) needs to change.
 */
export const suggestTaxRules = async ({ country, state, city }) => {
  const apiKey = env.geminiApiKey;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set — add it to .env and restart the dev server.');

  const prompt = buildPrompt(country, state, city);
  const text = await generateWithModelSwitcher(prompt, apiKey);

  let raw;
  try {
    raw = parseJsonResponse(text);
  } catch {
    throw new Error('Gemini did not return valid JSON.');
  }
  if (!Array.isArray(raw)) throw new Error('Gemini did not return a JSON array.');

  const scopeLevel = city ? 'city' : state ? 'state' : 'country';

  return {
    mode: `${scopeLevel}_level`,
    queried: { country, state: state || null, city: city || null },
    suggestions: raw
      .filter((item) => item && typeof item === 'object')
      .map((item, index) => ({
        suggestion_id: `sugg_${index + 1}`,
        rule_name: item.rule_name ?? '',
        scope_level: item.scope_level ?? 'country',
        country,
        state: state || null,
        city: city || null,
        tax_type: item.tax_type ?? 'percentage',
        value: item.value,
        frequency: item.frequency ?? 'per_night',
        display_label: item.display_label ?? item.rule_name ?? '',
        confidence: item.confidence ?? 'medium',
        source_url: item.source_url ?? '',
        caveat: item.caveat ?? null,
      })),
  };
};
