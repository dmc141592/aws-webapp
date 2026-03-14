const express = require("express");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const db = require("./db");
const { createPresignedUrl } = require("./s3");

const app = express();
const PORT = 3000;

/* ---------------------------
   Middleware
--------------------------- */

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "mySecretKey",
    resave: false,
    saveUninitialized: false,
  })
);

/* ---------------------------
   Static Pages
--------------------------- */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

app.get("/thema", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "thema.html"));
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/downloads");
  }

  res.sendFile(path.join(__dirname, "public", "html", "login.html"));
});

/* ---------------------------
   Login
--------------------------- */

app.post("/login", (req, res) => {
  const username = req.body.username.trim();
  const password = req.body.password;

  console.log("Eingegebener Benutzername:", username);
  console.log("Formulardaten:", req.body);

  const sql = "SELECT * FROM users WHERE username = ?";

  db.query(sql, [username], async (err, results) => {
    if (err) {
      console.error("Fehler bei der Datenbankabfrage:", err);
      return res.status(500).send("Datenbankfehler");
    }

    console.log("DB Ergebnis:", results);

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

        return res.redirect("/downloads");
      } else {
        return res.send("Falsches Passwort.");
      }
    } catch (error) {
      console.error("Fehler beim Passwortvergleich:", error);
      return res.status(500).send("Serverfehler");
    }
  });
});

/* ---------------------------
   Downloads (geschützt)
--------------------------- */

app.get("/downloads", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const userRole = req.session.user.role;

  const sql = "SELECT * FROM files WHERE allowed_role = ? OR allowed_role = 'user'";

  db.query(sql, [userRole], (err, results) => {
    if (err) {
      console.error("Fehler beim Laden der Dateien:", err);
      return res.status(500).send("Datenbankfehler");
    }

    let fileList = "";

    results.forEach((file) => {
      fileList += `
        <div>
          <h3>${file.title}</h3>
          <p>${file.description}</p>
          <a href="/download/${file.id}">Download</a>
        </div>
        <hr>
      `;
    });

    res.send(`
      <h1>Downloadbereich</h1>
      <p>Eingeloggt als ${req.session.user.username}</p>

      ${fileList}

      <br>
      <a href="/logout">Logout</a>
    `);
  });
});

/*
   Einzelner Download
*/

app.get("/download/:id", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const fileId = req.params.id;
  const userRole = req.session.user.role;

  const sql = "SELECT * FROM files WHERE id = ?";

  db.query(sql, [fileId], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Datenbankfehler");
    }

    if (results.length === 0) {
      return res.status(404).send("Datei nicht gefunden.");
    }

    const file = results[0];

    if (file.allowed_role !== "user" && file.allowed_role !== userRole) {
      return res.status(403).send("Kein Zugriff auf diese Datei.");
    }

    try {
      const url = await createPresignedUrl(file.s3_key);
      res.redirect(url);
    } catch (error) {
      console.error(error);
      res.status(500).send("S3 Fehler");
    }
  });
});

/* 
   Logout
 */

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Fehler beim Logout.");
    }

    res.redirect("/login");
  });
});

/* 
   Server starten
 */

app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});