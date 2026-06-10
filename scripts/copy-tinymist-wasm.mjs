import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceDir = join(root, "vendor", "tinymist", "crates", "tinymist", "pkg");
const targetDir = join(root, "dist", "tinymist");
const files = ["tinymist.js", "tinymist.d.ts", "tinymist_bg.wasm"];

await mkdir(targetDir, { recursive: true });

for (const file of files) {
  await copyFile(join(sourceDir, file), join(targetDir, file));
}
