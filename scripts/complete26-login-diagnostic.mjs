// Test-harness-only metadata. Never read token bodies, headers, or request data.
export const LOGIN_STAGES = Object.freeze([
  'navigation', 'form_visible', 'credentials_fill', 'submit_redirect',
  'session_fetch', 'session_assert', 'complete'
]);
export const LOGIN_SESSION_STATUSES = Object.freeze([
  'supabase_user_with_profile', 'session_missing', 'auth_disabled_fail_closed', 'demo_public',
  'auth_mode_disabled', 'public_config_missing', 'unsupported_bearer_transport',
  'claims_unverified', 'user_unverified', 'claims_user_mismatch', 'anonymous_identity',
  'identity_malformed', 'profile_missing', 'profile_inactive', 'dependency_unavailable',
  'verified', 'unrecognized'
]);
const ERROR_CLASSES = ['timeout', 'assertion_or_operation_failed'];
const SESSION_CLASSES = ['accepted', 'http_failure', 'cache_policy_failure', 'malformed', 'identity_or_auth_mismatch'];
const MAX_EVENTS = 8;
const MAX_BYTES = 1600;
const exact = (v, keys) => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v).sort().join('|') === [...keys].sort().join('|');
const statusValid = n => Number.isInteger(n) && n >= 100 && n <= 599;
export function loginHttpClass(status) {
  if (!statusValid(status)) throw Error('Invalid login HTTP status.');
  return status < 200 ? 'informational' : status < 300 ? 'success' : status < 400 ? 'redirect' : status === 401 ? 'unauthorized'
    : status === 403 ? 'forbidden' : status === 429 ? 'rate_limited' : status < 500 ? 'client_error' : 'server_error';
}
export function parseLoginDiagnostic(value) {
  const bad = () => { throw Error('Invalid bounded login diagnostic.'); };
  if (!exact(value, ['stage', 'errorClass', 'network', 'overflow', 'session']) ||
      !LOGIN_STAGES.includes(value.stage) || value.stage === 'complete' ||
      !ERROR_CLASSES.includes(value.errorClass) || typeof value.overflow !== 'boolean' ||
      !Array.isArray(value.network) || value.network.length > MAX_EVENTS) bad();
  for (const event of value.network) {
    if (!exact(event, ['path', 'method', 'status', 'outcome']) ||
        !((event.path === '/auth/v1/token' && event.method === 'POST') ||
          (event.path === '/api/auth/session' && event.method === 'GET')) ||
        !(event.status === null ? event.outcome === 'network_failed' :
          statusValid(event.status) && event.outcome === loginHttpClass(event.status))) bad();
  }
  if (value.session !== null && (!exact(value.session, ['status', 'sessionStatus', 'classification']) ||
      value.stage !== 'session_assert' ||
      !statusValid(value.session.status) || !LOGIN_SESSION_STATUSES.includes(value.session.sessionStatus) ||
      !SESSION_CLASSES.includes(value.session.classification) ||
      (value.session.classification === 'http_failure') !== (value.session.status !== 200) ||
      (value.session.classification === 'accepted' && value.session.sessionStatus !== 'supabase_user_with_profile'))) bad();
  if (Buffer.byteLength(JSON.stringify(value)) > MAX_BYTES) bad();
  return structuredClone(value);
}

// Only an already projected session summary is accepted; UUIDs/body remain in the browser.
export function classifyLoginSession(evidence) {
  const status = evidence.status;
  if (!statusValid(status)) throw Error('Invalid login session status.');
  return {
    status,
    sessionStatus: LOGIN_SESSION_STATUSES.includes(evidence.sessionStatus) ? evidence.sessionStatus : 'unrecognized',
    classification: status !== 200 ? 'http_failure' : evidence.noStore !== true ? 'cache_policy_failure'
      : evidence.bodyRecord !== true ? 'malformed' : evidence.accepted === true ? 'accepted' : 'identity_or_auth_mismatch'
  };
}

export function observeLogin(page, origin, authOrigin) {
  // Origins are only matching inputs, never fields in the diagnostic output.
  if (new URL(origin).origin !== origin || new URL(authOrigin).origin !== authOrigin) throw Error('Invalid login observation origins.');
  let stage = 'navigation', overflow = false, session = null, stopped = false;
  const network = [];
  function endpoint(request) {
    const raw = request.url();
    if (typeof raw !== 'string' || raw.length > 4096) return null;
    const url = new URL(raw);
    if (url.username || url.password || url.hash) return null;
    const method = request.method();
    if (url.origin === authOrigin && url.pathname === '/auth/v1/token' && method === 'POST') return { path: '/auth/v1/token', method };
    if (url.origin === origin && url.pathname === '/api/auth/session' && method === 'GET') return { path: '/api/auth/session', method };
    return null;
  }
  function add(event) {
    if (stopped) return;
    if (network.length === MAX_EVENTS) { overflow = true; return; }
    network.push(event);
  }
  const response = value => {
    try {
      const matched = endpoint(value.request());
      if (matched) { const status = value.status(); add({ ...matched, status, outcome: loginHttpClass(status) }); }
    } catch { /* Malformed observation is not evidence and cannot abort cleanup. */ }
  };
  const failed = request => {
    try { const matched = endpoint(request); if (matched) add({ ...matched, status: null, outcome: 'network_failed' }); }
    catch { /* Never serialize arbitrary browser errors. */ }
  };
  page.on('response', response);
  page.on('requestfailed', failed);
  return {
    stage(value) { if (!LOGIN_STAGES.includes(value)) throw Error('Invalid login stage.'); stage = value; },
    session(evidence) { session = classifyLoginSession(evidence); },
    failure(error) {
      return parseLoginDiagnostic({ stage, errorClass: error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'assertion_or_operation_failed', network, overflow, session });
    },
    stop() { stopped = true; page.off('response', response); page.off('requestfailed', failed); }
  };
}
