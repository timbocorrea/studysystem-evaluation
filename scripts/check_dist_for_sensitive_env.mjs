import fs from 'fs';
import path from 'path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

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

const envFiles = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local'
];

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const result = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    result[key] = value;
  }

  return result;
}

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(entryPath);
    if (/\.(js|css|html|json|txt|svg)$/i.test(entry.name)) return [entryPath];
    return [];
  });
}

const envValues = {
  ...process.env
};

for (const envFile of envFiles) {
  Object.assign(envValues, readEnvFile(path.join(root, envFile)));
}

const sensitiveEnvEntries = Object.entries(envValues)
  .filter(([key, value]) => key.startsWith('VITE_') && value && value.length >= 8)
  .filter(([key]) => !PUBLIC_VITE_ENV_ALLOWLIST.has(key))
  .filter(([key]) => EXPLICITLY_BLOCKED_ENV.has(key) || SENSITIVE_ENV_NAME.test(key));

if (!fs.existsSync(distDir)) {
  console.error('Diretorio dist nao encontrado. Execute o build antes da verificacao pos-build.');
  process.exit(1);
}

const distFiles = collectFiles(distDir);
const findings = [];

for (const [key, value] of sensitiveEnvEntries) {
  for (const file of distFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes(value)) {
      findings.push({ key, file: path.relative(root, file) });
    }
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(`[DIST SECRETS WARNING] Valor de ${finding.key} encontrado em ${finding.file}`);
  }
  console.error(`\nFalha na verificacao pos-build: ${findings.length} ocorrencia(s) sensivel(is) no dist.`);
  process.exit(1);
}

console.log('Verificacao pos-build: nenhum valor VITE_* sensivel encontrado no dist.');
