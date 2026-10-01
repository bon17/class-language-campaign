/**
 * 담임 대시보드 서버 함수. 로그인 외 모든 함수는 담임 토큰을 검증한다.
 * 변경 함수는 갱신된 대시보드 데이터를 그대로 돌려준다.
 */

function adminLogin(code) {
  return { token: loginAdmin_(code) };
}

function adminGetDashboard(token) {
  requireAdmin_(token);
  return buildAdminDashboard_();
}

/** 캐시를 비우고 시트에서 다시 읽기 (시트를 직접 고친 뒤) */
function adminRefresh(token) {
  requireAdmin_(token);
  clearAllCaches_();
  return buildAdminDashboard_();
}

/**
 * 수동 도장 추가/차감. payload: {studentNos: string[], score: number, date: 'yyyy-MM-dd', reason: string}
 */
function adminAddManual(token, payload) {
  requireAdmin_(token);
  const p = payload || {};
  const score = Number(p.score);
  const reason = String(p.reason || '').trim();
  const date = toDateStr_(p.date || todayStr_());
  if (!Number.isInteger(score) || score === 0) throw new Error('점수는 0이 아닌 정수로 입력해 주세요.');
  if (Math.abs(score) > 50) throw new Error('한 번에 ±50점까지만 입력할 수 있어요.');
  if (!reason) throw new Error('사유를 꼭 입력해 주세요.');
  if (reason.length > 200) throw new Error('사유는 200자 이내로 입력해 주세요.');
  if (!date) throw new Error('날짜 형식이 올바르지 않아요.');

  const valid = new Set(readStudents_().map((s) => s.no));
  const nos = Array.from(new Set((p.studentNos || []).map(String)));
  if (!nos.length) throw new Error('학생을 한 명 이상 선택해 주세요.');
  const bad = nos.filter((n) => !valid.has(n));
  if (bad.length) throw new Error('없는 학생 번호: ' + bad.join(', '));

  appendRecords_(nos.map((no) => ({
    date, no, mission: '수동', score, inputType: '담임', inputBy: '담임', memo: reason,
  })));
  return buildAdminDashboard_();
}

/** 반 전체 단체 도장 +3. payload: {date, memo} */
function adminGroupStamp(token, payload) {
  requireAdmin_(token);
  const p = payload || {};
  const date = toDateStr_(p.date || todayStr_());
  const memo = String(p.memo || '').trim() || '단체 도장';
  if (!date) throw new Error('날짜 형식이 올바르지 않아요.');
  if (memo.length > 200) throw new Error('메모는 200자 이내로 입력해 주세요.');
  const students = readStudents_();
  if (!students.length) throw new Error('학생 명단이 비어 있어요.');
  appendRecords_(students.map((s) => ({ date, no: s.no, mission: '단체', score: 3, inputType: '담임', inputBy: '담임', memo })));
  return buildAdminDashboard_();
}

function adminCancelRecord(token, id, reason) {
  requireAdmin_(token);
  const r = String(reason || '').trim();
  if (!r) throw new Error('취소 사유를 꼭 입력해 주세요.');
  if (r.length > 200) throw new Error('사유는 200자 이내로 입력해 주세요.');
  cancelRecord_(String(id), r, '담임');
  return buildAdminDashboard_();
}

function adminSetTestMode(token, on) {
  requireAdmin_(token);
  setConfigValue_('testMode', !!on);
  clearAllCaches_();
  return buildAdminDashboard_();
}

/**
 * 테스트 기록 전부 지우기: 기록장·일퀘·칭찬·암행어사·암행어사판정·지목·뽑기 시트의 2행부터 아래.
 * 학생 명단·설정·시간표·교과선생님은 그대로. 확인 문구를 정확히 입력해야 실행된다.
 */
function adminClearTestData(token, confirmText) {
  requireAdmin_(token);
  if (String(confirmText || '').trim() !== '테스트 기록 삭제') throw new Error('확인 문구가 맞지 않아요.');
  withLock_(() => {
    [SHEETS.LEDGER, SHEETS.QUEST, SHEETS.PRAISE, SHEETS.SPY, SHEETS.SPY_JUDGE, SHEETS.ACCUSE, SHEETS.DRAW].forEach((name) => {
      const sh = ss_().getSheetByName(name);
      if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    });
    clearAllCaches_();
  });
  return buildAdminDashboard_();
}

function adminSetRankLock(token, locked) {
  requireAdmin_(token);
  setConfigValue_('rankLocked', !!locked);
  return buildAdminDashboard_();
}

/** 칭찬 숨김/해제 (숨기면 받은 칭찬함에서 사라짐. 일퀘 인정 여부는 기록장에서 따로 처리) */
function adminSetPraiseHidden(token, id, hidden) {
  requireAdmin_(token);
  withLock_(() => {
    const p = readPraise_().find((x) => x.id === String(id));
    if (!p) throw new Error('칭찬을 찾을 수 없어요.');
    if (p.hidden === !!hidden) return;
    sheet_(SHEETS.PRAISE).getRange(p.row, 6).setValue(!!hidden);
    syncPraiseQuest_(p, !!hidden);
    invalidateStats_();
  });
  return buildAdminDashboard_();
}

function buildAdminDashboard_() {
  const cfg = getConfig();
  const { students, records, stats } = buildDataBundle_();

  const nameOf = {};
  students.forEach((s) => (nameOf[s.no] = s.name));
  const today = todayStr_();

  // 담임이 확인할 데이터 문제
  const warnings = [];
  const seen = {};
  students.forEach((s) => {
    if (seen[s.no]) warnings.push(`학생 번호 ${s.no}이(가) 중복돼요.`);
    seen[s.no] = true;
    if (!s.code) warnings.push(`${s.no}번 ${s.name}의 로그인 코드가 비어 있어요.`);
  });
  const unknown = Array.from(new Set(records.filter((r) => r.no && !nameOf[r.no]).map((r) => r.no)));
  if (unknown.length) warnings.push(`기록장에 학생 시트에 없는 번호가 있어요: ${unknown.join(', ')}`);
  if (!cfg.adminCode) warnings.push('담임 코드가 비어 있어요.');

  const ledger = records.slice(-500).reverse().map((r) => ({
    id: r.id, ts: r.ts, date: r.date, no: r.no, name: nameOf[r.no] || '(알 수 없음)',
    mission: r.mission, score: r.score, inputType: r.inputType, inputBy: r.inputBy,
    period: r.period, subject: r.subject, memo: r.memo, cancelled: r.cancelled, cancelReason: r.cancelReason,
  }));

  // 칭찬 전체 + 한 번도 못 받은 투투
  const praises = readPraise_().reverse().map((p) => ({
    id: p.id, ts: p.ts, date: p.date, from: p.from, fromName: nameOf[p.from] || p.from,
    to: p.to, toName: nameOf[p.to] || p.to, text: p.text, hidden: p.hidden, thanked: p.thanked,
  }));
  const received = new Set(praises.filter((p) => !p.hidden).map((p) => p.to));
  const noPraise = students.filter((s) => !received.has(s.no)).map((s) => ({ no: s.no, name: s.name }));

  // 날짜 × 투투 일퀘 달성표: O(도장 지급) / 진행 중인 항목 수
  const questO = {};
  records.forEach((r) => { if (!r.cancelled && r.mission === '일퀘' && r.score > 0) questO[r.no + '|' + r.date] = true; });
  const questRows = {};
  readQuestRows_().forEach((q) => (questRows[q.no + '|' + q.date] = q));
  const questGrid = students.map((s) => ({
    no: s.no, name: s.name,
    cells: cfg.schoolDays.map((d) => {
      const k = s.no + '|' + d;
      if (questO[k]) return { mark: 'O' };
      const q = questRows[k];
      if (!q) return { mark: '' };
      const n = [q.praiseDone, q.greet.length >= 2, dozeStatus_(q, d).done].filter(Boolean).length;
      return { mark: n + '/3', detail: `칭찬${q.praiseDone ? '✓' : '✗'} 인사 ${q.greet.join(', ') || '-'} 졸음${Object.values(q.doze).filter((v) => v === 'X').length}` };
    }),
  }));

  return {
    spy: spyAdminData_(students),
    reward: rewardAdminData_(students, records, stats),
    praises,
    noPraise,
    questGrid,
    today,
    dayIndex: schoolDayIndex_(cfg, today),
    cfg: {
      campaignName: cfg.campaignName, nickname: cfg.nickname,
      startDate: cfg.startDate, endDate: cfg.endDate, schoolDays: cfg.schoolDays,
      midRankDate: cfg.midRankDate, rankPublicCount: cfg.rankPublicCount, rankLocked: cfg.rankLocked,
      drawStampThreshold: cfg.drawStampThreshold, praiseMinLength: cfg.praiseMinLength,
      accuseResultPublic: cfg.accuseResultPublic, periodCount: cfg.periodCount,
      teacherCode: cfg.teacherCode, testMode: cfg.testMode, rewards: cfg.rewards, bannedWordCount: cfg.bannedWords.length,
    },
    missions: MISSIONS,
    students: stats.list,
    ledger,
    ledgerTotal: records.length,
    warnings,
    spreadsheetUrl: ss_().getUrl(),
    computedAt: stats.computedAt,
  };
}
