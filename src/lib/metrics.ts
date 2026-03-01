export const METRICS = [
    // Original
    { key: 'energy',           label: 'Energy',       color: '#ff8c00' },
    { key: 'brightness',       label: 'Brightness',   color: '#00bfff' },
    { key: 'tempo',            label: 'Tempo',        color: '#3ddc84' },
    { key: 'flux',             label: 'Flux',         color: '#b07dff' },
    { key: 'spread',           label: 'Spread',       color: '#20c8b8' },
    { key: 'flatness',         label: 'Flatness',     color: '#ff6eb4' },
    { key: 'bassRatio',        label: 'Bass Ratio',   color: '#ff4444' },
    { key: 'zcr',              label: 'ZCR',          color: '#b8ff2f' },
    // Frequency bands
    { key: 'rolloff',          label: 'Rolloff',      color: '#5bc8ff' },
    { key: 'subBass',          label: 'Sub-bass',     color: '#c0392b' },
    { key: 'midRatio',         label: 'Mid Ratio',    color: '#ff9d3a' },
    { key: 'highRatio',        label: 'High Ratio',   color: '#f5f0c0' },
    // Time-domain
    { key: 'rms',              label: 'RMS',          color: '#ffb347' },
    { key: 'crestFactor',      label: 'Crest Factor', color: '#9b59b6' },
    { key: 'dynamicRange',     label: 'Dyn. Range',   color: '#1abc9c' },
    // Spectral structure
    { key: 'spectralContrast', label: 'Contrast',     color: '#f1c40f' },
    { key: 'harmonicRatio',    label: 'Harmonic',     color: '#7dff8a' },
    // Tonal
    { key: 'chromaStrength',   label: 'Chroma Str.',  color: '#8e44ad' },
    { key: 'dominantPitch',    label: 'Dom. Pitch',   color: '#e056ff' },
    { key: 'pitch',            label: 'Pitch',        color: '#87ceeb' },
    // Rhythmic / temporal
    { key: 'attackTime',       label: 'Attack',       color: '#ff5e7a' },
    { key: 'beatRegularity',   label: 'Beat Reg.',    color: '#00e676' },
    // Perceptual
    { key: 'roughness',        label: 'Roughness',    color: '#e67e22' },
    { key: 'mfcc1',            label: 'MFCC-1',       color: '#c39bd3' },
    { key: 'tonnetz',          label: 'Tonnetz',      color: '#f9ca24' },
] as const;
