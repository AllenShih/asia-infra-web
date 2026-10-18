import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { ROOT } from "./site-data.mjs";

const port = Number(process.env.PORT || 4175);
const mime = { ".css": "text/css", ".html": "text/html", ".jpg": "image/jpeg", ".js": "text/javascript", ".png": "image/png", ".xml": "application/xml" };

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  let filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (pathname.endsWith("/")) filePath = path.join(filePath, "index.html");
  fs.stat(filePath, (error, stat) => {
    if (!error && stat.isDirectory()) filePath = path.join(filePath, "index.html");
    fs.readFile(filePath, (readError, data) => {
      if (readError) response.writeHead(404).end("Not found");
      else response.writeHead(200, { "Content-Type": `${mime[path.extname(filePath)] || "application/octet-stream"}; charset=utf-8` }).end(data);
    });
  });
}).listen(port, "127.0.0.1", () => console.log(`Preview: http://127.0.0.1:${port}/`));
