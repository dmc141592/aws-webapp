const express = require("express");
const path = require("path");
const db = require("./db");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "mySecretKey",
    resave: false,
    saveUninitialized: false,
  })
);

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
  if (!req.session.user) {
    return res.redirect("/login");
  }

  res.sendFile(path.join(__dirname, "public", "html", "downloads.html"));
});

app.get("/profile", (req, res) => {
  if (!req.session.user) {
    return res.send("Nicht eingeloggt");
  }

  res.send(`Eingeloggt als ${req.session.user.username} mit Rolle ${req.session.user.role}`);
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Fehler beim Logout.");
    }

    res.send("Erfolgreich ausgeloggt.");
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username = ?";

  db.query(sql, [username], async (err, results) => {
    if (err) {
      console.error("Fehler bei der Datenbankabfrage:", err);
      return res.status(500).send("Datenbankfehler");
    }

    if (results.length === 0) {
      return res.send("Benutzer nicht gefunden.");
    }

    const user = results[0];

    try {
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        req.session.user = {
          id: user.id,
          username: user.username,
          role: user.role,
        };

        return res.send(`Login erfolgreich. Willkommen ${user.username}!`);
      } else {
        return res.send("Falsches Passwort.");
      }
    } catch (error) {
      console.error("Fehler beim Passwortvergleich:", error);
      return res.status(500).send("Serverfehler");
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});