const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/vacation";



async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  await Listing.deleteMany({});
  // Correct object spread and assignment
  const updatedData = initData.map(obj => ({ ...obj, owner: '6888d727a32218f581546c6b' }));
  console.log(" Inserting data:", updatedData);
  await Listing.insertMany(updatedData);
  console.log("data was initialized");
};
main()
  .then(() => {
    console.log("connected to DB");
    initDB();
  })
  .catch((err) => {
    console.log(err);
  });