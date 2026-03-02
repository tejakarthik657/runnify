require('dotenv').config();
const mongoose = require('mongoose');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const chatRoomCollection = mongoose.connection.db.collection('chat_rooms_v1');
    const usersCollection = mongoose.connection.db.collection('users_v1');
    
    // Clean chat rooms
    const allRooms = await chatRoomCollection.find({}).toArray();
    console.log('\n📊 All chat rooms:', JSON.stringify(allRooms, null, 2));
    
    // Delete broken chat rooms with null roomId
    const result = await chatRoomCollection.deleteMany({ roomId: null });
    console.log(`✅ Deleted ${result.deletedCount} broken chat rooms with null roomId`);
    
    // Delete rooms without roomId field
    const result2 = await chatRoomCollection.deleteMany({ roomId: { $exists: false } });
    console.log(`✅ Deleted ${result2.deletedCount} chat rooms without roomId field`);
    
    // Drop and recreate the index
    try {
      await chatRoomCollection.dropIndex('roomId_1');
      console.log('✅ Dropped roomId_1 index');
    } catch (e) {
      console.log('⚠️ Could not drop index (may not exist)');
    }
    
    await chatRoomCollection.createIndex({ roomId: 1 }, { unique: true });
    console.log('✅ Created fresh roomId_1 index');

    // Clean duplicate usernames (keep only one)
    console.log('\n📊 Checking for duplicate usernames...');
    const duplicates = await usersCollection.aggregate([
      { $group: { _id: '$username', count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    for (const dup of duplicates) {
      console.log(`Found ${dup.count} users with username "${dup._id}"`);
      // Keep the first one, delete the rest
      const idsToDelete = dup.ids.slice(1);
      const delResult = await usersCollection.deleteMany({ _id: { $in: idsToDelete } });
      console.log(`✅ Deleted ${delResult.deletedCount} duplicate "${dup._id}" user(s)`);
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

cleanup();
