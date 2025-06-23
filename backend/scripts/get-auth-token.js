const fetch = require("node-fetch");

async function getAuthToken(
  email,
  password,
  apiUrl = "http://localhost:3001/api/v1"
) {
  try {
    const response = await fetch(`${apiUrl}/auth/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Authentication failed: ${errorData}`);
    }

    const result = await response.json();
    return result.accessToken;
  } catch (error) {
    console.error("❌ Failed to get auth token:", error.message);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: node get-auth-token.js <email> <password> [api_url]

Arguments:
  email       Your account email
  password    Your account password
  api_url     API base URL (optional, default: http://localhost:3001/api/v1)

Example:
  node get-auth-token.js user@example.com mypassword
`);
    process.exit(1);
  }

  const [email, password, apiUrl] = args;

  getAuthToken(email, password, apiUrl)
    .then((token) => {
      console.log("✅ Authentication successful!");
      console.log("🔑 Your auth token:");
      console.log(token);
      console.log("\n💡 Use this token with the bulk upload script:");
      console.log(`node bulk-upload.js /path/to/images PROJECT_ID "${token}"`);
    })
    .catch((error) => {
      console.error("❌ Authentication failed:", error.message);
      process.exit(1);
    });
}

module.exports = getAuthToken;
