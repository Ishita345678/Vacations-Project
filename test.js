const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema({
    title: String,
    price: Number,
    location: String
});

const Listing = mongoose.model("Listing", listingSchema);

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/vacation');
    await Listing.deleteMany({});
    await Listing.insertMany([{ title: "Mini Test", price: 123, location: "Delhi" }]);
    console.log("✅ Mini test insert done");
    mongoose.connection.close();
}

main();
