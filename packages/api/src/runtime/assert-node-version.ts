const requiredNodeVersion = "22.19.0";

export function assertNodeVersion() {
  const currentNodeVersion = process.versions.node;

  if (currentNodeVersion !== requiredNodeVersion) {
    throw new Error(
      `Kichkintoy API requires Node ${requiredNodeVersion}. Current Node is ${currentNodeVersion}. Run "nvm use" in the repo root and try again.`
    );
  }
}
