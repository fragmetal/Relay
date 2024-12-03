const { insertDocument, updateDocument, deleteDocument, checkDocument } = require('./mongodb');

class MyCustomStore {
    constructor() {
        // No need for a redis client
    }
    async getSessionId(guildId) {
        const data = await checkDocument('lavalinkqueue', { _id: guildId });

        if (data) {
            return data.sessionId;
        }
        return null;
    }

    async get(guildId) {
        const data = await checkDocument('lavalinkqueue', { _id: guildId });

        if (data) {
            const parsedQueue = await this.parse(data.queue);
            return parsedQueue;
        }
        return null;
    }

    async set(guildId, queueData) {
        const stringifiedQueueData = await this.stringify(queueData);

        const existingDocument = await checkDocument('lavalinkqueue', { _id: guildId });
        const document = {
            _id: guildId,
            queue: stringifiedQueueData
        };

        if (existingDocument) {
            return await updateDocument('lavalinkqueue', { _id: guildId }, { $set: document });
        } else {
            return await insertDocument('lavalinkqueue', document);
        }
    }

    async delete(guildId) {
        return await deleteDocument('lavalinkqueue', { _id: guildId });
    }

    async parse(stringifiedQueueData) {
        try {
            return typeof stringifiedQueueData === "string"
                ? JSON.parse(stringifiedQueueData)
                : stringifiedQueueData;
        } catch (error) {
            console.error('Error parsing queue data:', error);
            return null;
        }
    }

    async stringify(parsedQueueData) {
        return typeof parsedQueueData === "object"
            ? JSON.stringify(parsedQueueData)
            : parsedQueueData;
    }

    id(guildId) {
        return `lavalinkqueue_${guildId}`;
    }
}

module.exports = MyCustomStore;
