/**
 * 스프레드시트 메뉴, 시트 초기 세팅, 로그인 코드 발급.
 * 담임은 스프레드시트 상단 [🚀 캠페인] 메뉴에서 실행한다.
 */

const SHEET_DEFS = [
  { name: SHEETS.CONFIG, headers: ['항목', '값', '설명'], textCols: [2], widths: [170, 420, 320] },
  { name: SHEETS.STUDENTS, headers: STUDENT_HEADERS, textCols: [1, 3], widths: [60, 100, 90] },
  { name: SHEETS.LEDGER, headers: LEDGER_HEADERS, textCols: [2, 3, 12] },
  { name: SHEETS.QUEST, headers: ['날짜', '학생번호', '칭찬완료', '인사완료', '졸지않기완료', '도장지급여부'], textCols: [1, 2] },
  { name: SHEETS.PRAISE, headers: ['타임스탬프', '날짜', '보낸번호', '받은번호', '내용', '숨김여부', '고마워여부'], textCols: [2, 3, 4] },
  { name: SHEETS.SPY, headers: ['주차', '학생번호', '시작일', '종료일', '상태'], textCols: [2, 3, 4] },
  { name: SHEETS.SPY_JUDGE, headers: ['날짜', '암행어사번호', '바른1위', '바른2위', '바른3위', '나쁜1위', '나쁜2위', '나쁜3위'], textCols: [1, 2, 3, 4, 5, 6, 7, 8] },
  { name: SHEETS.ACCUSE, headers: ['타임스탬프', '지목한번호', '지목된번호', '결과'], textCols: [2, 3] },
  { name: SHEETS.DRAW, headers: ['학생번호', '일퀘올클여부', '도장12개여부', '뽑기횟수', '뽑기완료횟수'], textCols: [1] },
];

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
    if ([SHEETS.CONFIG, SHEETS.STUDENTS, SHEETS.LEDGER].indexOf(name) >= 0) clearAllCaches_();
  } catch (err) {
    // 단순 트리거에서는 조용히 무시
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.getActive();
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());

  let studentsCreated = false;
  SHEET_DEFS.forEach((def) => {
    let sh = ss.getSheetByName(def.name);
    if (!sh) {
      sh = ss.insertSheet(def.name);
      if (def.name === SHEETS.STUDENTS) studentsCreated = true;
    }
    const first = sh.getRange(1, 1, 1, def.headers.length).getValues()[0];
    if (first.every((v) => v === '')) sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
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
  const url = ScriptApp.getService().getUrl();
  if (!url) return alert_('아직 웹앱으로 배포되지 않았어요. README의 배포 방법을 참고해 주세요.');
  alert_(`투투 화면:\n${url}\n\n교과 선생님 화면:\n${url}?page=teacher\n\n담임 대시보드:\n${url}?page=admin`);
}

function clearAllCaches() {
  clearAllCaches_();
  alert_('캐시를 비웠어요. 웹앱에 바로 반영됩니다.');
}

function clearAllCaches_() {
  CacheService.getScriptCache().removeAll([CACHE_KEYS.CONFIG, CACHE_KEYS.STUDENTS]);
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
