const express = require('express');
const { success } = require('../utils/Console');

class HttpServer {
    constructor(port = 3000) {
        this.app = express();
        this.port = port;
        this.server = null;
    }

    start() {
        this.app.get('/', (req, res) => res.status(200).send('OK'));
        this.app.get('/health', (req, res) => res.status(200).send('OK'));

        this.server = this.app.listen(this.port, () => {
            success(`🌐 Keep-alive HTTP server running on port ${this.port}`);
        });
    }

    async stop() {
        if (this.server) {
            await new Promise(resolve => this.server.close(resolve));
        }
    }
}

module.exports = HttpServer;
