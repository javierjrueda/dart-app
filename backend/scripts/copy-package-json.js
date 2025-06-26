const fs = require("fs");
const path = require("path");

// Read the main package.json
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Create a production package.json with only necessary fields
const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  main: "server.js",
  _moduleAliases: packageJson._moduleAliases,
  dependencies: packageJson.dependencies,
};

// Ensure dist directory exists
const distDir = path.join(__dirname, "..", "dist");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write the production package.json to dist
const distPackageJsonPath = path.join(distDir, "package.json");
fs.writeFileSync(distPackageJsonPath, JSON.stringify(prodPackageJson, null, 2));

console.log("✅ Production package.json copied to dist/");
