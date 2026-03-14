const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

app.get("/thema", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "thema.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "login.html"));
});

app.get("/downloads", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "downloads.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  console.log("Login empfangen:");
  console.log("Benutzername:", username);
  console.log("Passwort:", password);

  res.send("Login-Anfrage wurde empfangen.");
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username = ?";

  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("Fehler bei der Datenbankabfrage:", err);
      return res.status(500).send("Datenbankfehler");
    }

    if (results.length === 0) {
      return res.send("Benutzer nicht gefunden.");
    }

    const user = results[0];

    if (user.password === password) {
      return res.send(`Login erfolgreich. Willkommen ${user.username}!`);
    } else {
      return res.send("Falsches Passwort.");
    }
  });
});