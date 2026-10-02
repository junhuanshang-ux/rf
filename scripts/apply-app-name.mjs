// 把 src-tauri/app.config.json 里的应用名写入 Android 工程的 strings.xml。
//
// tauri 生成的 Android 应用名取自 productName（必须是 ASCII），
// 这里用真实名称覆盖，因此支持中文名。本地构建与云端 CI 都调用这个脚本。
//
// 用法: node scripts/apply-app-name.mjs

import { readFile, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = resolve(ROOT, 'src-tauri', 'app.config.json');
const STRINGS = resolve(
  ROOT,
  'src-tauri', 'gen', 'android',
  'app', 'src', 'main', 'res', 'values', 'strings.xml',
);

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(STRINGS))) {
  console.log('未找到 strings.xml，跳过（请先执行 pnpm tauri android init）');
  process.exit(0);
}

const { name } = JSON.parse(await readFile(CONFIG, 'utf8'));

// Android 字符串资源里的 XML 特殊字符需要转义；双引号会破坏字符串字面量，直接去掉
const safe = String(name ?? '')
  .replace(/"/g, '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const xml = await readFile(STRINGS, 'utf8');
const patched = xml.replace(
  /(<string name="(?:app_name|main_activity_title)">)[\s\S]*?(<\/string>)/g,
  `$1"${safe}"$2`,
);

if (patched === xml) {
  console.log(`应用名已是 "${safe}"，无需修改`);
  process.exit(0);
}

await writeFile(STRINGS, patched, 'utf8');
console.log(`Android 应用名已设置为 "${safe}"`);
