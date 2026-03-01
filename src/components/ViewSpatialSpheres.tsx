import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Reality,
    SceneGraph,
    Entity,
    SphereEntity,
    UnlitMaterial,
} from '@webspatial/react-sdk';

type VizBandLevels = {
    bass: number;
    lowmid: number;
    mid: number;
    trebleHigh: number;
    overall: number;
    envelope: number;
    hitStrength: number;
    timestampSec: number;
};

const ZERO_LEVELS: VizBandLevels = {
    bass: 0,
    lowmid: 0,
    mid: 0,
    trebleHigh: 0,
    overall: 0,
    envelope: 0,
    hitStrength: 0,
    timestampSec: 0,
};

const WAVE_SPEED = 0.6;
const WAVE_AMPLITUDE = 0.05;

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export default function ViewSpatialSpheres() {
    const [levels, setLevels] = useState<VizBandLevels>(ZERO_LEVELS);
    const lastSyncRef = useRef(0);

    useEffect(() => {
        const onLevels = (event: Event) => {
            const now = performance.now();
            if (now - lastSyncRef.current < 45) return;
            const detail = (event as CustomEvent<Partial<VizBandLevels>>).detail;
            if (!detail) return;

            setLevels({
                bass: clamp01(detail.bass ?? 0),
                lowmid: clamp01(detail.lowmid ?? 0),
                mid: clamp01(detail.mid ?? 0),
                trebleHigh: clamp01(detail.trebleHigh ?? 0),
                overall: clamp01(detail.overall ?? 0),
                envelope: clamp01(detail.envelope ?? 0),
                hitStrength: clamp01(detail.hitStrength ?? 0),
                timestampSec: Math.max(0, detail.timestampSec ?? 0),
            });
            lastSyncRef.current = now;
        };

        window.addEventListener('viz:band-levels', onLevels as EventListener);
        return () => window.removeEventListener('viz:band-levels', onLevels as EventListener);
    }, []);

    const sceneScaleValue = useMemo(() => {
        return 0.84 + levels.envelope * 0.7 + levels.hitStrength * 0.18;
    }, [levels.envelope, levels.hitStrength]);

    const sceneScale = useMemo(() => {
        return { x: sceneScaleValue, y: sceneScaleValue, z: sceneScaleValue };
    }, [sceneScaleValue]);

    const waveY = useMemo(() => {
        const t = levels.timestampSec * WAVE_SPEED;
        return {
            bass: Math.sin(t + 0) * WAVE_AMPLITUDE,
            lowmid: Math.sin(t + 0.9) * WAVE_AMPLITUDE,
            mid: Math.sin(t + 1.8) * WAVE_AMPLITUDE,
            treble: Math.sin(t + 2.7) * WAVE_AMPLITUDE,
        };
    }, [levels.timestampSec]);

    return (
        <div className="viz-spatial-spheres" data-enable-xr="true" aria-hidden="true">
            <Reality
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 10,
                    border: '0',
                    background: 'transparent',
                    pointerEvents: 'none',
                }}
            >
                <UnlitMaterial id="sp-bass" color="#a855f7" />
                <UnlitMaterial id="sp-lowmid" color="#eab308" />
                <UnlitMaterial id="sp-mid" color="#22c55e" />
                <UnlitMaterial id="sp-treble" color="#3b82f6" />

                <SceneGraph>
                    <Entity
                        position={{ x: 0, y: 0, z: 0 }}
                        scale={sceneScale}
                        rotation={{ x: 0, y: 0, z: 0 }}
                    >
                        <SphereEntity
                            materials={['sp-bass']}
                            radius={0.04 + levels.bass * 0.09}
                            position={{ x: -0.3, y: levels.bass * 0.06 + waveY.bass, z: 0 }}
                        />

                        <SphereEntity
                            materials={['sp-lowmid']}
                            radius={0.05 + levels.lowmid * 0.08}
                            position={{ x: -0.1, y: levels.lowmid * 0.06 + waveY.lowmid, z: 0 }}
                        />

                        <SphereEntity
                            materials={['sp-mid']}
                            radius={0.04 + levels.mid * 0.09}
                            position={{ x: 0.1, y: levels.mid * 0.06 + waveY.mid, z: 0 }}
                        />

                        <SphereEntity
                            materials={['sp-treble']}
                            radius={0.04 + levels.trebleHigh * 0.09}
                            position={{ x: 0.3, y: levels.trebleHigh * 0.06 + waveY.treble, z: 0 }}
                        />
                    </Entity>
                </SceneGraph>
            </Reality>
        </div>
    );
}
