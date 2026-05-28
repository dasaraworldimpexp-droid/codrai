import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = process.env.FILE_STORAGE_DIR || join(__dirname, "../../../../storage/uploads");

export class FileStorageService {
  async store({ id, buffer, originalName }) {
    await mkdir(STORAGE_ROOT, { recursive: true });
    const safeName = originalName.replace(/[^\w.\-]+/g, "_");
    const storagePath = join(STORAGE_ROOT, `${id}-${safeName}`);
    await writeFile(storagePath, buffer);
    return storagePath;
  }
}
