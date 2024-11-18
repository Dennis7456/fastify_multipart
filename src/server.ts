import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import multipart from '@fastify/multipart'; // Only use this plugin
import fs from 'fs';
import util from 'util';
import { pipeline } from 'stream';
import path from 'path';
import { AddressInfo } from 'net'; // Import AddressInfo type
import mime from 'mime-types'; // Add mime module to check MIME types
import { parse } from 'fast-csv'; // Correct import of the fast-csv parse function

const pump = util.promisify(pipeline);

// Extending Fastify instance type to include 'uploadFile' method
declare module 'fastify' {
    interface FastifyInstance {
        uploadFile(parts: AsyncIterable<any>): Promise<{ message: string }>;
    }
}

export const app: FastifyInstance = Fastify({
    logger: true
});

app.register(multipart);

app.decorate('uploadFile', async function (parts: AsyncIterable<any>) {
    const folder = './uploads';
    await createFolderIfMissing(folder);
    for await (const part of parts) {
        if (part.file) {
            const mimeType = mime.lookup(part.filename);
            const destFilePath = path.join(folder, part.filename);

            // Store the uploaded file regardless of type
            await pump(part.file, fs.createWriteStream(destFilePath));

            // You can process files differently based on MIME type
            if (mimeType === 'text/csv') {
                // If it's a CSV, process it with CSV parsing
                console.log(await readCsv(destFilePath));
            } else {
                // For all other file types, log the file path
                console.log(`File uploaded: ${destFilePath}`);
            }
        }
    }

    return { message: 'files uploaded' };
});

app.post('/api/upload/files', async function (req: FastifyRequest) {
    const parts = await req.parts(); // Automatically infers parts as AsyncIterable<any>
    return app.uploadFile(parts);
});

async function createFolderIfMissing(folderName: string): Promise<void> {
    try {
        await fs.promises.stat(folderName);
    } catch (error) {
        console.error('folder not found, creating..');
        await fs.promises.mkdir(folderName);
    }
}

// CSV parsing function
function readCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const dataArray: any[] = [];
        fs.createReadStream(filePath)
            .pipe(parse({ headers: true, delimiter: ';' })) // Ensure correct CSV parsing options
            .on('data', (row) => dataArray.push(row))
            .on('end', () => resolve(dataArray))
            .on('error', reject); // Handle error
    });
}

const start = async () => {
    try {
        const address = await app.listen({ port: 3000 });
        if (typeof address !== 'string') {
            const addr = address as AddressInfo;
            console.log(`server listening on ${addr.port}`);
        }
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
