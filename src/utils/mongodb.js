const { MongoClient } = require('mongodb');
const { info, error, success } = require('./Console');

let db;

const connectToMongoDB = async () => {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        db = client.db('Relay');
        // success('Connected to MongoDB successfully and selected database Relay');
    } catch (err) {
        error('Failed to connect to MongoDB:', err);
    }
};

const getDB = async () => {
    if (!db) {
        await connectToMongoDB();
    }
    return db;
};

const insertDocument = async (collectionName, document) => {
    const db = await getDB();
    try {
        const result = await db.collection(collectionName).insertOne(document);
        // success(`Document inserted successfully: ${result.insertedId}`);
        return result;
    } catch (err) {
        error('Failed to insert document:', err);
        throw err;
    }
};

const updateDocument = async (collectionName, filter, update) => {
    const db = await getDB();
    try {
        const result = await db.collection(collectionName).updateOne(filter, update);
        // success(`Document updated successfully: ${result.modifiedCount} document(s) modified`);
        return result;
    } catch (err) {
        error('Failed to update document:', err);
        throw err;
    }
};

const checkDocument = async (collectionName, filter) => {
    const db = await getDB();
    try {
        const document = await db.collection(collectionName).findOne(filter);
        if (document) {
            //success('Document found');
        } //else {
        //info('Document not found');
        //}
        return document;
    } catch (err) {
        error('Failed to check document:', err);
        throw err;
    }
};

const setDocument = async (collectionName, filter, update) => {
    const db = await getDB();
    try {
        const result = await db.collection(collectionName).updateOne(filter, { $set: update }, { upsert: true });
        // success(`Document set successfully: ${result.upsertedCount ? 'inserted' : 'updated'} ${result.upsertedCount || result.modifiedCount} document(s)`);
        return result;
    } catch (err) {
        error('Failed to set document:', err);
        throw err;
    }
};

const deleteDocument = async (collectionName, filter) => {
    const db = await getDB();
    try {
        const result = await db.collection(collectionName).deleteOne(filter);
        // success(`Document deleted successfully: ${result.deletedCount} document(s) deleted`);
        return result;
    } catch (err) {
        error('Failed to delete document:', err);
        throw err;
    }
};

module.exports = { connectToMongoDB, getDB, insertDocument, updateDocument, checkDocument, setDocument, deleteDocument }; 