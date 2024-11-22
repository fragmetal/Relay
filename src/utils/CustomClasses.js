const { insertDocument, updateDocument, deleteDocument, checkDocument } = require('./mongodb');

class MyCustomStore {
    constructor() {
        // No need for a redis client
    }

    async get(guildId) {
        const data = await checkDocument('lavalinkqueue', { _id: guildId });
        return data ? data.queue : null; // Assuming the queue is stored in a field named 'queue'
    }

    async set(guildId, stringifiedQueueData) {
        const document = {
            _id: guildId,
            queue: stringifiedQueueData // Assuming you want to store the queue data here
        };

        // Check if the document already exists
        const existingDocument = await checkDocument('lavalinkqueue', { _id: guildId });
        if (existingDocument) {
            // Update the existing document instead of inserting
            return await updateDocument('lavalinkqueue', { _id: guildId }, { $set: { queue: stringifiedQueueData } });
        } else {
            // Insert the new document
            return await insertDocument('lavalinkqueue', document);
        }
    }

    async delete(guildId) {
        return await deleteDocument('lavalinkqueue', { _id: guildId });
    }

    async parse(stringifiedQueueData) {
        return typeof stringifiedQueueData === "string"
            ? JSON.parse(stringifiedQueueData)
            : stringifiedQueueData;
    }

    async stringify(parsedQueueData) {
        return typeof parsedQueueData === "object"
            ? JSON.stringify(parsedQueueData)
            : parsedQueueData;
    }

    id(guildId) {
        return `lavalinkqueue_${guildId}`; // Transform the id if needed
    }
}

module.exports = MyCustomStore;
