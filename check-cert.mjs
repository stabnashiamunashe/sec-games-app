import tls from "node:tls";

const socket = tls.connect(
  443,
  "worldcup26.ir",
  { rejectUnauthorized: false, servername: "worldcup26.ir" },
  () => {
    const cert = socket.getPeerCertificate(true);
    console.log("Subject:", cert.subject);
    console.log("Issuer:", cert.issuer);
    console.log("Valid from:", cert.valid_from, "to", cert.valid_to);

    // Walk up the chain to see all certs (self-signed root included)
    let current = cert;
    let depth = 0;
    while (current && depth < 5) {
      console.log(`\n--- Chain depth ${depth} ---`);
      console.log("Subject:", current.subject?.CN);
      console.log("Issuer:", current.issuer?.CN);
      if (current.issuerCertificate && current.issuerCertificate !== current) {
        current = current.issuerCertificate;
      } else {
        current = null;
      }
      depth++;
    }

    socket.end();
  },
);
