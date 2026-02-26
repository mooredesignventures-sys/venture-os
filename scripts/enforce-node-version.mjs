const requiredMajor = 22;
const requiredMinor = 11;
const requiredPatch = 0;

const version = process.versions.node;
const [majorText = "0", minorText = "0", patchText = "0"] = version.split(".");
const major = Number.parseInt(majorText, 10);
const minor = Number.parseInt(minorText, 10);
const patch = Number.parseInt(patchText, 10);

const isMajorValid = major === requiredMajor;
const isMinimumPatchValid =
  minor > requiredMinor || (minor === requiredMinor && patch >= requiredPatch);

if (!isMajorValid || !isMinimumPatchValid) {
  console.error(`
INVALID NODE VERSION
Required: 22.11.0+
Detected: ${version}

Install Node 22.11.0 before proceeding.
`);
  process.exit(1);
}

console.log(`Node version OK (${version})`);
