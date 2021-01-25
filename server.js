require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const ejs = require("ejs");
const passportLocalMongoose = require("passport-local-mongoose");
const socketio = require("socket.io");

const http = require("http");
const bodyParser = require("body-parser");
const { use } = require("passport");

// defining app, server and socket
const app = express();
const server = http.createServer(app);
const io = socketio(server);

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
	halls: [],
});
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model("User", userSchema);
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// defining the non passport schemas and models
const hallSchema = new mongoose.Schema({
	name: String,
	members: [],
	messages: [],
});
const Hall = mongoose.model("Hall", hallSchema);

// setting up server to listen
const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`server is live on port ${PORT}`));

// =============== routes ============================
// serving the home page
app.get("/home", (req, res) => {
	if (req.isAuthenticated()) {
		res.render("home", { user: req.user });
	} else {
		res.redirect("/login");
	}
});

// serving the hall page
app.get("/hall/:hall", (req, res) => {
	if (req.isAuthenticated()) {
		Hall.findOne({ name: req.params.hall }, (err, hall) => {
			if (!err && hall !== null) {
				res.render("hall", { hall: hall, user: req.user });
			} else {
				res.redirect("/home");
			}
		});
	} else {
		res.redirect("/login");
	}
});

// creating new hall
app
	.route("/create")
	.get((req, res) => {
		if (req.isAuthenticated()) {
			res.render("create");
		} else {
			res.redirect("/login");
		}
	})
	.post((req, res) => {
		if (req.isAuthenticated()) {
			Hall.findOne({ name: req.body.name }, (err, hall) => {
				if (!err && hall === null) {
					User.findById(req.user.id, (err, user) => {
						if (!err) {
							// creating the new hall
							user.halls.push(req.body.name);
							user.save();
							createdHall = Hall({
								name: req.body.name,
								members: [req.user.username],
							});
							createdHall.save();
							// redirecting to created hall
							res.redirect(`/hall/${req.body.name}`);
						} else {
							res.redirect("/home");
						}
					});
				} else {
					res.redirect("/home");
				}
			});
		} else {
			res.redirect("/login");
		}
	});

// joining hall
app
	.route("/join")
	.get((req, res) => {
		if (req.isAuthenticated()) {
			res.render("join");
		} else {
			res.redirect("/login");
		}
	})
	.post((req, res) => {
		if (req.isAuthenticated()) {
			Hall.findById(req.body.code, (err, hall) => {
				if (!err && hall !== null && !req.user.halls.includes(hall.name)) {
					// get user to add to hall
					User.findById(req.user.id, (err, user) => {
						if (!err && user !== null) {
							// add hall to user
							user.halls.push(hall.name);
							user.save();
							// add user to hall
							hall.members.push(user.username);
							hall.save();
							res.redirect(`/hall/${hall.name}`);
						} else {
							res.redirect("/home");
						}
					});
				} else {
					res.redirect("/home");
				}
			});
		} else {
			res.redirect("/login");
		}
	});

// register new user
app.post("/register", (req, res) => {
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
app.post("/login", (req, res) => {
	const user = new User({
		username: req.body.username,
		password: req.body.password,
	});

	req.logIn(user, (err) => {
		if (err) {
			console.log();
		} else {
			passport.authenticate("local")(req, res, () => {
				// eveything is succesfull
				res.redirect("/home");
			});
		}
	});
});
// logout
app.get("/logout", (req, res) => {
	req.logout();
	res.redirect("/");
});

// ================= socket stuff ======================
io.on("connection", (socket) => {
	socket.on("greeting", (details) => {
		socket.join(details.hall);
		// socket has joined hall
		// send recent messages to socket
		sendMessages(socket, details.hall);

		socket.on("messageSend", (message) => {
			saveMessage(message, details.hall);
			io.to(details.hall).emit("messageRecieve", message);
		});
	});
});

function sendMessages(socket, hallName) {
	Hall.findOne({ name: hallName }, (err, hall) => {
		if (!err && hall !== null) {
			socket.send("oldMessages", hall.messages);
		}
	});
}

function saveMessage(message, hallName) {
	Hall.findOne({ name: hallName }, (err, hall) => {
		if (!err && hall !== null) {
			hall.messages.push(message);
			hall.save();
			console.log(hall);
		}
	});
}
