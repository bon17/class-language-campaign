#!/usr/bin/env node
/**
 * src/ 의 .gs·.html 파일을 Apps Script에 한 번에 붙여 넣을 수 있는
 * 단일 파일 dist/Code.gs 로 묶는다.   사용법: node tools/bundle.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const out = path.join(root, 'dist', 'Code.gs');

// 의존 순서가 필요하지는 않지만 읽기 쉽게 고정 순서로 묶는다
const GS_ORDER = ['Config', 'Ledger', 'Timetable', 'QuestApi', 'SpyApi', 'DrawApi', 'Auth', 'Setup', 'StudentApi', 'TeacherApi', 'AdminApi', 'Code'];
const gsFiles = fs.readdirSync(src).filter((f) => f.endsWith('.gs')).map((f) => f.slice(0, -3));
const ordered = GS_ORDER.filter((n) => gsFiles.includes(n)).concat(gsFiles.filter((n) => !GS_ORDER.includes(n)).sort());
const htmlFiles = fs.readdirSync(src).filter((f) => f.endsWith('.html')).sort();

const parts = [
  '/**',
  ' * 바른 언어 캠페인 웹앱 — 한 파일 묶음 (자동 생성 파일, 직접 고치지 마세요)',
  ' * 원본: src/ 폴더 / 생성: node tools/bundle.js',
  ' * 사용법: Apps Script 편집기의 Code.gs 내용을 모두 지우고 이 파일 전체를 붙여 넣기',
  ' */',
  '',
];
ordered.forEach((n) => {
  parts.push(`// ===================== ${n}.gs =====================`);
  parts.push(fs.readFileSync(path.join(src, n + '.gs'), 'utf8').trimEnd());
  parts.push('');
});
parts.push('// ===================== HTML 화면 =====================');
parts.push('const HTML_SOURCES = {');
htmlFiles.forEach((f) => {
  // 긴 한 줄이 복사·붙여넣기에서 잘리지 않도록 여러 줄 템플릿 문자열로 넣는다
  const html = fs.readFileSync(path.join(src, f), 'utf8').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  parts.push(`  ${JSON.stringify(f.slice(0, -5))}: \`${html}\`,`);
});
parts.push('};');
// 코드 버전(내용 해시): 캐시 키를 버전별로 나누는 데 쓴다
const build = require('crypto').createHash('sha1').update(parts.join('\n')).digest('hex').slice(0, 8);
parts.push(`const BUNDLE_BUILD = '${build}';`);
parts.push('');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, parts.join('\n'));
const lines = fs.readFileSync(out, 'utf8').split('\n');
console.log(`dist/Code.gs 생성: .gs ${ordered.length}개 + .html ${htmlFiles.length}개, ${lines.length}줄, 가장 긴 줄 ${Math.max(...lines.map((l) => l.length))}자`);
