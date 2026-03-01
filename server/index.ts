import app from '../api/index';

const port = Number(process.env.API_PORT ?? 3001);
app.listen(port, () => console.log(`API server running on :${port}`));
