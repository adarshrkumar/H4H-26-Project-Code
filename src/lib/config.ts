export const VIEW_MOODS = [
    { id: 'calm',       label: 'Calm',      icon: '🌊', hue: 210 },
    { id: 'intense',    label: 'Intense',   icon: '🔥', hue: 15  },
    { id: 'mysterious', label: 'Mystery',   icon: '🌙', hue: 280 },
    { id: 'bright',     label: 'Bright',    icon: '☀️', hue: 55  },
    { id: 'dreamy',     label: 'Dreamy',    icon: '🌌', hue: 270 },
    { id: 'energetic',  label: 'Energetic', icon: '⚡', hue: 145 },
] as const;

export const VIEW_LAYERS = [
    { id: 'ground', name: 'Ground Energy', freq: '20–200 Hz',  icon: '🌋' },
    { id: 'flow',   name: 'Flow Energy',   freq: '200–800 Hz', icon: '🌊' },
    { id: 'form',   name: 'Form Energy',   freq: '800–3 kHz',  icon: '🔷' },
    { id: 'spark',  name: 'Spark Energy',  freq: '3–8 kHz',    icon: '✨' },
    { id: 'air',    name: 'Air Texture',   freq: '8–20 kHz',   icon: '💨' },
] as const;

export default {
    name: 'Huephonic',
    shortName: 'Huephonic',
    description: 'Real-time audio analysis and mood-driven color visualization',
    ai: {
        defaultModel: 'openai/gpt-4.1-mini',
        systemPrompt:
            `You are a creative music composer. Given a mood, emotion, or scene description, generate an evocative music prompt that translates the feeling into rich musical language — covering tempo, instrumentation, texture, dynamics, and emotional atmosphere. Output only the prompt text, no extra commentary.`,
    },
} as const;
