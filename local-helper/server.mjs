import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const host = "127.0.0.1";
const port = Number(process.env.IRPP_PDF_HELPER_PORT ?? 4318);
const maxWorkbookBytes = 15 * 1024 * 1024;
const scriptPath = new URL(
  "./export-pdf.ps1",
  import.meta.url,
).pathname.replace(/^\/(.:)/, "$1");

function allowedOrigin(origin) {
  if (!origin) return false;
  try {
    return ["localhost", "127.0.0.1"].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}
function sendJson(response, status, body, origin) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...(origin
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
  });
  response.end(JSON.stringify(body));
}
function runExcel(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const process = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        "-InputPath",
        inputPath,
        "-OutputPath",
        outputPath,
      ],
      { windowsHide: true },
    );
    let stderr = "";
    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    process.on("error", (error) => reject(error));
    process.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              stderr.trim() || `Excel conversion failed (exit ${code}).`,
            ),
          ),
    );
  });
}
function readRequest(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxWorkbookBytes) {
        reject(new Error("Workbook exceeds the 15 MB local limit."));
        request.destroy();
      } else chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && !allowedOrigin(origin))
    return sendJson(response, 403, {
      error: "Only localhost origins may use this helper.",
    });
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": origin ?? "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    });
    return response.end();
  }
  if (
    request.method === "GET" &&
    (request.url === "/" || request.url === "/health")
  )
    return sendJson(
      response,
      200,
      { status: "ready", host, port, endpoint: "/convert" },
      origin,
    );
  if (request.method !== "POST" || request.url !== "/convert")
    return sendJson(response, 404, { error: "Not found." }, origin);
  if (
    request.headers["content-type"] !==
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
    return sendJson(
      response,
      415,
      { error: "An XLSX workbook is required." },
      origin,
    );
  let directory;
  try {
    const workbook = await readRequest(request);
    if (workbook.subarray(0, 2).toString() !== "PK")
      throw new Error("The uploaded file is not an XLSX ZIP package.");
    directory = await mkdtemp(join(tmpdir(), "irpp-pdf-"));
    const id = randomUUID();
    const inputPath = join(directory, `${id}.xlsx`);
    const outputPath = join(directory, `${id}.pdf`);
    await writeFile(inputPath, workbook);
    await runExcel(inputPath, outputPath);
    const pdf = await readFile(outputPath);
    response.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="IRPP-Revenus-2026.pdf"',
      "Content-Length": pdf.length,
      ...(origin
        ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
        : {}),
    });
    response.end(pdf);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown conversion error.";
    const safeError =
      /class not registered|classe non enregistrée|activeX|Excel.Application/i.test(
        detail,
      )
        ? "Microsoft Excel bureau est introuvable. Installez Excel pour Windows puis relancez le service PDF local."
        : "Impossible de convertir le classeur en PDF. Le fichier Excel n’a pas été modifié.";
    console.error(`[IRPP PDF helper] ${detail}`);
    if (!response.headersSent)
      sendJson(response, 500, { error: safeError }, origin);
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}).listen(port, host, () =>
  console.log(`IRPP PDF helper listening on http://${host}:${port}`),
);
