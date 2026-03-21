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

// WICHTIG: Stellt sicher, dass CSS-Dateien unter /css/style.css erreichbar sind
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
   Downloads (geschützt & korrigiertes Design)
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
        <div class="download-card">
          <div class="download-info">
            <h3>${file.title}</h3>
            <p>${file.description}</p>
          </div>
          <a href="/download/${file.id}" class="btn">Download</a>
        </div>
      `;
    });

    // Das HTML wurde hier komplett an dein neues Design angepasst
    res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Downloads - AWS Web Application</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <header>
        <h1>AWS Web Application</h1>
        <nav>
            <ul>
                <li><a href="/">Startseite</a></li>
                <li><a href="/thema">Thema</a></li>
                <li><a href="/downloads" class="active">Downloads</a></li>
                <li><a href="/login">Login</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section>
            <h2>Downloadbereich</h2>
            <p style="margin-bottom: 20px;">Eingeloggt als: <strong>${req.session.user.username}</strong></p>

            <div class="downloads-container">
                ${fileList}
            </div>

            <div style="margin-top: 30px; text-align: center;">
                <a href="/logout" class="btn" style="background-color: #d63031;">Logout</a>
            </div>
        </section>
    </main>

    <footer>
        <p>Cloud Computing Projekt</p>
    </footer>
</body>
</html>
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

/* Logout
*/

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Fehler beim Logout.");
    }
    res.redirect("/login");
  });
});

/* Server starten
*/

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});