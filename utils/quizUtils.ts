import { QuizQuestion, QuizOption } from '../domain/quiz-entities';

const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export const normalizeQuestions = (parsed: any[] | any) => {
    // Determine the array of questions to process
    let questionsArray: any[] = [];

    if (Array.isArray(parsed)) {
        // Check if it's a wrapped root object like [{ questions: [...] }]
        if (parsed.length === 1 && (parsed[0].questions || parsed[0].questoes) && Array.isArray(parsed[0].questions || parsed[0].questoes)) {
            questionsArray = parsed[0].questions || parsed[0].questoes;
        } else {
            // Standard array of questions
            questionsArray = parsed;
        }
    } else {
        // Direct object { questions: [...] } or single question object
        questionsArray = parsed.questions || parsed.questoes || [parsed];
    }

    return questionsArray
        .map((q: any) => {
            // Determine question text from various possible keys
            let text = q.questionText || q.enunciado || q.pergunta || q.texto || q.prompt || q.question || "";

            // Append justification if available
            const justification = q.justificativa || q.explicacao || q.feedback || q.reason || q.justification;
            if (justification && text) {
                text += `\n\n*Justificativa:* ${justification}`;
            }

            // Determine options from various possible keys
            let opts: any[] = [];
            const rawOptions = q.options || q.alternativas || q.opcoes || q.choices || q.respostas || q.answers || [];

            if (Array.isArray(rawOptions)) {
                opts = rawOptions.map((o, idx) => {
                    if (typeof o === 'string') return { optionText: o, index: idx };
                    return { ...o, index: idx };
                });
            } else if (typeof rawOptions === 'object' && rawOptions !== null) {
                opts = Object.entries(rawOptions).map(([key, val], idx) => ({
                    key: key,
                    optionText: String(val),
                    index: idx
                }));
            }

            // Determine correct answer (gabarito)
            // Fix: Include 'respostaCorreta' and 'correct_option' and ensure we handle numeric 0 which might evaluate to false in || chain.
            let rawGabarito = q.gabarito ?? q.resposta ?? q.respostaCorreta ?? q.correct ?? q.correct_option ?? "";
            const gabarito = String(rawGabarito).trim().toUpperCase();

            // Generate valid UUID for question if not provided or invalid
            const generateUUID = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
            const questionId = (q.id && isValidUUID(q.id)) ? q.id : generateUUID();

            const normalizedOptions = opts
                .map((o: any) => {
                    const optionText = o.optionText || o.text || o.texto || "";
                    let isCorrect = Boolean(o.isCorrect || o.is_correct || o.correta);

                    // If we have a gabarito, try to match it against key, letter index, numeric index, or text
                    if (gabarito !== "") {
                        const optionKey = String(o.key || "").toUpperCase();
                        const optionLetter = String.fromCharCode(65 + o.index).toUpperCase(); // A, B, C...
                        const optionIndex = String(o.index);

                        if (
                            optionKey === gabarito ||
                            optionLetter === gabarito ||
                            optionIndex === gabarito ||
                            optionText.toUpperCase() === gabarito
                        ) {
                            isCorrect = true;
                        }
                    }

                    const optionId = (o.id && isValidUUID(o.id)) ? o.id : generateUUID();

                    return new QuizOption(
                        optionId,
                        questionId,
                        optionText,
                        isCorrect,
                        o.index
                    );
                })
                .filter(o => o.optionText);

            // Pre-validate before creating QuizQuestion to avoid constructor errors
            if (!text || normalizedOptions.length < 2) {
                return null;
            }

            // Ensure at least one correct option exists (QuizQuestion constructor would throw otherwise)
            if (!normalizedOptions.some(o => o.isCorrect)) {
                // Determine if we can auto-correct (e.g., if no correct option is marked, maybe marking the first one? No, unsafe.)
                // Or check if we missed a gabarito format.
                // For now, filter it out to prevent crash.
                return null;
            }

            try {
                return new QuizQuestion(
                    questionId,
                    'temp-quiz',
                    text,
                    'multiple_choice',
                    q.numero || 0,
                    q.points || q.pontos || 1,
                    normalizedOptions,
                    q.dificuldade || q.difficulty || 'medium'
                );
            } catch (e) {
                console.warn('Skipping invalid question:', e);
                return null;
            }
        })
        .filter((q: QuizQuestion | null) => q !== null);
};


export const parseMarkdownQuestions = (markdown: string): any[] => {
    const questions: any[] = [];

    // Improved block splitting: Look for standard headers, question numbers, horizontal rules, or metadata headers as primary delimiters
    // We split by any header level (# to ######), horizontal rules (---), "Questão", "Question", or numeric lists (1., 2...)
    // Improved block splitting: Look for standard headers, question numbers, horizontal rules, or metadata headers as primary delimiters
    // We split by any header level (# to ######), horizontal rules (---), "Questão", "Question", or numeric lists (1., 2...)
    const blocks = markdown.split(/\r?\n\s*(?=#{1,6}\s+|---\s*(?:\r?\n|$)|(?:\*\*?)?(?:Questão|Question|Pergunta|Q)\s*[:\d]|(?:\*\*?)?\d+[\)\.]\s+)/i).filter(b => b.trim().length > 0);

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trimRight());
        if (lines.length === 0) continue;

        let questionText = "";
        let topic = "";
        let context = "";
        const options: any[] = [];
        let gabarito = "";
        let justificativa = "";
        let difficulty = "medium";

        let isParsingOptions = false;
        let isParsingStructure = 'header'; // header, topic, context, question, options, answer, justification

        // Regex definitions
        const topicRegex = /^\*\*Tópico:\*\*\s*(.+)$/i;
        const contextStartRegex = /^\*\*Contexto:\*\*\s*(.*)/i;
        const questionStartRegex = /^\*\*Pergunta:\*\*\s*(.*)/i;

        // Header Topic Regex: ### Questão 1 (Tópico: ...)
        const headerTopicRegex = /^#{1,3}\s+Questão\s+\d+\s*\((?:Tópico|Topic):\s*(.+)\)/i;

        // Options: "[ ] A) Text", "- [ ] A) Text", "A) Text"
        const optionRegex = /^(-\s*)?\[([ xX])\]\s*([A-Z]\))?\s*(.*)$|^([A-Z])[\)\.]\s*(.*)$/;
        const blockquoteRegex = /^>\s*(.+)$/;

        const gabaritoRegex = /^(?:Gabarito|Resposta|Correct|Answer|Resposta correta):\s*(.+)$/i;
        const justificativaRegex = /^(?:Justificativa|Explicação|Explanation|Feedback|Reason):\s*(.+)$/i;
        const difficultyRegex = /^(?:Dificuldade|Difficulty):\s*(.+)$/i;

        // Metadata with bold prefixes (e.g., **Gabarito:** or **Explicação:**)
        const boldGabaritoRegex = /^\*\*(?:Gabarito|Resposta|Correct|Answer|Resposta correta):\*\*\s*(.+)$/i;
        const boldJustificativaRegex = /^\*\*(?:Justificativa|Explicação|Explanation|Feedback|Reason):\*\*\s*(.+)$/i;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Skip empty lines between clear sections, unless in text accumulation mode
            if (!line) {
                if (isParsingStructure === 'context') context += "\n";
                if (isParsingStructure === 'question') questionText += "\n";
                continue;
            }

            // Clean markdown bold/italic from start/end of line for metadata checks if needed
            const cleanLine = line.replace(/^\*\*|\*\*$/g, '').trim();

            // 0. Check Header Topic (if line is the first line or starts with #)
            const headerTopicMatch = line.match(headerTopicRegex);
            if (headerTopicMatch) {
                topic = headerTopicMatch[1].trim();
                continue;
            }

            // 1. Detect Topics (explicit line)
            const topicMatch = line.match(topicRegex);
            if (topicMatch) {
                topic = topicMatch[1].trim();
                continue;
            }

            // 2. Detect Context
            const contextMatch = line.match(contextStartRegex);
            if (contextMatch) {
                context = contextMatch[1].trim();
                isParsingStructure = 'context';
                continue;
            }

            // 3. Detect Question Start
            const questionMatch = line.match(questionStartRegex);
            if (questionMatch) {
                questionText = questionMatch[1].trim();
                isParsingStructure = 'question';
                continue;
            }

            // 4. Detect Blockquotes (Answer/Justification)
            const blockquoteMatch = line.match(blockquoteRegex);
            if (blockquoteMatch) {
                let content = blockquoteMatch[1].trim();

                const innerGabaritoMatch = content.match(/^\*\*Resposta Correta:\*\*\s*([A-Z])/i);
                if (innerGabaritoMatch) { gabarito = innerGabaritoMatch[1]; continue; }

                const innerJustifMatch = content.match(/^(?:\[.*?\])?\*\*Justificativa:\*\*\s*(.+)/i);
                if (innerJustifMatch) { justificativa = innerJustifMatch[1].trim(); isParsingStructure = 'justification'; continue; }

                const stdGabarito = content.match(gabaritoRegex);
                if (stdGabarito) { gabarito = stdGabarito[1].trim(); continue; }

                if (isParsingStructure === 'justification') { justificativa += " " + content; }
                continue;
            }

            // 5. Check standard/bold metadata if not in blockquote
            if (line.match(boldGabaritoRegex)) { gabarito = line.match(boldGabaritoRegex)![1].trim(); continue; }
            if (line.match(boldJustificativaRegex)) { justificativa = line.match(boldJustificativaRegex)![1].trim(); isParsingStructure = 'justification'; continue; }

            if (cleanLine.match(gabaritoRegex)) { gabarito = cleanLine.match(gabaritoRegex)![1].trim(); continue; }
            if (cleanLine.match(justificativaRegex)) { justificativa = cleanLine.match(justificativaRegex)![1].trim(); isParsingStructure = 'justification'; continue; }

            if (line.match(difficultyRegex)) {
                const rawDiff = line.match(difficultyRegex)![1].trim().toLowerCase();
                if (rawDiff.includes('fácil') || rawDiff.includes('facil') || rawDiff.includes('easy')) difficulty = 'easy';
                else if (rawDiff.includes('difícil') || rawDiff.includes('dificil') || rawDiff.includes('hard')) difficulty = 'hard';
                else difficulty = 'medium';
                continue;
            }

            // 6. Parsing Flow & Options

            if (isParsingStructure === 'context') {
                if (line.match(questionStartRegex) || line.match(optionRegex)) {
                } else { context += "\n" + line; continue; }
            }

            if (isParsingStructure === 'justification') {
                justificativa += " " + line;
                continue;
            }

            const optMatch = line.match(optionRegex);
            if (optMatch) {
                isParsingStructure = 'options';
                let isCorrect = false;
                let key = "";
                let text = "";

                if (optMatch[2]) { // Bracket style
                    isCorrect = optMatch[2].toLowerCase() === 'x';
                    if (optMatch[3]) key = optMatch[3].replace(')', '');
                    text = optMatch[4];
                } else if (optMatch[5]) { // Simple "A) Text" style
                    key = optMatch[5];
                    text = optMatch[6];
                }

                text = text.trim().replace(/^["']|["']$/g, '').replace(/^[\*\s]+|[\*\s]+$/g, '').trim();
                options.push({ key: key, optionText: text, isCorrect: isCorrect });
                continue;
            }

            if (isParsingStructure !== 'justification' && isParsingStructure !== 'options') {
                if (cleanLine.match(/^(?:Data|Questão|Question)\s*[:\d]/i)) continue;
                if (line.match(/^#{1,3}\s+Questão/i)) continue;
                if (line.match(/^---+\s*$/)) continue;

                const cleanQuestionLine = line.replace(/^#{1,6}\s+/, '').replace(/^\d+[\)\.]\s+/, '');
                if (cleanQuestionLine) {
                    questionText += (questionText ? "\n" : "") + cleanQuestionLine;
                }
            }
        }

        let finalQuestionText = "";
        if (topic) finalQuestionText += `**Tópico:** ${topic}\n\n`;
        if (context) finalQuestionText += `**Contexto:** ${context.trim()}\n\n`;
        finalQuestionText += questionText.trim();

        if (justificativa) {
            finalQuestionText += `\n\n> **Justificativa:** ${justificativa.trim()}`;
        }

        // Match Gabarito
        if (gabarito) {
            const cleanGabarito = gabarito.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            options.forEach((opt, idx) => {
                const optKey = opt.key ? opt.key.toUpperCase() : String.fromCharCode(65 + idx);
                if (optKey === cleanGabarito || opt.optionText.startsWith(gabarito + ")")) {
                    opt.isCorrect = true;
                }
            });
        }

        if (finalQuestionText && options.length >= 2) {
            questions.push({
                questionText: finalQuestionText.trim(),
                options: options,
                gabarito: gabarito,
                justificativa: justificativa,
                difficulty: difficulty
            });
        }
    }

    return questions;
};
