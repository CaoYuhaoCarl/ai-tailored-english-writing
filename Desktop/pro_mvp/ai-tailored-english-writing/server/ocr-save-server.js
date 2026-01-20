import { createServer } from "http";
import { mkdir, readdir, writeFile } from "fs/promises";
import { relative, resolve } from "path";

const PORT = Number(process.env.OCR_SAVE_PORT || 8788);
const ROOT_DIR = resolve(process.env.OCR_SAVE_DIR || process.cwd(), "ocr_logs");
const IMAGE_ROOT = resolve(process.env.OCR_IMAGE_ROOT || process.cwd(), "tasks");
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB safeguard

const allowCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ALLOW_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const sanitizeFilename = (name) => {
  if (!name) return `ocr_${Date.now()}.md`;
  const base = name.replace(/\.[^/.]+$/, "");
  const safe = base.replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 80) || "ocr";
  return safe.endsWith(".md") ? safe : `${safe}.md`;
};

const normalizeSlashes = (value = "") => value.replace(/\\/g, "/");

const readJsonBody = (req) =>
  new Promise((resolveBody, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY_BYTES) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolveBody(JSON.parse(data || "{}"));
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });

const findImagePath = async (targetName) => {
  if (!targetName) return null;
  const queue = [IMAGE_ROOT];

  while (queue.length) {
    const current = queue.pop();
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (err) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase() === targetName.toLowerCase()) {
        return fullPath;
      }
    }
  }

  return null;
};

const resolveImageLinkPath = async (baseDir, imageFilename, imageRelativePathHint, imageAbsolutePath) => {
  const resolvedImagePath =
    typeof imageAbsolutePath !== "undefined" ? imageAbsolutePath : imageFilename ? await findImagePath(imageFilename) : null;
  if (resolvedImagePath) {
    return normalizeSlashes(relative(baseDir, resolvedImagePath));
  }

  if (typeof imageRelativePathHint === "string" && imageRelativePathHint.trim()) {
    const normalizedHint = normalizeSlashes(imageRelativePathHint.trim());
    const absoluteFromHint = resolve(ROOT_DIR, normalizedHint);
    return normalizeSlashes(relative(baseDir, absoluteFromHint));
  }

  return null;
};

// Mirror the image folder hierarchy under the OCR log root when saving markdown.
const deriveLogSubdir = async ({ imageFilename, imageRelativePath, imageAbsolutePath }) => {
  const imageRootName = normalizeSlashes(IMAGE_ROOT).split("/").filter(Boolean).pop();
  const toDirectory = (pathStr) => {
    if (!pathStr) return "";
    const segments = normalizeSlashes(pathStr)
      .split("/")
      .filter(Boolean)
      .filter((segment) => segment !== "." && segment !== "..");

    if (imageRootName && segments[0]?.toLowerCase() === imageRootName.toLowerCase()) {
      segments.shift();
    }

    if (!segments.length) return "";
    const last = segments[segments.length - 1];
    if (/\.[^/.]+$/.test(last)) {
      segments.pop();
    }

    return segments.join("/");
  };

  const resolvedImagePath =
    typeof imageAbsolutePath !== "undefined" ? imageAbsolutePath : imageFilename ? await findImagePath(imageFilename) : null;
  if (resolvedImagePath) {
    const relativeToImageRoot = normalizeSlashes(relative(IMAGE_ROOT, resolvedImagePath));
    if (!relativeToImageRoot.startsWith("..")) {
      const dir = toDirectory(relativeToImageRoot);
      if (dir) return dir;
    }
  }

  if (typeof imageRelativePath === "string" && imageRelativePath.trim()) {
    const cleaned = normalizeSlashes(imageRelativePath.trim())
      .replace(/^\.\/+/, "")
      .replace(/^(\.\.\/)+/, "");
    const dir = toDirectory(cleaned);
    if (dir) return dir;
  }

  return "";
};

const appendImageLink = async (content, options) => {
  const baseDir = options.baseDir || ROOT_DIR;
  const relativePath = await resolveImageLinkPath(
    baseDir,
    options.imageFilename,
    options.imageRelativePath,
    options.imageAbsolutePath
  );
  if (!relativePath) return { content, imageLink: null };

  const linkLine = `![500](${relativePath})`;
  if (content.includes(linkLine)) return { content, imageLink: relativePath };

  const stripped = content
    .split(/\r?\n/)
    .filter((line) => !/^!\[500\]\([^)]+\)\s*$/.test(line))
    .join("\n")
    .trimEnd();

  return { content: `${stripped}\n${linkLine}\n`, imageLink: relativePath };
};

const server = createServer(async (req, res) => {
  allowCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/save-ocr") {
    try {
      const body = await readJsonBody(req);
      const baseContent = body?.content;
      const filename = sanitizeFilename(body?.filename);
      const imageFilename = body?.imageFilename;
      const imageRelativePath = body?.imageRelativePath;

      if (!baseContent || typeof baseContent !== "string") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing content" }));
        return;
      }

      let imageAbsolutePath;
      if (imageFilename) {
        imageAbsolutePath = await findImagePath(imageFilename);
      }

      const targetSubdir = await deriveLogSubdir({ imageFilename, imageRelativePath, imageAbsolutePath });
      const targetDir = targetSubdir ? resolve(ROOT_DIR, targetSubdir) : ROOT_DIR;

      const { content, imageLink } = await appendImageLink(baseContent, {
        imageFilename,
        imageRelativePath,
        baseDir: targetDir,
        imageAbsolutePath
      });
      await mkdir(targetDir, { recursive: true });
      const targetPath = resolve(targetDir, filename);
      await writeFile(targetPath, content, "utf-8");

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, savedAs: targetPath, imageLink }));
      return;
    } catch (err) {
      console.error("Failed to save OCR markdown:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err?.message || "Server error" }));
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`OCR save server listening on http://localhost:${PORT}/api/save-ocr`);
  console.log(`Saving files to ${ROOT_DIR}`);
});
