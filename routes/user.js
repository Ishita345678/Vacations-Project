const express=require("express");
const router=express.Router();
const passport = require("passport");
const User = require("../models/user.js");
const {saveRedirectUrl}=require("../middleware.js");

router.get("/login", (req,res)=>{
    res.render("users/login.ejs");
});

router.post("/login", saveRedirectUrl, passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
}), (req, res) => {
    req.flash("success", "Welcome back!");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    delete req.session.redirectUrl;
    res.redirect(redirectUrl);
});

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "Goodbye!");
        res.redirect("/listings");
    });
});

// Signup Routes
router.get("/signup", (req, res) => {
    res.render("users/signup.ejs");
});

router.post("/signup", async (req, res) => {
    try {
        let { username, email, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        
        // Automatically log in the user after successful registration
        req.login(registeredUser, (err) => {
            if (err) {
                req.flash("error", "Registration successful but login failed. Please try logging in.");
                return res.redirect("/login");
            }
            req.flash("success", "Welcome to Vacation!");
            res.redirect("/listings");
        });
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");
    }
});

module.exports=router;