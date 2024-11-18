import { app } from "./server";
import { FastifyRequest } from "fastify";

app.post('/api/upload/files', async function (req: FastifyRequest) {
    const parts = await req.parts(); // Automatically infers parts as AsyncIterable<any>
    return app.uploadFile(parts);
});