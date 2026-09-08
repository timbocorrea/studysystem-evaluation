import React, { useMemo, useState } from 'react';
import {
  getStudentGoogleAiApiKey,
  hasStudentGoogleAiApiKey,
  maskStudentGoogleAiApiKey,
  removeStudentGoogleAiApiKey,
  setStudentGoogleAiApiKey,
  STUDENT_GOOGLE_AI_MODEL_CANDIDATES
} from '@/utils/studentGoogleAiApiKey';

const GOOGLE_AI_STUDIO_API_KEY_URL = 'https://aistudio.google.com/apikey';
const STUDENT_AI_TEST_PROMPT = 'Responda apenas: OK';
const TEST_MODEL_FAILURE_MESSAGE = 'A chave foi reconhecida, mas nenhum modelo compativel foi liberado para este projeto. Verifique a chave no Google AI Studio ou tente gerar uma nova.';
const TEST_AUTH_FAILURE_MESSAGE = 'Chave invalida ou sem permissao.';
const TEST_QUOTA_FAILURE_MESSAGE = 'Limite gratuito atingido. Tente novamente mais tarde.';
const TEST_FAILURE_MESSAGE = 'Não foi possível validar a chave. Confira se ela está correta e ativa no Google AI Studio.';
const TEST_UNAVAILABLE_MESSAGE = 'Serviço Google temporariamente indisponível ou com alta demanda. Tente novamente em alguns minutos.';

type TestStatus = 'idle' | 'testing' | 'passed' | 'failed' | 'unavailable';
type StudentGoogleAiTestFailureReason = 'auth' | 'quota' | 'model' | 'unavailable' | 'unknown';
type StudentGoogleAiTestResult =
  | { status: 'approved'; model: string }
  | { status: 'failed'; reason: StudentGoogleAiTestFailureReason };

type StudentGoogleAiTestResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    code?: number;
    status?: string;
  };
};

async function readStudentGoogleAiTestResponse(response: Response): Promise<StudentGoogleAiTestResponse | null> {
  try {
    return await response.json() as StudentGoogleAiTestResponse;
  } catch {
    return null;
  }
}

function isStudentGoogleAiUnavailable(response: Response, data: StudentGoogleAiTestResponse | null): boolean {
  return response.status === 503 || data?.error?.code === 503 || data?.error?.status === 'UNAVAILABLE';
}

function getStudentGoogleAiTestEndpoint(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function getStudentGoogleAiModelLabel(model: string): string {
  if (model === 'gemini-2.5-flash-lite') return 'Gemini 2.5 Flash-Lite';
  if (model === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
  if (model === 'gemini-3.5-flash') return 'Gemini 3.5 Flash';
  return model;
}

async function testStudentGoogleAiApiKey(apiKey: string): Promise<StudentGoogleAiTestResult> {
  let sawModelFailure = false;
  let sawUnavailable = false;

  for (const model of STUDENT_GOOGLE_AI_MODEL_CANDIDATES) {
    const response = await fetch(getStudentGoogleAiTestEndpoint(model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: STUDENT_AI_TEST_PROMPT }]
          }
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 8
        }
      })
    });

    const data = await readStudentGoogleAiTestResponse(response);

    if (response.status === 401 || response.status === 403 || data?.error?.code === 401 || data?.error?.code === 403) {
      return { status: 'failed', reason: 'auth' };
    }

    if (response.status === 429 || data?.error?.code === 429) {
      return { status: 'failed', reason: 'quota' };
    }

    if (isStudentGoogleAiUnavailable(response, data)) {
      sawUnavailable = true;
      continue;
    }

    if (response.status === 400 || response.status === 404 || data?.error?.code === 400 || data?.error?.code === 404) {
      sawModelFailure = true;
      continue;
    }

    if (!response.ok || !data) {
      continue;
    }

    const hasCandidateParts = Boolean(data.candidates?.some((candidate) => (
      candidate.content?.parts && candidate.content.parts.length > 0
    )));
    const hasNonBlockingPromptFeedback = Boolean(data.promptFeedback && !data.promptFeedback.blockReason);

    if (hasCandidateParts || hasNonBlockingPromptFeedback || response.ok) {
      return { status: 'approved', model };
    }
  }

  if (sawUnavailable) return { status: 'failed', reason: 'unavailable' };
  if (sawModelFailure) return { status: 'failed', reason: 'model' };

  return { status: 'failed', reason: 'unknown' };
}

const StudentGoogleAiKeySettings: React.FC = () => {
  const [savedApiKey, setSavedApiKey] = useState<string | null>(() => (
    hasStudentGoogleAiApiKey() ? getStudentGoogleAiApiKey() : null
  ));
  const [apiKey, setApiKey] = useState(savedApiKey || '');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [message, setMessage] = useState('');

  const trimmedApiKey = apiKey.trim();
  const hasSavedApiKey = Boolean(savedApiKey);
  const maskedSavedApiKey = useMemo(() => (
    savedApiKey ? maskStudentGoogleAiApiKey(savedApiKey) : ''
  ), [savedApiKey]);

  const status = useMemo(() => {
    if (testStatus === 'passed') return { label: 'Teste aprovado', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
    if (testStatus === 'unavailable') return { label: 'Serviço indisponível', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' };
    if (testStatus === 'failed') return { label: 'Teste falhou', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' };
    if (hasSavedApiKey) return { label: 'Configurada neste dispositivo', className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' };
    return { label: 'Não configurada', className: 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400 border-slate-200 dark:border-white/10' };
  }, [hasSavedApiKey, testStatus]);

  const handleSave = () => {
    if (!trimmedApiKey) {
      setMessage('Informe uma chave antes de salvar neste dispositivo.');
      setTestStatus('idle');
      return;
    }

    setStudentGoogleAiApiKey(trimmedApiKey);
    const storedApiKey = getStudentGoogleAiApiKey();
    setSavedApiKey(storedApiKey);
    setApiKey(storedApiKey || '');
    setTestStatus('idle');
    setMessage(storedApiKey ? 'Chave salva apenas neste dispositivo.' : 'Não foi possível salvar a chave neste dispositivo.');
  };

  const handleRemove = () => {
    removeStudentGoogleAiApiKey();
    setSavedApiKey(null);
    setApiKey('');
    setTestStatus('idle');
    setMessage('Chave removida deste dispositivo.');
  };

  const handleTest = async () => {
    const keyToTest = trimmedApiKey || savedApiKey || '';
    if (!keyToTest) {
      setTestStatus('failed');
      setMessage(TEST_FAILURE_MESSAGE);
      return;
    }

    setTestStatus('testing');
    setMessage('');

    try {
      const testResult = await testStudentGoogleAiApiKey(keyToTest);
      if (testResult.status === 'approved') {
        setTestStatus('passed');
        setMessage(`Teste aprovado com ${getStudentGoogleAiModelLabel(testResult.model)}. A chave está ativa para este dispositivo.`);
        return;
      }

      if (testResult.reason === 'unavailable') {
        setTestStatus('unavailable');
        setMessage(TEST_UNAVAILABLE_MESSAGE);
        return;
      }

      setTestStatus('failed');
      if (testResult.reason === 'auth') {
        setMessage(TEST_AUTH_FAILURE_MESSAGE);
        return;
      }

      if (testResult.reason === 'quota') {
        setMessage(TEST_QUOTA_FAILURE_MESSAGE);
        return;
      }

      if (testResult.reason === 'model') {
        setMessage(TEST_MODEL_FAILURE_MESSAGE);
        return;
      }
    } catch {
      // Do not log raw errors or sensitive request details.
    }

    setTestStatus('failed');
    setMessage(TEST_FAILURE_MESSAGE);
  };

  return (
    <section className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-slate-50/50 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <i className="fas fa-wand-magic-sparkles"></i>
          </div>
          <div>
            <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">Inteligência Artificial</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Opcional, configurada somente neste navegador.</p>
          </div>
        </div>

        <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${status.className}`}>
          {testStatus === 'testing' ? 'Testando...' : status.label}
        </span>
      </div>

      <div className="p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Chave Google AI Studio</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Use sua própria chave para preparar recursos de IA sem tornar isso obrigatório no sistema.
            </p>
          </div>

          <a
            href={GOOGLE_AI_STUDIO_API_KEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-500 active:scale-[0.98]"
          >
            <i className="fas fa-external-link-alt text-xs"></i>
            Obter minha chave no Google AI Studio
          </a>
        </div>

        <div className="space-y-3">
          <label htmlFor="student-google-ai-api-key" className="block text-xs font-black text-slate-400 uppercase tracking-widest">
            API key
          </label>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <i className="fas fa-key absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                id="student-google-ai-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setTestStatus('idle');
                  setMessage('');
                }}
                placeholder={hasSavedApiKey ? maskedSavedApiKey : 'Cole sua chave API'}
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 transition-all font-medium text-slate-900 dark:text-white"
              />
            </div>

          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={handleTest}
            disabled={testStatus === 'testing'}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            <i className={`fas ${testStatus === 'testing' ? 'fa-circle-notch fa-spin' : 'fa-vial'} text-xs`}></i>
            Testar chave
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500"
          >
            <i className="fas fa-save text-xs"></i>
            Salvar neste dispositivo
          </button>

          <button
            type="button"
            onClick={handleRemove}
            disabled={!hasSavedApiKey && !trimmedApiKey}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:hover:bg-red-500/10 disabled:hover:text-red-500"
          >
            <i className="fas fa-trash-alt text-xs"></i>
            Remover chave
          </button>
        </div>

        {message && (
          <p className={`text-sm font-bold ${testStatus === 'failed' ? 'text-red-500' : testStatus === 'unavailable' ? 'text-amber-600 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
            {message}
          </p>
        )}

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-medium text-amber-700 dark:text-amber-300">
          A chave API pertence à sua conta Google. O consumo, limites e eventuais custos são de responsabilidade da sua conta Google. Nunca compartilhe essa chave com terceiros. Você pode revogar ou gerar uma nova chave no Google AI Studio.
        </div>
      </div>
    </section>
  );
};

export default StudentGoogleAiKeySettings;
