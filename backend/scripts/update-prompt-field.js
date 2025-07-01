#!/usr/bin/env node

const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function updatePromptField() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();
    const mediaCollection = db.collection("media");

    // First, let's see what we have
    const totalMedia = await mediaCollection.countDocuments();
    console.log(`📊 Total media documents: ${totalMedia}`);

    // Count media with prompt field already set
    const mediaWithPrompt = await mediaCollection.countDocuments({
      prompt: { $exists: true, $ne: null },
    });
    console.log(`📋 Media with prompt field: ${mediaWithPrompt}`);

    // Count media with generationParams.prompt
    const mediaWithGenPrompt = await mediaCollection.countDocuments({
      "generationParams.prompt": { $exists: true },
    });
    console.log(`🔍 Media with generationParams.prompt: ${mediaWithGenPrompt}`);

    // Ask for confirmation
    console.log(
      "\n❓ Do you want to update the prompt field based on generationParams.prompt?"
    );
    console.log(
      "   This will set media.prompt = media.generationParams.prompt for all documents"
    );
    console.log("   Type 'yes' to continue: ");

    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question("", (answer) => {
        rl.close();
        resolve(answer);
      });
    });

    if (answer.toLowerCase() !== "yes") {
      console.log("❌ Update cancelled");
      return;
    }

    // Update all documents where generationParams.prompt exists
    const updateResult = await mediaCollection.updateMany(
      {
        "generationParams.prompt": { $exists: true },
      },
      [
        {
          $set: {
            prompt: "$generationParams.prompt",
          },
        },
      ]
    );

    console.log(`\n✅ Update complete!`);
    console.log(`   Modified: ${updateResult.modifiedCount} documents`);
    console.log(`   Matched: ${updateResult.matchedCount} documents`);

    // Show sample of updated documents
    console.log("\n📋 Sample of updated documents:");
    const samples = await mediaCollection
      .find(
        { prompt: { $exists: true } },
        { projection: { filename: 1, prompt: 1, "generationParams.prompt": 1 } }
      )
      .limit(5)
      .toArray();

    samples.forEach((doc) => {
      console.log(
        `   - ${doc.filename}: prompt=${doc.prompt}, generationParams.prompt=${doc.generationParams?.prompt}`
      );
    });

    // Group by prompt to show distribution
    console.log("\n📊 Media distribution by prompt number:");
    const promptGroups = await mediaCollection
      .aggregate([
        { $match: { prompt: { $exists: true } } },
        { $group: { _id: "$prompt", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    promptGroups.forEach((group) => {
      console.log(`   Prompt ${group._id}: ${group.count} images`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

// Run the script
updatePromptField();
