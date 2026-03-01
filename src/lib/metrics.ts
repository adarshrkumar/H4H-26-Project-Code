export const METRICS = [
    // Original
    { key: 'energy',           label: 'Energy' },
    { key: 'brightness',       label: 'Brightness' },
    { key: 'tempo',            label: 'Tempo' },
    { key: 'flux',             label: 'Flux' },
    { key: 'spread',           label: 'Spread' },
    { key: 'flatness',         label: 'Flatness' },
    { key: 'bassRatio',        label: 'Bass Ratio' },
    { key: 'zcr',              label: 'ZCR' },
    // Frequency bands
    { key: 'rolloff',          label: 'Rolloff' },
    { key: 'subBass',          label: 'Sub-bass' },
    { key: 'midRatio',         label: 'Mid Ratio' },
    { key: 'highRatio',        label: 'High Ratio' },
    // Time-domain
    { key: 'rms',              label: 'RMS' },
    { key: 'crestFactor',      label: 'Crest Factor' },
    { key: 'dynamicRange',     label: 'Dyn. Range' },
    // Spectral structure
    { key: 'spectralContrast', label: 'Contrast' },
    { key: 'harmonicRatio',    label: 'Harmonic' },
    // Tonal
    { key: 'chromaStrength',   label: 'Chroma Str.' },
    { key: 'dominantPitch',    label: 'Dom. Pitch' },
    { key: 'pitch',            label: 'Pitch' },
    // Rhythmic / temporal
    { key: 'attackTime',       label: 'Attack' },
    { key: 'beatRegularity',   label: 'Beat Reg.' },
    // Perceptual
    { key: 'roughness',        label: 'Roughness' },
    { key: 'mfcc1',            label: 'MFCC-1' },
    { key: 'tonnetz',          label: 'Tonnetz' },
] as const;
