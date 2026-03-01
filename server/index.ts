import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../src/lib/auth';
import { POST as generatePost } from '../src/app/api/generate/route';
import { POST as generateBlueprintPost } from '../src/app/api/generate-blueprint/route';
import { POST as generateSectionPost } from '../src/app/api/generate-section/route';

const app = express();
app.use(cors({ origin: process.env.VITE_APP_URL ?? 'http://localhost:5173' }));

// Auth handler must come before express.json() — it reads the raw body itself
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

function webHandler(
    handler: (req: Request) => Promise<Response>,
): express.RequestHandler {
    return async (req, res) => {
        const url = `http://${req.headers.host}${req.originalUrl}`;
        const webReq = new Request(url, {
            method: req.method,
            headers: req.headers as HeadersInit,
            body: JSON.stringify(req.body),
        });
        const webRes = await handler(webReq);
        res.status(webRes.status);
        webRes.headers.forEach((v, k) => res.setHeader(k, v));
        res.json(await webRes.json().catch(() => null));
    };
}

app.post('/api/generate', webHandler(generatePost));
app.post('/api/generate-blueprint', webHandler(generateBlueprintPost));
app.post('/api/generate-section', webHandler(generateSectionPost));

const port = Number(process.env.API_PORT ?? 3001);
app.listen(port, () => console.log(`API server running on :${port}`));
