const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  phone: String,
  district: String,
  school: String,
  homeAddress: String,
  fromAddress: String,
  toAddress: String,
  status: {
    type: String,
    default: "Beklemede"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Request", RequestSchema);