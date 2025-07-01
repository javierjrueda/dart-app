#!/usr/bin/env node

const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function checkBattleReadiness(projectId) {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();
    const mediaCollection = db.collection("media");

    // Get project ID from command line or use the one from the error
    const targetProjectId = projectId || "68625498a4c0e32643dd238b";
    console.log(
      `\n🎯 Checking battle readiness for project: ${targetProjectId}`
    );

    // Get all media for the project
    const allMedia = await mediaCollection
      .find({ projectId: targetProjectId })
      .toArray();
    console.log(`\n📊 Total media in project: ${allMedia.length}`);

    // Group by quality
    const goodQuality = allMedia.filter((m) => m.quality === 1);
    const badQuality = allMedia.filter((m) => m.quality === -1);
    const unrated = allMedia.filter(
      (m) => m.quality === 0 || m.quality === undefined || m.quality === null
    );

    console.log(`\n📈 Media by quality:`);
    console.log(`   ✅ Good (1): ${goodQuality.length}`);
    console.log(`   ❌ Bad (-1): ${badQuality.length}`);
    console.log(`   ❓ Unrated (0): ${unrated.length}`);

    // Group good quality media by prompt number
    const goodByPrompt = new Map();
    goodQuality.forEach((media) => {
      const promptKey = media.prompt !== undefined ? media.prompt : "undefined";
      if (!goodByPrompt.has(promptKey)) {
        goodByPrompt.set(promptKey, []);
      }
      goodByPrompt.get(promptKey).push(media);
    });

    console.log(`\n🎮 Battle readiness by prompt group (Good quality only):`);
    let battleReadyGroups = 0;

    // Sort by prompt number for better readability
    const sortedPrompts = Array.from(goodByPrompt.keys()).sort((a, b) => {
      if (a === "undefined") return 1;
      if (b === "undefined") return -1;
      return Number(a) - Number(b);
    });

    sortedPrompts.forEach((prompt) => {
      const mediaList = goodByPrompt.get(prompt);
      const isBattleReady = mediaList.length >= 2;
      if (isBattleReady) battleReadyGroups++;

      console.log(
        `\n   Prompt ${prompt}: ${mediaList.length} images ${
          isBattleReady ? "✅ BATTLE READY" : "❌ NOT READY (need 2+)"
        }`
      );

      // Show first 5 files in this group
      const samplesToShow = Math.min(5, mediaList.length);
      for (let i = 0; i < samplesToShow; i++) {
        const media = mediaList[i];
        console.log(
          `      - ${media.filename || media._id} (ELO: ${media.elo || 1200})`
        );
      }
      if (mediaList.length > 5) {
        console.log(`      ... and ${mediaList.length - 5} more`);
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(
      `   Total prompt groups with good images: ${goodByPrompt.size}`
    );
    console.log(
      `   Battle-ready groups (2+ good images): ${battleReadyGroups}`
    );

    // Check for media without prompt field
    const mediaWithoutPrompt = allMedia.filter(
      (m) => m.prompt === undefined || m.prompt === null
    );
    if (mediaWithoutPrompt.length > 0) {
      console.log(
        `\n⚠️  Warning: ${mediaWithoutPrompt.length} media items don't have a prompt field set!`
      );
      console.log(`   These images won't be available for battles.`);

      // Check if they have generationParams.prompt
      const withGenPrompt = mediaWithoutPrompt.filter(
        (m) => m.generationParams?.prompt !== undefined
      );
      if (withGenPrompt.length > 0) {
        console.log(
          `   ${withGenPrompt.length} of these have generationParams.prompt that could be used.`
        );
        console.log(`   Run update-prompt-field.js to fix this.`);
      }
    }

    // Show what needs to be done
    if (battleReadyGroups === 0) {
      console.log(`\n❗ No prompt groups are battle-ready!`);
      console.log(`\nTo enable battles:`);
      console.log(
        `1. Make sure your images have the prompt field set (not just generationParams.prompt)`
      );
      console.log(
        `2. Rate at least 2 images as "Good" (quality = 1) within the same prompt group`
      );
      console.log(
        `3. Images with the same prompt number will battle against each other`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

// Get project ID from command line argument
const projectId = process.argv[2];
checkBattleReadiness(projectId);
