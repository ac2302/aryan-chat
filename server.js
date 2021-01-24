require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const ejs = require("ejs");
const passportLocalMongoose = require("passport-local-mongoose");

const http = require("http");
const bodyParser = require("body-parser");
const { use } = require("passport");

// defining app, server and socket
const app = express();
const server = http.createServer(app);

// middleware stuff
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// passport stuff
app.use(
	session({
		secret: process.env.SECRET,
		resave: false,
		saveUninitialized: false,
	})
);
app.use(passport.initialize());
app.use(passport.session());

// connecting to database
mongoose.connect(
	process.env.DB_STRING,
	{ useNewUrlParser: true, useUnifiedTopology: true },
	(err) => {
		if (!err) {
			console.log("connected to database");
		} else {
			console.log(err);
		}
	}
);
// fixing deprecation warning
mongoose.set("useCreateIndex", true);

// defining the schemas and models wuth passport plugin
const userSchema = new mongoose.Schema({
	email: String,
	password: String,
});
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model("User", userSchema);
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// setting up server to listen
const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`server is live on port ${PORT}`));

// =============== routes ============================
// serving the home page
app.get("/home", (req, res) => {
	if (req.isAuthenticated()) {
		res.send("user home");
	} else {
		res.redirect("/login");
	}
});

// register new user
app.post("/register", (req, res) => {
	console.log(`${req.body.username} ${req.body.password}`);
	User.register(
		{
			username: req.body.username,
		},
		req.body.password,
		(err, user) => {
			if (err) {
				console.log(err);
				res.redirect("/register");
			} else {
				passport.authenticate("local")(req, res, () => {
					// everything is succesfull
					res.redirect("/home");
				});
			}
		}
	);
});
// login old user
app.post("/login", (req, res) => {});

// ================= socket stuff ======================
