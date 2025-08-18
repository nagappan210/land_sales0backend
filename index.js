const express = require('express');
const cors = require('cors');
const path = require("path")
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());


const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
app.use('/uploaded', express.static('uploaded'));

app.use("/webform", (req, res)=>{
  res.sendFile(path.join(__dirname, "webform.html"))
})
app.use("/response", (req, res)=>{
  res.sendFile(path.join(__dirname, "response.html"))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

