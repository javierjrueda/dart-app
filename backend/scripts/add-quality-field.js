// Migration script to add quality field to existing media documents
// Run with: node scripts/add-quality-field.js

const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dart";

async function migrate() {
  try {
    console.log("🔧 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get the Media collection
    const db = mongoose.connection.db;
    const mediaCollection = db.collection("media");

    // Count documents without quality field
    const countWithoutQuality = await mediaCollection.countDocuments({
      quality: { $exists: false },
    });

    console.log(
      `📊 Found ${countWithoutQuality} media documents without quality field`
    );

    if (countWithoutQuality > 0) {
      // Update all documents without quality field
      const result = await mediaCollection.updateMany(
        { quality: { $exists: false } },
        { $set: { quality: 0 } }
      );

      console.log(
        `✅ Updated ${result.modifiedCount} documents with quality = 0 (unrated)`
      );
    } else {
      console.log("ℹ️  All documents already have quality field");
    }

    // Verify the update
    const totalCount = await mediaCollection.countDocuments();
    const withQualityCount = await mediaCollection.countDocuments({
      quality: { $exists: true },
    });

    console.log(`\n📈 Migration Summary:`);
    console.log(`   Total media documents: ${totalCount}`);
    console.log(`   Documents with quality field: ${withQualityCount}`);
    console.log(
      `   Documents without quality field: ${totalCount - withQualityCount}`
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

// Run the migration
migrate();
