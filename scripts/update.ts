#!/usr/bin/env bun
import { Octokit } from "@octokit/rest";
import * as fs from "fs";
import * as path from "path";

interface Package {
  name: string;
  git: string;
  rev: string;
}

const packages: Package[] = [
  {
    name: "@keychord/chords-chord",
    git: "https://github.com/KeyChord/chords-chord",
    rev: "",
  },
  {
    name: "@keychord/chords-commands",
    git: "https://github.com/KeyChord/chords-commands",
    rev: "",
  },
  {
    name: "@keychord/chords-os",
    git: "https://github.com/KeyChord/chords-os",
    rev: "",
  },
  {
    name: "@keychord/chords-menu",
    git: "https://github.com/KeyChord/chords-menu",
    rev: "",
  },
  {
    name: "@keychord/chords-com.apple",
    git: "https://github.com/KeyChord/chords-com.apple",
    rev: "",
  },
  {
    name: "@keychord/chords-tray",
    git: "https://github.com/KeyChord/chords-tray",
    rev: "",
  },
];

async function updatePackageRevisions(): Promise<void> {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const chordpackPath = path.join(process.cwd(), "chordpack.toml");
  let chordpackName = "Chord's default chordpack";

  try {
    const existingContent = fs.readFileSync(chordpackPath, "utf-8");
    const nameMatch = existingContent.match(/^name\s*=\s*"([^"]+)"/m);
    if (nameMatch) {
      chordpackName = nameMatch[1];
    }

    // Try to populate initial revs from existing file so we don't clear them on failure
    for (const pkg of packages) {
      const revMatch = new RegExp(`^"${pkg.name}"\\s*=\\s*{[^}]*rev\\s*=\\s*"([^"]+)"`, "m").exec(existingContent);
      if (revMatch) {
        pkg.rev = revMatch[1];
      }
    }
  } catch (error) {
    console.warn("Could not read existing chordpack.toml, proceeding with defaults.");
  }

  for (const pkg of packages) {
    const parts = pkg.git.replace("https://github.com/", "").split("/");
    const owner = parts[0];
    const repo = parts[1];

    try {
      // Fetch latest commit on default branch
      const { data } = await octokit.repos.listCommits({
        owner,
        repo,
        per_page: 1,
      });

      if (data && data.length > 0) {
        pkg.rev = data[0].sha;
        console.log(`Updated ${pkg.name} to ${pkg.rev}`);
      } else {
        console.warn(`No commits found for ${pkg.name}`);
      }
    } catch (error) {
      console.error(`Failed to update ${pkg.name}:`, (error as any).message || error);
    }
  }

  const output = generateTomlOutput(chordpackName, packages);
  fs.writeFileSync(chordpackPath, output);
  console.log(`Updated ${chordpackPath}`);
}

function generateTomlOutput(name: string, packages: Package[]): string {
  let toml = `name = "${name}"\n\n`;
  toml += "[packages]\n";
  for (const pkg of packages) {
    toml += `"${pkg.name}" = { git = "${pkg.git}", rev = "${pkg.rev}" }\n`;
  }
  return toml;
}

updatePackageRevisions();
