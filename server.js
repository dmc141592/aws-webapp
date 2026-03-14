const express = require("express")
const path = require("path")

const app = express()

app.use(express.static(path.join(__dirname, "public")))

app.use(express.urlencoded({ extended: true }))

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/html/index.html"))
})

app.get("/thema", (req, res) => {
    res.sendFile(path.join(__dirname, "public/html/thema.html"))
})

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/html/login.html"))
})

app.get("/downloads", (req, res) => {
    res.sendFile(path.join(__dirname, "public/html/downloads.html"))
})

app.listen(3000, () => {
    console.log("Server läuft auf http://localhost:3000")
})