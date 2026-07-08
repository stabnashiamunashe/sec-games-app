const https = require("https");
const tls = require("tls");

const socket = tls.connect(
  443,
  "worldcup26.ir",
  { rejectUnauthorized: false },
  () => {
    const cert = socket.getPeerCertificate(true);
    console.log("Subject:", cert.subject);
    console.log("Issuer:", cert.issuer);
    console.log("Valid from:", cert.valid_from, "to", cert.valid_to);
    socket.end();
  },
);
