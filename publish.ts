// This script allows using Git tags as the source of truth for versions rather
// than package.json.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const repoUrl = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!repoUrl) throw Error("Required arg: repo URL");
const dry = process.argv.includes("--dry");

function execGit(args: string, allowFailure = false) {
	try {
		return execSync(`git ${args}`, {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch (err) {
		if (!allowFailure) throw err;
	}
}

execGit("fetch --tags");
const tagCmd = "describe --tags --abbrev=0 --match='v[0-9]*.[0-9]*.[0-9]*'";
let version = execGit(`${tagCmd} --exact-match`, true);

if (!version) {
	const lastVersion = execGit(tagCmd, true) ?? "v0.0.0";
	console.log("No manual tag, bumping", lastVersion);

	const split = lastVersion.split(".");
	// Tags should only be missing for minor bumps.
	const last = parseInt(split.pop()!) + 1;
	version = [...split, last].join(".");

	if (!dry) {
		console.log("Tagging + pushing", version);
		execGit(`tag ${version}`);
		execGit("push --tags origin master");
	}
} else {
	console.log("Using manual tag", version);
}

if (!dry) {
	console.log("Writing temporary package.json");
	const pkg = JSON.parse(readFileSync("package.json", "utf8"));
	pkg.version = version.substring(1);
	pkg.repository = { url: repoUrl };
	writeFileSync("package.json", JSON.stringify(pkg, null, 2));

	console.log("Publishing to NPM", version);
	execSync("npm publish");
}
