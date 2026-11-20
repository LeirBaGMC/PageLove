process.env.MENTATLAS_HOSTED = "1";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { catalog } from "./catalog.mjs";
const root = resolve("dist");
const mime = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".html": "text/html; charset=utf-8",
  ".geojson": "application/geo+json",
  ".json": "application/json",
};
createServer((req, res) =>
  catalog(req, res, async () => {
    try {
      const url = new URL(req.url, "http://localhost");
      const file = resolve(
        root,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
      );
      if (!file.startsWith(root + sep)) throw Error();
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  }),
).listen(Number(process.env.PORT || 3000));
