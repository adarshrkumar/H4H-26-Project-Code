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
