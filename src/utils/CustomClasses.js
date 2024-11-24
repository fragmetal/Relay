const { insertDocument, updateDocument, deleteDocument, checkDocument } = require('./mongodb');

class MyCustomStore {
    constructor() {
        // No need for a redis client
    }

    async get(guildId) {
        const data = await checkDocument('lavalinkqueue', { _id: guildId });

        const parsedQueue = data ? await this.parse(data.queue) : null;
        return parsedQueue;
    }

    async set(guildId, queueData) {
        const stringifiedQueueData = await this.stringify(queueData);

        const existingDocument = await checkDocument('lavalinkqueue', { _id: guildId });
        if (existingDocument) {
            // Check if the queue is a string and convert it to an array if necessary
            if (typeof existingDocument.queue === 'string') {
                await updateDocument('lavalinkqueue', { _id: guildId }, { $set: { queue: [] } });
            }
            // Now you can safely update the queue
            return await updateDocument('lavalinkqueue', { _id: guildId }, { $set: { queue: stringifiedQueueData } });
        } else {
            const document = {
                _id: guildId,
                queue: stringifiedQueueData
            };
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
