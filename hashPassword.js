/*const bcrypt = require("bcrypt");

const password = "admin123";
const saltRounds = 10;


bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error(err);
    return;
  }

  console.log("Hash:", hash);
});*/

import bcrypt from "bcrypt";

async function createHashes() {
  const gastPasswort = "gast1234";
  const benutzerPasswort = "user1234";

  const gastHash = await bcrypt.hash(gastPasswort, 10);
  const benutzerHash = await bcrypt.hash(benutzerPasswort, 10);

  console.log("Gast Hash:", gastHash);
  console.log("Benutzer Hash:", benutzerHash);
}

createHashes();