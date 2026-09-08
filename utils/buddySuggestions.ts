export interface BuddySuggestion {
    icon: string;
    text: string;
}

const genericSuggestions: BuddySuggestion[] = [
    { icon: 'fa-book', text: 'Me ajude a organizar meus estudos' },
    { icon: 'fa-lightbulb', text: 'Quais são as melhores técnicas de memorização?' },
    { icon: 'fa-question-circle', text: 'Tire uma dúvida sobre o sistema' },
    { icon: 'fa-chart-line', text: 'Como posso ver meu progresso?' },
    { icon: 'fa-rocket', text: 'Como acelerar meu aprendizado?' },
    { icon: 'fa-brain', text: 'Crie um cronograma para hoje' }
];

const courseTemplates = [
    "Resuma o curso de {courseTitle} para mim",
    "Quais os conceitos fundamentais de {courseTitle}?",
    "Crie um roteiro de estudos para {courseTitle}",
    "Como aplicar {courseTitle} no mercado de trabalho?",
    "Quais as pré-requisitos para {courseTitle}?",
    "Me dê dicas de projetos práticos em {courseTitle}"
];

const lessonTemplates = [
    "Resuma a aula '{lessonTitle}'",
    "Explique melhor o conceito de '{lessonTitle}'",
    "Me dê um exemplo prático sobre '{lessonTitle}'",
    "Crie 3 perguntas para eu testar meus conhecimentos em '{lessonTitle}'",
    "Qual a importância de '{lessonTitle}' no curso?",
    "Onde posso encontrar mais materiais sobre '{lessonTitle}'?"
];

export const getRandomSuggestions = (courseTitle?: string, lessonTitle?: string, count: number = 4): BuddySuggestion[] => {
    let pool: BuddySuggestion[] = [];
    const icons = ['fa-book', 'fa-code', 'fa-brain', 'fa-compass', 'fa-lightbulb', 'fa-graduation-cap', 'fa-terminal', 'fa-microchip'];

    // 1. Course suggestions
    if (courseTitle) {
        courseTemplates.forEach(template => {
            pool.push({
                icon: icons[Math.floor(Math.random() * icons.length)],
                text: template.replace('{courseTitle}', courseTitle)
            });
        });
    }

    // 2. Lesson suggestions
    if (lessonTitle) {
        lessonTemplates.forEach(template => {
            pool.push({
                icon: icons[Math.floor(Math.random() * icons.length)],
                text: template.replace('{lessonTitle}', lessonTitle)
            });
        });
    }

    // 3. Add generic suggestions
    genericSuggestions.forEach(s => {
        pool.push({ ...s });
    });

    // Shuffle and pick
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    // Ensure uniqueness
    const seen = new Set();
    const result: BuddySuggestion[] = [];

    for (const item of shuffled) {
        if (!seen.has(item.text)) {
            seen.add(item.text);
            result.push(item);
        }
        if (result.length === count) break;
    }

    return result;
};
