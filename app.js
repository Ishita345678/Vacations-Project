require('dotenv').config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError= require('./utils/ExpressError.js');
const wrapAsync =require("./utils/WrapAsync.js");
const Review=require("./models/review");
const session=require("express-session");

const MongoStore=require("connect-mongo");

const flash = require("connect-flash");
// Set up EJS with ejs-mate
app.engine("ejs", ejsMate);
const passport=require("passport");
const localStrategy=require("passport-local");
const User=require("./models/user.js");
const userRouter = require("./routes/user.js");
const { isLoggedIn, validateListing, validateReview } = require("./middleware.js");
app.use(express.static(path.join(__dirname, "public")));

//const MONGO_URL = "mongodb://127.0.0.1:27017/vacation";
const dbURL = process.env.ATLASDB_URL;

const store = MongoStore.create({
  mongoUrl: dbURL,
  crypto: {
    secret: process.env.secret,
  },
  touchAfter: 24 * 3600,
});

store.on("error", (error) => {
  console.log("Error in mongo session store", error);
});
const sessionOptions = {
  secret: process.env.secret,
  resave: false,
  saveUninitialized: true,
  store: store
};

app.use(session(sessionOptions));
app.use(flash());
// Flash middleware to make messages available in all templates
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});





//passport login
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware to make currentUser available to all templates
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});
main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbURL);
};

app.get("/demouser", async(req,res)=>{
  let fakeUser=new User({
    email:"dummy@gmail.com",
    username:"dummyUser"
  });

  let registeredUser=await User.register(fakeUser, "helloWorld");
  res.send(registeredUser);
});



app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  next();
});

//Index Route
app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  console.log("All listings:", allListings);
  allListings.forEach((listing, index) => {
    console.log(`Listing ${index} image:`, listing.image);
  });
  res.render("listings/index.ejs", { allListings });
});

//New Route
app.get("/listings/new", isLoggedIn, async(req,res)=>{
  res.render("listings/new.ejs");
});

//Show Route
app.get("/listings/:id", async (req, res) => {
  let { id } = req.params;
   const listing = await Listing.findById(id)
  .populate({ path: "reviews", populate: { path: "author" } })
  .populate("owner");
  console.log("Listing:", listing);
  console.log("Listing image URL:", listing.image);
  if (listing && listing.reviews) {
    console.log("Reviews:", listing.reviews);
    listing.reviews.forEach((review, index) => {
      console.log(`Review ${index}:`, review);
      console.log(`Review ${index} author:`, review.author);
    });
  }
  res.render("listings/show.ejs", { listing });
});

//Create Route
app.post("/listings", isLoggedIn, validateListing, async (req, res, next) => {
  try {
    const { listing } = req.body;
    
    // Debug: Log the incoming data
    console.log("Incoming listing data:", listing);
    console.log("Image URL:", listing.image);
    
    // Basic validation - check for empty required fields
    if (!listing.title || !listing.description || !listing.price || !listing.location || !listing.country) {
      console.log("Validation failed - missing required fields");
      return res.redirect("/listings/new");
    }
    
    const newListing = new Listing(listing);
    console.log("New listing object:", newListing);
    console.log("User:", req.user);
    newListing.owner = req.user._id;
    await newListing.save();
    console.log("Saved listing:", newListing);
    req.flash("success", "New listing created!");
    res.redirect("/listings");
  } catch(err) {
    console.log("Error creating listing:", err);
    next(err);
  }
});
  
  
 
  

//Edit Route
app.get("/listings/:id/edit", isLoggedIn, async (req, res, next) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to edit this listing!");
    return res.redirect(`/listings/${id}`);
  }
  res.render("listings/edit.ejs", { listing });
});

//Update Route
app.put("/listings/:id", isLoggedIn, async (req, res, next) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to update this listing!");
    return res.redirect(`/listings/${id}`);
  }
  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  req.flash("success", "Listing updated successfully!");
  res.redirect(`/listings/${id}`);
});

//Delete Route
app.delete("/listings/:id", isLoggedIn, async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to delete this listing!");
    return res.redirect(`/listings/${id}`);
  }
  console.log("DELETE route - Attempting to delete listing with ID:", id);
  try {
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log("Deleted listing:", deletedListing);
    req.flash("success", "Listing deleted successfully!");
    res.redirect("/listings");
  } catch (error) {
    console.log("Error deleting listing:", error);
    res.status(500).send("Error deleting listing");
  }
});

//review form submission
app.post("/listings/:id/reviews", isLoggedIn, validateReview, async (req, res, next) => {
  try {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    
    if (!listing) {
      return res.status(404).send("Listing not found");
    }
    
    console.log("Creating review with data:", req.body.review);
    console.log("Current user:", req.user);
    
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    console.log("New review before save:", newReview);
    
    await newReview.save();
    console.log("New review after save:", newReview);
    
    listing.reviews.push(newReview);
    await listing.save();
    
    res.redirect(`/listings/${id}`);
  } catch (err) {
    console.log("Error creating review:", err);
    next(err);
  }
});

//delete review route
app.delete("/listings/:id/reviews/:review_id", wrapAsync(async (req, res) => {
  const { id, review_id } = req.params;
  await Review.findByIdAndDelete(review_id);
  // Optionally remove reference from listing
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: review_id } });
  res.redirect(`/listings/${id}`);
}));



// User routes
app.use("/", userRouter);

app.all("*",(req, res, next)=>{
  next(new ExpressError(404,"Page not found!"))
})

app.use((err,req,res,next)=>{
  let{statusCode=500, message="Something went wrong!"}=err;
  res.status(statusCode).send(message);//status is a keyword in js so we use statuscode
})
// app.get("/testListing", async (req, res) => {
//   let sampleListing = new Listing({
//     title: "My New Villa",
//     description: "By the beach",
//     price: 1200,
//     location: "Calangute, Goa",
//     country: "India",
//   });

//   await sampleListing.save();
//   console.log("sample was saved");
//   res.send("successful testing");
// });
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server is listening to port ${PORT}`);
});