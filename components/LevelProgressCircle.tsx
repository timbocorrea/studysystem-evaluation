import React from 'react';

interface LevelProgressCircleProps {
    level: number;
    progressPercent: number;
}

// ============ CONSTANTES SEMÂNTICAS (Clean Code) ============
// Remove "magic numbers" e torna o código autodocumentado
const SVG_SIZE = 96; // Tamanho total do SVG (w-24 h-24 = 96px)
const SVG_CENTER_X = 48; // Centro X do círculo
const SVG_CENTER_Y = 48; // Centro Y do círculo
const CIRCLE_RADIUS = 50; // Raio do círculo de progresso
const CIRCLE_STROKE_WIDTH_BG = 2; // Espessura do círculo de fundo
const CIRCLE_STROKE_WIDTH_PROGRESS = 3; // Espessura do círculo de progresso
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~314.159

/**
 * Componente de círculo de progresso de nível (SRP - Single Responsibility Principle)
 * Responsabilidade única: renderizar indicador visual de progresso do nível do usuário
 */
const LevelProgressCircle: React.FC<LevelProgressCircleProps> = ({ level, progressPercent }) => {
    // Cálculo do dashoffset para animação do círculo
    const dashOffset = CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * progressPercent) / 100;

    return (
        <div className="relative flex-shrink-0 hidden md:block">
            {/* Círculo de nível com gradiente */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-teal-500 flex items-center justify-center shadow-xl shadow-indigo-500/30 border-4 border-white dark:border-slate-800">
                <div className="text-center">
                    <span className="block text-3xl font-black text-white leading-none">{level}</span>
                    <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-tighter">Nível</span>
                </div>
            </div>

            {/* SVG do círculo de progresso */}
            <svg
                className="absolute top-0 left-0 w-24 h-24 -rotate-90 pointer-events-none overflow-visible"
                width={SVG_SIZE}
                height={SVG_SIZE}
            >
                {/* Círculo de fundo (cinza) */}
                <circle
                    cx={SVG_CENTER_X}
                    cy={SVG_CENTER_Y}
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={CIRCLE_STROKE_WIDTH_BG}
                    className="text-indigo-500/10"
                />

                {/* Círculo de progresso (colorido com glow) */}
                <circle
                    cx={SVG_CENTER_X}
                    cy={SVG_CENTER_Y}
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={CIRCLE_STROKE_WIDTH_PROGRESS}
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-1000"
                />
            </svg>
        </div>
    );
};

export default LevelProgressCircle;
