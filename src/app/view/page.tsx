/**
 * Audio-to-Color page — converted from src/pages/view.astro.
 * Server Component: renders the metric panels and canvas grid.
 * ViewScriptRunner (client component) runs the Web Audio pipeline after hydration.
 */

import type { Metadata } from 'next';
import { METRICS } from '@/lib/metrics';
import ViewScriptRunner from '@/components/ViewScriptRunner';
import config from '@/lib/config';
import '@/styles/pages/view.scss';

export const metadata: Metadata = { title: config.name };

export default function ViewPage() {
    return (
        <>
            <div className="page-header">
                <h1>Huephonic</h1>
                <h4>An orchestra for the deaf!</h4>
            </div>

            <div id="mode-tabs" className="mode-tabs">
                <button className="tab" data-state="active" data-mode="file">File</button>
                <button className="tab" data-mode="speaker">Speaker / Tab</button>
                <button className="tab" data-mode="microphone">Microphone</button>
            </div>

            <div id="controls" className="controls">
                <div id="ctrl-file" className="ctrl-panel" data-state="active">
                    <label htmlFor="audioFile">Audio file</label>
                    <input type="file" id="audioFile" accept="audio/*" />
                </div>
                <div id="ctrl-speaker" className="ctrl-panel">
                    <button type="button" className="btn" id="speakerStartBtn">Start Capture</button>
                    <button type="button" className="btn stop" id="speakerStopBtn" disabled>Stop</button>
                </div>
                <div id="ctrl-microphone" className="ctrl-panel">
                    <button type="button" className="btn" id="micStartBtn">Start Microphone</button>
                    <button type="button" className="btn stop" id="micStopBtn" disabled>Stop</button>
                </div>
            </div>

            <div id="metrics" className="metrics">
                {METRICS.map(({ key, label, color }) => (
                    <div key={key} className="metric-panel">
                        <div className="metric-panel__header">
                            <span className="metric-label" style={{ '--metric-color': color } as React.CSSProperties}>{label}</span>
                            <span className={`metric-value val-${key}`} id={`val-${key}`}>0.00</span>
                        </div>
                        <canvas className="metric-graph" id={`graph-${key}`} width={400} height={80} />
                    </div>
                ))}
            </div>

            {/* Client-side Web Audio pipeline */}
            <ViewScriptRunner />
        </>
    );
}
