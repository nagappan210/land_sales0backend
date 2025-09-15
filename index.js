const express = require('express');
const cors = require('cors');
const path = require("path")
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(async (req, res, next) => {
  const endpoint = req.originalUrl;
  const data = {
    query: req.query,
    body: req.body
  };
  const dataString = JSON.stringify(data);
  const apiQuery = `INSERT INTO api_hits (hit_api,body) VALUES (?,?)`;
  await db.query(apiQuery, [endpoint, dataString]);
  next();
});

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./admin_routes/adminRoutes');
const db = require('./db');
app.use('/api/auth', authRoutes);
app.use('/admin', adminRoutes);

app.use('/uploaded', express.static('uploaded'));

app.use("/webform", (req, res) => {
  res.sendFile(path.join(__dirname, "webform.html"))
})
app.use("/profile_justify", (req, res) => {
  res.sendFile(path.join(__dirname, "profile_justify.html"))
})
app.use("/response", (req, res) => {
  res.sendFile(path.join(__dirname, "response.html"))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

