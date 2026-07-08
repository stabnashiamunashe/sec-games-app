import tls from "node:tls";
import fs from "node:fs";

const HOST = "worldcup26.ir";
const PORT = 443;
const OUT_DIR = "C:\\certs";
const OUT_FILE = `${OUT_DIR}\\worldcup26-chain.pem`;

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function toPem(cert) {
  const b64 = cert.raw
    .toString("base64")
    .match(/.{1,64}/g)
    .join("\n");
  return `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----\n`;
}

const socket = tls.connect(
  PORT,
  HOST,
  { rejectUnauthorized: false, servername: HOST },
  () => {
    const leaf = socket.getPeerCertificate(true);

    // Walk the full chain, dedupe by fingerprint, collect PEMs
    const seen = new Set();
    const pems = [];
    let current = leaf;
    let depth = 0;

    while (current && depth < 6) {
      const fp = current.fingerprint256;
      if (seen.has(fp)) break;
      seen.add(fp);

      const isSelfSigned = current.subject?.CN === current.issuer?.CN;
      console.log(
        `[depth ${depth}] Subject=${current.subject?.CN}  Issuer=${current.issuer?.CN}  SelfSigned=${isSelfSigned}`,
      );

      pems.push(toPem(current));

      if (current.issuerCertificate && current.issuerCertificate !== current) {
        current = current.issuerCertificate;
      } else {
        current = null;
      }
      depth++;
    }

    fs.writeFileSync(OUT_FILE, pems.join("\n"));
    console.log(`\nWrote ${pems.length} cert(s) to ${OUT_FILE}`);

    socket.end();
    process.exit(0);
  },
);

socket.on("error", (err) => {
  console.error("TLS connection failed:", err.message);
  process.exit(1);
});
