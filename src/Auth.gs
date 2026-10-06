/**
 * 코드 로그인 → 서버가 발급한 토큰으로 이후 요청을 검증한다.
 * - 담임: CacheService에 6시간 보관하는 무작위 토큰
 * - 투투: 서버 비밀키로 서명한 토큰. 캠페인 종료 2주 뒤까지 유지되고,
 *         담임이 로그인 코드를 재발급하면 그 투투의 기존 토큰은 바로 무효가 된다.
 */

const TOKEN_TTL_SEC = 21600;
const LOGIN_FAIL_LIMIT = 10; // 10분에 10회 실패하면 잠시 차단
const LOGIN_FAIL_WINDOW_SEC = 600;

function issueToken_(session) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  cache_().put('tok_' + token, JSON.stringify(session), TOKEN_TTL_SEC);
  return token;
}

function readToken_(token) {
  if (!token || typeof token !== 'string' || token.length > 64) return null;
  const v = cache_().get('tok_' + token);
  return v ? JSON.parse(v) : null;
}

function logout(token) {
  if (token && typeof token === 'string') cache_().remove('tok_' + token);
  return true;
}

function requireAdmin_(token) {
  const s = readToken_(token);
  if (!s || s.role !== 'admin') throw new Error('AUTH: 다시 로그인해 주세요.');
  return s;
}

function checkLoginRate_(bucket, limit) {
  const n = Number(cache_().get('fail_' + bucket) || 0);
  if (n >= (limit || LOGIN_FAIL_LIMIT)) throw new Error('로그인 실패가 너무 많아요. 10분 뒤 다시 시도해 주세요.');
}

function recordLoginFail_(bucket) {
  const cache = cache_();
  const n = Number(cache.get('fail_' + bucket) || 0) + 1;
  cache.put('fail_' + bucket, String(n), LOGIN_FAIL_WINDOW_SEC);
  Utilities.sleep(700);
}

/** 입력한 코드에서 공백을 뺀다 (휴대폰 키보드가 넣는 띄어쓰기 등) */
function normalizeCode_(code) {
  return String(code === null || code === undefined ? '' : code).replace(/\s+/g, '');
}

function loginAdmin_(code) {
  checkLoginRate_('admin');
  const input = normalizeCode_(code);
  let cfg = getConfig();
  // 담임이 설정 시트에서 코드를 막 바꿨다면 캐시가 옛 코드일 수 있어 시트를 다시 읽는다
  if (input !== cfg.adminCode) cfg = refreshConfig_();
  if (!cfg.adminCode) throw new Error('담임 코드가 설정되지 않았어요. 설정 시트를 확인해 주세요.');
  if (input !== cfg.adminCode) {
    recordLoginFail_('admin');
    throw new Error('담임 코드가 올바르지 않아요.');
  }
  return issueToken_({ role: 'admin' });
}

// ---------- 투투 (서명 토큰) ----------

const STUDENT_FAIL_LIMIT = 5; // 번호별 10분에 5회

function tokenSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('TOKEN_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('TOKEN_SECRET', secret);
  }
  return secret;
}

function hmac_(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, tokenSecret_())).replace(/=+$/, '');
}

/** 로그인 코드 지문 (코드 재발급 시 토큰 무효화용) */
function codeFingerprint_(code) {
  return hmac_('code:' + code).slice(0, 10);
}

function signToken_(payload) {
  const body = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/, '');
  return body + '.' + hmac_(body);
}

function verifySignedToken_(token) {
  if (!token || typeof token !== 'string' || token.length > 400) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || hmac_(parts[0]) !== parts[1]) return null;
  try {
    const json = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString();
    const p = JSON.parse(json);
    if (!p.exp || Date.now() > p.exp) return null;
    return p;
  } catch (e) {
    return null;
  }
}

function loginStudent_(no, code) {
  const n = String(no || '').trim();
  const c = String(code || '').trim();
  if (!n || !c) throw new Error('번호와 코드를 모두 입력해 주세요.');
  if (!/^\d{1,3}$/.test(n)) throw new Error('번호는 숫자로 입력해 주세요.');
  checkLoginRate_('stu_' + n, STUDENT_FAIL_LIMIT);
  const s = getStudentsCached_().find((x) => x.no === n || Number(x.no) === Number(n));
  if (!s || !s.code || s.code !== c) {
    recordLoginFail_('stu_' + n);
    throw new Error('번호 또는 코드가 맞지 않아요.');
  }
  const cfg = getConfig();
  const end = cfg.endDate ? new Date(cfg.endDate + 'T23:59:59+09:00').getTime() : Date.now();
  const exp = Math.max(end, Date.now()) + 14 * 86400000;
  return signToken_({ r: 's', no: s.no, f: codeFingerprint_(s.code), exp });
}

/** 투투 토큰 검증 → 학생 정보 (로그인 코드 제외) */
function requireStudent_(token) {
  const p = verifySignedToken_(token);
  if (!p || p.r !== 's') throw new Error('AUTH: 다시 로그인해 주세요.');
  const s = getStudentsCached_().find((x) => x.no === p.no);
  if (!s || !s.code || codeFingerprint_(s.code) !== p.f) throw new Error('AUTH: 로그인 코드가 바뀌었어요. 새 코드로 다시 로그인해 주세요.');
  return { no: s.no, name: s.name };
}

// ---------- 교과 선생님 태블릿 (서명 토큰) ----------

/** 공통 코드로 태블릿 잠금 해제. 설정의 코드가 바뀌면 기존 태블릿은 다시 잠긴다. */
function loginTeacherDevice_(code) {
  checkLoginRate_('teacher');
  const input = normalizeCode_(code);
  let cfg = getConfig();
  if (input !== cfg.teacherCode) cfg = refreshConfig_();
  if (!cfg.teacherCode) throw new Error('교과 선생님 코드가 설정되지 않았어요. 담임 선생님께 알려 주세요.');
  if (input !== cfg.teacherCode) {
    recordLoginFail_('teacher');
    throw new Error('코드가 맞지 않아요.');
  }
  const end = cfg.endDate ? new Date(cfg.endDate + 'T23:59:59+09:00').getTime() : Date.now();
  return signToken_({ r: 't', f: codeFingerprint_(cfg.teacherCode), exp: Math.max(end, Date.now()) + 14 * 86400000 });
}

function requireTeacher_(token) {
  const p = verifySignedToken_(token);
  const cfg = getConfig();
  if (!p || p.r !== 't' || !cfg.teacherCode || p.f !== codeFingerprint_(cfg.teacherCode)) {
    throw new Error('AUTH: 태블릿 잠금이 풀려 있지 않아요. 공통 코드를 입력해 주세요.');
  }
  return true;
}
