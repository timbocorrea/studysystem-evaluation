import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';

const srcPath = path.resolve(process.cwd(), '.');

const SOURCE_GLOBS = [
  'src/**/*.{ts,tsx,js,jsx}',
  'components/**/*.{ts,tsx,js,jsx}',
  'contexts/**/*.{ts,tsx,js,jsx}',
  'domain/**/*.{ts,tsx,js,jsx}',
  'hooks/**/*.{ts,tsx,js,jsx}',
  'repositories/**/*.{ts,tsx,js,jsx}',
  'services/**/*.{ts,tsx,js,jsx}',
  'stores/**/*.{ts,tsx,js,jsx}',
  'utils/**/*.{ts,tsx,js,jsx}',
  'vite.config.ts'
];

const PUBLIC_VITE_ENV_ALLOWLIST = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_DROPBOX_APP_KEY'
]);

const SENSITIVE_ENV_NAME = /(?:API_?KEY|SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_?ROLE|AUTHORIZATION|BEARER)/i;
const EXPLICITLY_BLOCKED_ENV = new Set([
  'VITE_API_KEY',
  'VITE_GEMINI_API_KEY'
]);

const files = SOURCE_GLOBS.flatMap(pattern => globSync(pattern, {
  cwd: srcPath,
  nodir: true,
  ignore: ['node_modules/**', 'dist/**', 'build/**', '.agent/**', '.gemini/**']
}));

const uniqueFiles = [...new Set(files)].sort();
let errors = 0;

function report(message) {
  console.error(message);
  errors++;
}

function scanDangerousHtml(file, content) {
  if (!content.includes('dangerouslySetInnerHTML')) return;

  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('dangerouslySetInnerHTML') && !line.includes('sanitizeHtml(')) {
      report(`[XSS WARNING] dangerouslySetInnerHTML sem sanitizeHtml em: ${file}:${index + 1}`);
    }
  });
}

function scanSensitiveViteEnv(file, content) {
  const envMatches = content.matchAll(/(?:import\.meta\.env|process\.env|window\.env)\.([A-Z0-9_]+)/g);

  for (const match of envMatches) {
    const envName = match[1];
    if (!envName.startsWith('VITE_')) continue;
    if (PUBLIC_VITE_ENV_ALLOWLIST.has(envName)) continue;

    if (EXPLICITLY_BLOCKED_ENV.has(envName) || SENSITIVE_ENV_NAME.test(envName)) {
      report(`[SECRETS WARNING] Uso de ${envName} em codigo client-side: ${file}`);
    }
  }

  const bracketMatches = content.matchAll(/(?:import\.meta\.env|process\.env|window\.env)\[['"]([A-Z0-9_]+)['"]\]/g);

  for (const match of bracketMatches) {
    const envName = match[1];
    if (!envName.startsWith('VITE_')) continue;
    if (PUBLIC_VITE_ENV_ALLOWLIST.has(envName)) continue;

    if (EXPLICITLY_BLOCKED_ENV.has(envName) || SENSITIVE_ENV_NAME.test(envName)) {
      report(`[SECRETS WARNING] Uso de ${envName} em codigo client-side: ${file}`);
    }
  }
}

function scanHardcodedSensitivePatterns(file, content) {
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (/AIza[0-9A-Za-z_-]{20,}/.test(line)) {
      report(`[SECRETS WARNING] Padrao de Google API key em: ${file}:${index + 1}`);
    }
    if (/\bsk-[0-9A-Za-z_-]{20,}/.test(line) || /\bgsk_[0-9A-Za-z_-]{20,}/.test(line)) {
      report(`[SECRETS WARNING] Padrao de API key em: ${file}:${index + 1}`);
    }
    if (/service[_-]?role/i.test(line) && /VITE_/i.test(line)) {
      report(`[SECRETS WARNING] Possivel service role publico em: ${file}:${index + 1}`);
    }
  });
}

for (const file of uniqueFiles) {
  const fullPath = path.join(srcPath, file);
  const content = fs.readFileSync(fullPath, 'utf8');

  scanDangerousHtml(file, content);
  scanSensitiveViteEnv(file, content);
  scanHardcodedSensitivePatterns(file, content);
}

if (errors > 0) {
  console.error(`\nFalha no scan estatico de seguranca: ${errors} potencial(is) problema(s).`);
  process.exit(1);
}

console.log('\nScan estatico de seguranca: nenhum uso sensivel de VITE_* ou padrao de chave hardcoded encontrado.');
