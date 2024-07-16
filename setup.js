const readline = require("readline");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function setup() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    "Enter the path to an existing git repository, or press enter to create a new one: ",
    (repoPath) => {
      if (repoPath) {
        process.chdir(repoPath);
      } else {
        execSync("git init", { stdio: "inherit" });
      }

      // Create .gitignore if it doesn't exist
      const gitignorePath = path.join(process.cwd(), ".gitignore");
      if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, "node_modules/\n");
      } else {
        const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
        if (!gitignoreContent.includes("node_modules/")) {
          fs.appendFileSync(gitignorePath, "\nnode_modules/\n");
        }
      }

      // Install dependencies
      execSync(
        "npm install --save-dev commitizen cz-conventional-changelog @commitlint/cli @commitlint/config-conventional release-it @release-it/conventional-changelog husky",
        { stdio: "inherit" }
      );

      // Initialize Commitizen
      execSync(
        "npx commitizen init cz-conventional-changelog --save-dev --save-exact",
        { stdio: "inherit" }
      );

      // Update package.json
      const packageJsonPath = path.join(process.cwd(), "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      packageJson.scripts = {
        ...packageJson.scripts,
        commit: "cz",
        release: "release-it",
        prepare: "husky install",
      };
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      // Create commitlint.config.js
      fs.writeFileSync(
        "commitlint.config.js",
        "module.exports = {extends: ['@commitlint/config-conventional']};"
      );

      // Create .release-it.json
      const releaseItConfig = {
        git: {
          commitMessage: "chore: release v${version}",
        },
        github: {
          release: true,
        },
        npm: {
          publish: false,
        },
        plugins: {
          "@release-it/conventional-changelog": {
            preset: "angular",
            infile: "CHANGELOG.md",
          },
        },
      };
      fs.writeFileSync(
        ".release-it.json",
        JSON.stringify(releaseItConfig, null, 2)
      );

      // Set up Husky
      execSync("npx husky install", { stdio: "inherit" });

      // Create commit-msg hook
      const commitMsgHook =
        '#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\nnpx --no -- commitlint --edit $1';
      fs.writeFileSync(".husky/commit-msg", commitMsgHook);
      execSync("chmod +x .husky/commit-msg", { stdio: "inherit" });

      console.log("Setup complete!");
      rl.close();
    }
  );
}

module.exports = setup;
