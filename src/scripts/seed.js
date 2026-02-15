/**
 * Database Seeding Script
 * 
 * This script populates the database with initial data for Users and Categories.
 * It handles password hashing, duplicate prevention, and provides multiple seeding options.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

// Import models
const User = require("../models/user.model");
const Category = require("../models/category.model");

/**
 * Connect to MongoDB
 */
const connectToDatabase = async () => {
  try {
    // Get MongoDB URI from environment or use default
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in .env file");
    }
    const mongoUri = process.env.MONGODB_URI ;
    
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log(" MongoDB connected successfully!");
    return true;
  } catch (error) {
    console.error(" MongoDB connection failed:", error.message);
    return false;
  }
};

/**
 * Hashes a plain text password using bcrypt
 */
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Returns seed data with properly hashed passwords
 */
const getSeedData = async () => {
  // Hash passwords for seed users
  const hashedAdminPassword = await hashPassword("admin123");
  const hashedUserPassword = await hashPassword("user123");
  const hashedViewerPassword = await hashPassword("viewer123");

  return {
    users: [
      {
        username: "admin_user",
        email: "admin@gmail.com",
        password: hashedAdminPassword,
        role: "admin",
      },
      {
        username: "Balu Gayake",
        email: "balu.gayake@gmail.com",
        password: hashedUserPassword,
        role: "user",
      },
      {
        username: "Sanklp rachhwar",
        email: "sanklp.rachhwar@gmail.com",
        password: hashedViewerPassword,
        role: "viewer",
      },
      {
        username: "test_user",
        email: "test@gmail.com",
        password: hashedUserPassword,
        role: "user",
      },
    ],
    categories: [
      // Hardware Shop Categories
      {
        name: "Power Tools",
        description: "Electric and battery-powered tools for construction and woodworking",
      },
      {
        name: "Hand Tools",
        description: "Manual tools including hammers, screwdrivers, wrenches, and pliers",
      },
      {
        name: "Electricals",
        description: "Electrical supplies, wires, switches, sockets, and lighting equipment",
      },
      {
        name: "Plumbing Tools",
        description: "Tools and equipment for plumbing work including wrenches, cutters, and sealants",
      },
      {
        name: "Measuring Tools",
        description: "Measuring instruments like tape measures, levels, calipers, and laser measures",
      },
      {
        name: "Fasteners",
        description: "Nails, screws, bolts, nuts, anchors, and other fastening hardware",
      },
      {
        name: "Safety Equipment",
        description: "Safety gear including gloves, goggles, helmets, and protective clothing",
      },
      {
        name: "Painting Supplies",
        description: "Paints, brushes, rollers, sprayers, and painting accessories",
      },
      {
        name: "Building Materials",
        description: "Cement, sand, bricks, tiles, and other construction materials",
      },
      {
        name: "Garden Tools",
        description: "Gardening equipment including shovels, rakes, pruners, and lawnmowers",
      },
      {
        name: "Welding Equipment",
        description: "Welders, welding rods, masks, and welding safety gear",
      },
      {
        name: "Hardware Accessories",
        description: "General hardware items, locks, hinges, handles, and fittings",
      },
      {
        name: "Adhesives & Sealants",
        description: "Glues, adhesives, tapes, caulks, and sealant products",
      },
      {
        name: "Cleaning Tools",
        description: "Brooms, mops, buckets, brushes, and cleaning equipment",
      },
      {
        name: "Ladders & Scaffolding",
        description: "Ladders, scaffolding, and access equipment for construction and maintenance",
      },
      {
        name:"others",
        description: "Miscellaneous hardware items and tools that do not fit into other categories",
      }
    ],
  };
};

/**
 * Seeds users into the database with duplicate prevention
 */
const seedUsers = async (usersData) => {
  try {
    console.log("Seeding users...");
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const userData of usersData) {
      // Check for existing user by email or username
      const existingUser = await User.findOne({ 
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });
      
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        skippedCount++;
        continue;
      }
      
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.username} (${user.email})`);
      createdCount++;
    }
    
    console.log(`Users seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`);
    return true;
  } catch (error) {
    console.error("Error seeding users:", error.message);
    return false;
  }
};

/**
 * Seeds categories into the database with duplicate prevention
 */
const seedCategories = async (categoriesData) => {
  try {
    console.log("Seeding categories...");
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const categoryData of categoriesData) {
      const existingCategory = await Category.findOne({ name: categoryData.name });
      
      if (existingCategory) {
        console.log(`Category "${categoryData.name}" already exists, skipping...`);
        skippedCount++;
        continue;
      }
      
      const category = new Category(categoryData);
      await category.save();
      console.log(`Created category: ${category.name}`);
      createdCount++;
    }
    
    console.log(`Categories seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}`);
    return true;
  } catch (error) {
    console.error("Error seeding categories:", error.message);
    return false;
  }
};

/**
 * Main seeding function that orchestrates the entire process
 */
const seedDatabase = async () => {
  console.log("Starting database seeding process for Hardware Shop...");
  
  // Connect to database first
  const isConnected = await connectToDatabase();
  if (!isConnected) {
    console.error("❌ Cannot proceed with seeding. Database connection failed.");
    console.error("   Please ensure MongoDB is running and check your .env file.");
    console.error("   You can test with: mongo --host localhost --port 27017");
    process.exit(1);
  }
  
  try {
    // Load seed data with hashed passwords
    const seedData = await getSeedData();
    const args = process.argv.slice(2);
    
    // Parse command line arguments
    const seedAll = args.length === 0 || args.includes("--all");
    const seedOnlyUsers = args.includes("--users");
    const seedOnlyCategories = args.includes("--categories");
    const resetFirst = args.includes("--reset");
    const forceReset = args.includes("--force-reset");
    
    // Handle reset operations
    if (resetFirst) {
      console.log("Resetting existing data as requested...");
      
      if (seedAll || seedOnlyUsers) {
        if (forceReset) {
          await User.deleteMany({});
          console.log("All users deleted");
        } else {
          console.log("Skipping user deletion (use --force-reset to delete)");
        }
      }
      
      if (seedAll || seedOnlyCategories) {
        await Category.deleteMany({});
        console.log("All categories deleted");
      }
    }
    
    // Execute seeding based on flags
    let usersSeeded = false;
    let categoriesSeeded = false;
    
    if (seedAll || seedOnlyUsers) {
      usersSeeded = await seedUsers(seedData.users);
    }
    
    if (seedAll || seedOnlyCategories) {
      categoriesSeeded = await seedCategories(seedData.categories);
    }
    
    // Display final summary
    console.log("\nSeeding Summary:");
    console.log("================");
    
    if (seedAll || seedOnlyUsers) {
      const userCount = await User.countDocuments();
      console.log(`Total Users in Database: ${userCount}`);
    }
    
    if (seedAll || seedOnlyCategories) {
      const categoryCount = await Category.countDocuments();
      console.log(`Total Categories in Database: ${categoryCount}`);
      
      // List all categories
      const allCategories = await Category.find({}, 'name');
      console.log("\nHardware Shop Categories:");
      allCategories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name}`);
      });
    }
    
    console.log("\n Seeding process completed successfully");
    
  } catch (error) {
    console.error("❌ Seeding process failed:", error.message);
    console.error("Error stack:", error.stack);
  } finally {
    // Ensure database connection is closed
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("Database connection closed");
    }
  }
};

// Execute seeding if this file is run directly
if (require.main === module) {
  seedDatabase();
}

// Export functions for testing or programmatic use
module.exports = {
  hashPassword,
  getSeedData,
  seedUsers,
  seedCategories,
  seedDatabase,
};