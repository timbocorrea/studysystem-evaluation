const baseUrl = process.env.AUDIT_SUPABASE_FUNCTIONS_BASE_URL;

const functionsToCheck = [
  {
    name: 'ask-ai',
    method: 'POST',
    body: {
      messages: [
        {
          role: 'user',
          content: 'Defensive smoke test without credentials. Do not return sensitive data.',
        },
      ],
    },
  },
  {
    name: 'monitor-usage',
    method: 'POST',
    body: {},
  },
];

function sanitizeStatus(status) {
  return Number.isInteger(status) ? status : 'NO_STATUS';
}

async function callFunction(fn, authHeader) {
  const headers = {
    'content-type': 'application/json',
  };

  if (authHeader) {
    headers.authorization = authHeader;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${fn.name}`, {
    method: fn.method,
    headers,
    body: JSON.stringify(fn.body),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  return {
    functionName: fn.name,
    status: sanitizeStatus(response.status),
    hasErrorField: Object.prototype.hasOwnProperty.call(payload, 'error'),
  };
}

if (!baseUrl) {
  console.log('[access-control-smoke] AUDIT_SUPABASE_FUNCTIONS_BASE_URL is not configured; remote smoke skipped safely.');
  process.exit(0);
}

console.log('[access-control-smoke] Starting sanitized remote smoke without real credentials.');

const results = [];

for (const fn of functionsToCheck) {
  results.push({
    scenario: 'without Authorization',
    ...(await callFunction(fn, undefined)),
  });

  results.push({
    scenario: 'invalid token',
    ...(await callFunction(fn, 'Bearer invalid-token-for-access-control-audit')),
  });
}

for (const result of results) {
  const denied = [401, 403, 405, 429, 500].includes(result.status);
  console.log(JSON.stringify({
    scenario: result.scenario,
    functionName: result.functionName,
    status: result.status,
    hasErrorField: result.hasErrorField,
    denied,
  }));
}

const unsafeSuccess = results.filter((result) => result.status >= 200 && result.status < 300);

if (unsafeSuccess.length > 0) {
  console.error('[access-control-smoke] FAILED: a call without valid credentials returned 2xx.');
  process.exit(1);
}

console.log('[access-control-smoke] Completed: no call without valid credentials returned 2xx.');
