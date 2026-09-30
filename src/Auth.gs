/**
 * 코드 로그인 → 서버가 발급한 토큰으로 이후 요청을 검증한다.
 * 토큰은 CacheService에 6시간 보관 (만료·축출되면 다시 로그인).
 */

const TOKEN_TTL_SEC = 21600;
const LOGIN_FAIL_LIMIT = 10; // 10분에 10회 실패하면 잠시 차단
const LOGIN_FAIL_WINDOW_SEC = 600;

function issueToken_(session) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  CacheService.getScriptCache().put('tok_' + token, JSON.stringify(session), TOKEN_TTL_SEC);
  return token;
}

function readToken_(token) {
  if (!token || typeof token !== 'string' || token.length > 64) return null;
  const v = CacheService.getScriptCache().get('tok_' + token);
  return v ? JSON.parse(v) : null;
}

function logout(token) {
  if (token && typeof token === 'string') CacheService.getScriptCache().remove('tok_' + token);
  return true;
}

function requireAdmin_(token) {
  const s = readToken_(token);
  if (!s || s.role !== 'admin') throw new Error('AUTH: 다시 로그인해 주세요.');
  return s;
}

function checkLoginRate_(bucket) {
  const n = Number(CacheService.getScriptCache().get('fail_' + bucket) || 0);
  if (n >= LOGIN_FAIL_LIMIT) throw new Error('로그인 실패가 너무 많아요. 10분 뒤 다시 시도해 주세요.');
}

function recordLoginFail_(bucket) {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('fail_' + bucket) || 0) + 1;
  cache.put('fail_' + bucket, String(n), LOGIN_FAIL_WINDOW_SEC);
  Utilities.sleep(700);
}

function loginAdmin_(code) {
  checkLoginRate_('admin');
  const cfg = getConfig();
  if (!cfg.adminCode) throw new Error('담임 코드가 설정되지 않았어요. 설정 시트를 확인해 주세요.');
  if (String(code || '').trim() !== cfg.adminCode) {
    recordLoginFail_('admin');
    throw new Error('담임 코드가 올바르지 않아요.');
  }
  return issueToken_({ role: 'admin' });
}
