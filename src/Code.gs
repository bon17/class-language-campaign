/**
 * 웹앱 진입점.
 *   (기본)          투투 화면
 *   ?page=teacher   교과 선생님 화면 (교실 태블릿)
 *   ?page=admin     담임 대시보드
 */
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || '';
  const cfg = getConfig();
  const files = { '': 'Student', admin: 'Admin', teacher: 'Teacher' };
  const file = files[page] || 'ComingSoon';

  const t = HtmlService.createTemplate(htmlSource_(file));
  t.campaignName = cfg.campaignName;
  t.titleHtml = titleHtml_(cfg.campaignName);
  t.subtitle = cfg.subtitle;
  t.nickname = cfg.nickname;
  return t.evaluate()
    .setTitle(cfg.campaignName)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** 제목을 쉼표 뒤에서 줄바꿈: '바른 언어 사용하고,' / '보상 얻자!!' */
function titleHtml_(title) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const m = String(title).match(/^(.*?,)\s*(.+)$/);
  if (!m) return `<span class="line">${esc(title)}</span>`;
  return `<span class="line">${esc(m[1])}</span><span class="line">${esc(m[2])}</span>`;
}

/** HTML 템플릿에서 공통 조각 포함: <?!= include('Styles') ?> */
function include(name) {
  return htmlSource_(name);
}

/**
 * HTML 원본. 한 파일 묶음(dist/Code.gs)에서는 HTML_SOURCES에 들어 있고,
 * src/ 여러 파일로 올린 경우에는 같은 이름의 HTML 파일에서 읽는다.
 */
function htmlSource_(name) {
  if (typeof HTML_SOURCES !== 'undefined' && HTML_SOURCES[name]) return HTML_SOURCES[name];
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
