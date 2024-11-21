require('dotenv').config();
const fs = require('fs');
const http = require('http');
const DiscordBot = require('./client/DiscordBot');
const { connectToMongoDB } = require('./utils/mongodb');

const logFilePath = './terminal.log';

fs.writeFileSync(logFilePath, '', 'utf-8');

const client = new DiscordBot();

(async () => {
    await connectToMongoDB();
    client.connect();
})();

module.exports = client;

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/logs') {
        fs.readFile(logFilePath, 'utf-8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>Internal Server Error</h1>');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Logs</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            background-color: #f4f4f9;
                        }
                        .container {
                            max-width: 800px;
                            margin: 50px auto;
                            padding: 20px;
                            background-color: #fff;
                            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        }
                        h1 {
                            text-align: center;
                            color: #333;
                        }
                        pre {
                            background-color: #eee;
                            padding: 10px;
                            border-radius: 5px;
                            overflow-x: auto;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Server Logs</h1>
                        <pre>${data}</pre>
                    </div>
                </body>
                </html>
            `);
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>Not Found</h1>');
    }
});

server.listen(3000, () => {});

const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
const originalConsoleLog = console.log;
console.log = (...args) => {
    originalConsoleLog(...args);
    logStream.write(args.join(' ') + '\n');
};