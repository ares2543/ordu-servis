const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Request = require("./models/Request");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://ares:B5252FLk@cluster0.vw1q6eg.mongodb.net/ordu-servis?retryWrites=true&w=majority")
.then(() => {
  console.log("MongoDB bağlandı");
})
.catch((err) => {
  console.log("MongoDB hata:", err);
});

app.get("/", (req, res) => {
  res.send("Ordu Servis API çalışıyor");
});


// TALep ekleme
app.post("/request", async (req, res) => {
  try {

    const newRequest = new Request(req.body);

    await newRequest.save();

    res.json({
      message: "Talep başarıyla kaydedildi",
      data: newRequest
    });

  } catch (error) {

    res.status(500).json({
      message: "Kayıt hatası"
    });

  }
});


// Tüm talepleri alma
app.get("/requests", async (req, res) => {
  try {

    const requests = await Request.find();

    res.json(requests);

  } catch (error) {

    res.status(500).json({
      message: "Veriler alınamadı"
    });

  }
});


app.listen(3000, () => {
  console.log("Server çalışıyor: http://localhost:3000");
});