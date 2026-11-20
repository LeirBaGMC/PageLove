import { readObject, writeObject } from "./manus-storage.mjs";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { countries } from "../src/data.js";
import { editorial } from "../src/editorial.js";
const path = resolve(process.env.CATALOG_FILE || "storage/catalog.json");
let busy = false;
function remote() {
  return Boolean(
    process.env.MANUS_API_URL ||
    process.env.MANUS_API_KEY ||
    process.env.MENTATLAS_HOSTED,
  );
}
async function read() {
  let raw;
  let etag = null,
    missing = false;
  if (remote()) {
    const object = await readObject();
    etag = object.etag;
    missing = object.raw === null;
    raw = object.raw ?? JSON.stringify({ countries, editorial });
  } else
    try {
      raw = await readFile(path, "utf8");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      raw = JSON.stringify({ countries, editorial });
    }
  return {
    ...JSON.parse(raw),
    etag,
    missing,
    sha: createHash("sha256").update(raw).digest("hex"),
  };
}
export async function catalog(req, res, next) {
  if (req.url?.split("?")[0] !== "/api/catalog") return next();
  function reply(status, data) {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  }
  const editable =
    Boolean(process.env.EDITOR_KEY) && process.env.PRESENTATION_MODE !== "1";
  let locked = false;
  try {
    if (req.method === "GET")
      return reply(200, { ...(await read()), editable });
    if (
      req.method !== "PUT" ||
      !editable ||
      req.headers.authorization !== "Bearer " + process.env.EDITOR_KEY
    )
      return reply(403, { error: "Edición desactivada o clave incorrecta." });
    let raw = "";
    for await (const chunk of req) {
      raw += chunk.toString("latin1");
      if (raw.length > 1000000)
        return reply(413, { error: "Catálogo demasiado grande." });
    }
    const data = JSON.parse(Buffer.from(raw, "latin1").toString("utf8"));
    if (
      !Array.isArray(data.countries) ||
      !data.countries.every(
        (c) => typeof c.name === "string" && c.policy && c.series && c.values,
      ) ||
      !Array.isArray(data.editorial?.references)
    )
      return reply(400, { error: "Formato inválido." });
    if (busy) return reply(409, { error: "Hay otra edición en curso." });
    busy = true;
    locked = true;
    const previous = await read();
    if (data.sha !== previous.sha)
      return reply(409, {
        error: "El catálogo cambió. Recarga antes de guardar.",
      });
    const body = JSON.stringify({
      countries: data.countries,
      editorial: data.editorial,
    });
    if (remote()) {
      if (!(await writeObject(body, previous)))
        return reply(409, {
          error: "Otra edición se guardó primero. Recarga antes de guardar.",
        });
    } else {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path + ".tmp", body);
      await rename(path + ".tmp", path);
    }
    reply(200, { sha: createHash("sha256").update(body).digest("hex") });
  } catch {
    reply(500, { error: "No se pudo leer o guardar el catálogo." });
  } finally {
    if (locked) busy = false;
  }
}
