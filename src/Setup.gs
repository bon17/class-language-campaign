/**
 * 스프레드시트 메뉴, 시트 초기 세팅, 로그인 코드 발급.
 * 담임은 스프레드시트 상단 [🚀 캠페인] 메뉴에서 실행한다.
 */

/** 시트 정의 (다른 파일의 상수를 쓰므로 함수로 늦게 만든다) */
function sheetDefs_() {
  return [
  { name: SHEETS.CONFIG, headers: ['항목', '값', '설명'], textCols: [2], widths: [170, 420, 320] },
  { name: SHEETS.STUDENTS, headers: STUDENT_HEADERS, textCols: [1, 3], widths: [60, 100, 90] },
  { name: SHEETS.LEDGER, headers: LEDGER_HEADERS, textCols: [2, 3, 12] },
  { name: SHEETS.QUEST, headers: QUEST_HEADERS, textCols: [1, 2, 7, 8, 9] },
  { name: SHEETS.PRAISE, headers: PRAISE_HEADERS, textCols: [2, 3, 4, 8], widths: [140, 90, 70, 70, 360, 70, 70, 120] },
  { name: SHEETS.SPY, headers: SPY_HEADERS, textCols: [1, 2, 3, 4] },
  { name: SHEETS.SPY_JUDGE, headers: SPY_JUDGE_HEADERS, textCols: [1, 2, 3, 4, 5, 6, 7, 8] },
  { name: SHEETS.ACCUSE, headers: ACCUSE_HEADERS, textCols: [2, 3, 5] },
  { name: SHEETS.DRAW, headers: DRAW_HEADERS, textCols: [1] },
  { name: SHEETS.TIMETABLE, headers: TIMETABLE_HEADERS, textCols: [1, 2, 3, 4, 5, 6, 7], widths: [60, 80, 80, 80, 80, 80, 80] },
  { name: SHEETS.TT_OVERRIDE, headers: TT_OVERRIDE_HEADERS, textCols: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { name: SHEETS.TEACHERS, headers: ['과목', '선생님 이름'], textCols: [1, 2], widths: [100, 140] },
  ];
}

/**
 * 시트가 없으면 만들고, 헤더가 예전 버전(앞부분만 있음)이면 새 열 이름을 이어 붙인다.
 * 웹앱 요청에서도 호출되므로 6시간에 한 번만 실제로 검사한다.
 */
function ensureSchema_(force) {
  const cache = CacheService.getScriptCache();
  if (!force && cache.get('schema_ok_v9')) return;
  const ss = ss_();
  sheetDefs_().forEach((def) => {
    let sh = ss.getSheetByName(def.name);
    let created = false;
    if (!sh) {
      sh = ss.insertSheet(def.name);
      created = true;
    }
    const n = def.headers.length;
    const first = sh.getRange(1, 1, 1, n).getValues()[0].map((v) => String(v).trim());
    const filled = first.filter((v) => v !== '').length;
    const isPrefix = first.slice(0, filled).every((v, i) => v === def.headers[i]);
    if (filled === 0 || (isPrefix && filled < n)) {
      sh.getRange(1, 1, 1, n).setValues([def.headers]);
      sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#13294b').setFontColor('#ffffff');
      sh.setFrozenRows(1);
      const rows = Math.max(sh.getMaxRows() - 1, 1);
      (def.textCols || []).forEach((c) => sh.getRange(2, c, rows, 1).setNumberFormat('@'));
    }
    if (def.name === SHEETS.TEACHERS && sh.getLastRow() < 2) {
      // 시간표에 나오는 과목을 미리 채워 둔다. 담임은 옆 칸에 선생님 이름만 적으면 된다
      const subjects = [];
      DEFAULT_TIMETABLE.forEach((r) => r.slice(2).forEach((x) => { if (x && subjects.indexOf(x) < 0) subjects.push(x); }));
      sh.getRange(2, 1, subjects.length, 2).setValues(subjects.map((x) => [x, '']));
    }
    if (def.name === SHEETS.TIMETABLE && sh.getLastRow() < 2) {
      sh.getRange(2, 1, DEFAULT_TIMETABLE.length, TIMETABLE_HEADERS.length).setValues(DEFAULT_TIMETABLE);
    }
    if (created) (def.widths || []).forEach((w, i) => sh.setColumnWidth(i + 1, w));
  });
  ensureConfigRows_(ss);
  cache.put('schema_ok_v9', '1', 21600);
}

/** 설정 시트에 새로 생긴 항목이 없으면 기본값으로 맨 아래에 추가 (담임이 고친 값은 그대로) */
function ensureConfigRows_(ss) {
  const sh = ss.getSheetByName(SHEETS.CONFIG);
  if (!sh) return;
  const last = sh.getLastRow();
  const labels = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map((r) => String(r[0]).trim()) : [];
  const add = CONFIG_DEFS.filter((d) => labels.indexOf(d.label) < 0).map((d) => {
    let v = toSheetValue_(d, d.def);
    if (d.key === 'teacherCode' && !v) v = randomCode_(4);
    if (d.key === 'adminCode' && !v) v = randomCode_(6);
    return [d.label, v, d.desc];
  });
  if (add.length) {
    sh.getRange(sh.getLastRow() + 1, 1, add.length, 3).setValues(add);
    CacheService.getScriptCache().remove(CACHE_KEYS.CONFIG);
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚀 캠페인')
    .addItem('시트 초기 세팅', 'setupSheets')
    .addItem('빈 로그인 코드 채우기', 'fillMissingLoginCodes')
    .addItem('선택한 학생 로그인 코드 재발급', 'reissueSelectedLoginCodes')
    .addSeparator()
    .addItem('웹앱 주소 보기', 'showWebAppUrls')
    .addItem('캐시 비우기 (시트를 직접 고친 뒤)', 'clearAllCaches')
    .addToUi();
}

/** 담임이 시트를 직접 고치면 캐시를 비워 웹앱에 바로 반영한다. */
function onEdit(e) {
  try {
    const name = e && e.range && e.range.getSheet().getName();
    if ([SHEETS.CONFIG, SHEETS.STUDENTS, SHEETS.LEDGER, SHEETS.QUEST, SHEETS.PRAISE, SHEETS.TIMETABLE, SHEETS.TT_OVERRIDE, SHEETS.TEACHERS, SHEETS.SPY, SHEETS.SPY_JUDGE, SHEETS.ACCUSE].indexOf(name) >= 0) clearAllCaches_();
  } catch (err) {
    // 단순 트리거에서는 조용히 무시
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.getActive();
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());

  const studentsCreated = !ss.getSheetByName(SHEETS.STUDENTS);
  ensureSchema_(true);
  sheetDefs_().forEach((def) => {
    const sh = ss.getSheetByName(def.name);
    sh.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#13294b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    const rows = Math.max(sh.getMaxRows() - 1, 1);
    (def.textCols || []).forEach((c) => sh.getRange(2, c, rows, 1).setNumberFormat('@'));
    (def.widths || []).forEach((w, i) => sh.setColumnWidth(i + 1, w));
  });

  // 기본 시트(Sheet1/시트1)가 비어 있으면 정리
  ['Sheet1', '시트1'].forEach((n) => {
    const sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });

  // 설정: 없는 항목만 기본값으로 채움 (담임이 고친 값은 건드리지 않음)
  const cfgSheet = ss.getSheetByName(SHEETS.CONFIG);
  const last = cfgSheet.getLastRow();
  const existing = last > 1 ? cfgSheet.getRange(2, 1, last - 1, 2).getValues() : [];
  const labels = existing.map((r) => String(r[0]).trim());
  const toAppend = [];
  CONFIG_DEFS.forEach((d) => {
    const i = labels.indexOf(d.label);
    let value = i >= 0 ? existing[i][1] : toSheetValue_(d, d.def);
    if (d.key === 'teacherCode' && String(value).trim() === '') value = randomCode_(4);
    if (d.key === 'adminCode' && String(value).trim() === '') value = randomCode_(6);
    if (i < 0) toAppend.push([d.label, value, d.desc]);
    else if (String(existing[i][1]).trim() === '' && value !== '') cfgSheet.getRange(i + 2, 2).setValue(value);
  });
  if (toAppend.length) cfgSheet.getRange(cfgSheet.getLastRow() + 1, 1, toAppend.length, 3).setValues(toAppend);

  if (studentsCreated) {
    ss.getSheetByName(SHEETS.STUDENTS).getRange(2, 1, 3, 3).setValues([
      ['1', '예시투투1', ''],
      ['2', '예시투투2', ''],
      ['3', '예시투투3', ''],
    ]);
  }
  const filled = fillMissingLoginCodes_();
  clearAllCaches_();

  const cfg = readConfigFromSheet_();
  alert_(
    '시트 초기 세팅 완료!\n\n' +
      `담임 코드: ${cfg.adminCode}\n교과 선생님 코드: ${cfg.teacherCode}\n` +
      `로그인 코드 새로 발급: ${filled}명\n\n` +
      '학생 시트에 반 명단(번호·이름)을 붙여 넣은 뒤 [빈 로그인 코드 채우기]를 실행하세요.'
  );
}

function fillMissingLoginCodes() {
  const n = fillMissingLoginCodes_();
  clearAllCaches_();
  alert_(`로그인 코드 ${n}개를 새로 채웠어요.`);
}

function fillMissingLoginCodes_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.STUDENTS);
  if (!sh || sh.getLastRow() < 2) return 0;
  const range = sh.getRange(2, 1, sh.getLastRow() - 1, 3);
  const values = range.getValues();
  const used = new Set(values.map((r) => String(r[2]).trim()).filter(Boolean));
  let count = 0;
  values.forEach((r) => {
    if (String(r[1]).trim() && !String(r[2]).trim()) {
      r[2] = uniqueCode_(used);
      count++;
    }
  });
  if (count) sh.getRange(2, 3, values.length, 1).setValues(values.map((r) => [r[2]]));
  return count;
}

function reissueSelectedLoginCodes() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getActiveSheet();
  if (sh.getName() !== SHEETS.STUDENTS) return alert_('학생 시트에서 재발급할 학생의 행을 선택한 뒤 실행해 주세요.');
  const sel = sh.getActiveRange();
  const top = Math.max(sel.getRow(), 2);
  const bottom = sel.getLastRow();
  if (bottom < top) return alert_('학생 행을 선택해 주세요.');
  const ui = SpreadsheetApp.getUi();
  if (ui.alert(`${top}~${bottom}행 학생의 로그인 코드를 새로 발급할까요?`, ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  const all = sh.getRange(2, 3, sh.getLastRow() - 1, 1).getValues().map((r) => String(r[0]).trim());
  const used = new Set(all.filter(Boolean));
  const range = sh.getRange(top, 1, bottom - top + 1, 3);
  const values = range.getValues();
  values.forEach((r) => {
    if (String(r[1]).trim()) r[2] = uniqueCode_(used);
  });
  sh.getRange(top, 3, values.length, 1).setValues(values.map((r) => [r[2]]));
  clearAllCaches_();
  alert_('재발급 완료! 새 코드를 해당 학생에게 알려 주세요.');
}

function showWebAppUrls() {
  const url = String(readConfigFromSheet_().webAppUrl || '').trim().replace(/\?.*$/, '');
  if (!/^https:\/\/script\.google\.com\/.*\/exec$/.test(url)) {
    return alert_(
      '설정 시트의 "웹앱 주소" 칸이 비어 있거나 올바르지 않아요.\n\n' +
      'Apps Script 편집기 → 배포 → 배포 관리 → 웹 앱 URL "복사"를 눌러\n' +
      '설정 시트 "웹앱 주소" 칸에 붙여 넣어 주세요. (…/exec 로 끝나는 주소)'
    );
  }
  alert_(`투투 화면:\n${url}\n\n교과 선생님 화면:\n${url}?page=teacher\n\n담임 대시보드:\n${url}?page=admin`);
}

function clearAllCaches() {
  clearAllCaches_();
  alert_('캐시를 비웠어요. 웹앱에 바로 반영됩니다.');
}

function clearAllCaches_() {
  CacheService.getScriptCache().removeAll([CACHE_KEYS.CONFIG, CACHE_KEYS.STUDENTS, CACHE_KEYS.TIMETABLE, 'schema_ok_v9']);
  invalidateStats_();
}

/** 첫 자리가 0이 아닌 n자리 숫자 코드 (시트에서 앞자리 0이 사라지는 문제 방지) */
function randomCode_(n) {
  const min = Math.pow(10, n - 1);
  return String(min + Math.floor(Math.random() * (9 * min)));
}

function uniqueCode_(used) {
  for (let i = 0; i < 1000; i++) {
    const c = randomCode_(4);
    if (!used.has(c)) {
      used.add(c);
      return c;
    }
  }
  throw new Error('코드를 만들 수 없어요.');
}

function alert_(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    Logger.log(msg);
  }
}
