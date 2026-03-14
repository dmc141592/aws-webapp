const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Mysql123!",
  database: "aws_webapp"
});

db.connect((err) => {
  if (err) {
    console.error("Fehler bei der Verbindung zur Datenbank:", err.message);
    return;
  }

  console.log("Mit MySQL verbunden.");
});

module.exports = db;