const objectPath = "mentatlas/catalogo.json";

async function objectUrl(operation) {
  const { MANUS_API_URL, MANUS_API_KEY } = process.env;
  if (!MANUS_API_URL || !MANUS_API_KEY) throw Error("Storage sin configurar");
  const endpoint = new URL("/v1/storage/presign/" + operation, MANUS_API_URL);
  endpoint.searchParams.set("path", objectPath);
  const response = await fetch(endpoint, {
    headers: { Authorization: "Bearer " + MANUS_API_KEY },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Error("Error al solicitar acceso a Storage");
  const { url } = await response.json();
  if (new URL(url).protocol !== "https:") throw Error("URL firmada inválida");
  return url;
}

export async function readObject() {
  const response = await fetch(await objectUrl("get"), {
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404) return { raw: null, etag: null };
  if (!response.ok) throw Error("Lectura de Storage fallida");
  const etag = response.headers.get("etag");
  return { raw: await response.text(), etag };
}

export async function writeObject(raw, previous) {
  if (!previous.missing && !previous.etag)
    throw Error("Storage no devolvió ETag");
  const condition = previous.missing
    ? { "If-None-Match": "*" }
    : { "If-Match": previous.etag };
  const response = await fetch(await objectUrl("put"), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...condition },
    body: raw,
    signal: AbortSignal.timeout(15000),
  });
  if ([409, 412].includes(response.status)) return false;
  if (!response.ok) throw Error("Escritura en Storage fallida");
  return true;
}
