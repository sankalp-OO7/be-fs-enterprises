const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1);
  }
};

const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
  } catch (error) {
    console.error("❌ Error closing database connection:", error);
  }
};

const getDatabaseStatus = () => {
  return mongoose.connection.readyState === 1 ? "connected" : "disconnected";
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus,
};