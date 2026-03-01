/**
 * Audio-to-Color page — ported from Gen-Music branch view.astro.
 * Server Component: renders the shell. ViewScriptRunner hydrates the audio engine.
 */

import type { Metadata } from 'next';
import ViewScriptRunner from '@/components/ViewScriptRunner';
import config from '@/lib/config';
import '@/styles/pages/view.scss';

export const metadata: Metadata = { title: config.name };

export default function ViewPage() {
    return (
        <>
            <h1>Audio to Color</h1>

            <div id="mode-tabs" className="mode-tabs" enable-xr={true}>
                <button type="button" className="tab" data-state="active" data-mode="file">File</button>
                <button type="button" className="tab" data-mode="speaker">Speaker / Tab</button>
                <button type="button" className="tab" data-mode="microphone">Microphone</button>
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

            <canvas id="colorCanvas" className="color-canvas" width={660} height={280} enable-xr={true} />

            <p id="mood" className="mood"></p>

            {/* Metric rows are injected dynamically by viewScript.ts */}
            <div id="metrics" className="metrics" enable-xr={true}></div>

            <ViewScriptRunner />
        </>
    );
}
