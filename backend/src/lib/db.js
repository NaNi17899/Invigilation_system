import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is missing in environment variables. Cannot start API without database connection.');
  }

  const dbName = process.env.MONGO_DB || 'invigilatorDB';

  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(uri, {
      dbName: dbName,
    });
    console.log(`MongoDB connected successfully: ${conn.connection.host} (Database: ${conn.connection.name})`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    throw err; // Throw so that index.js catches it and prevents the app from starting
  }
}
