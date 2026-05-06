import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/clarity';

async function testConnection() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');
    
    const db = mongoose.connection.db;
    if (!db) {
        console.error('No database object found');
        return;
    }
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:', collections.map(c => c.name));
    
    // Check if 'items' collection exists and count
    const itemsCollection = db.collection('items');
    const count = await itemsCollection.countDocuments();
    console.log('Total items:', count);

    await mongoose.disconnect();
    console.log('Disconnected.');
  } catch (error) {
    console.error('Connection failed:', error);
    process.exit(1);
  }
}

testConnection();
