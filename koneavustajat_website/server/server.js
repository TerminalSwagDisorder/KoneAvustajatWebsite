// File name: server.js
// Auth: Terminal Swag Disorder
// Desc: File containing code for server-side, including express-session, jwt & mysql

// General exports
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const multer = require("multer");

// User authentication exports
const jwt = require("jsonwebtoken");
const session = require("express-session");

// Database connection exports
const mysql = require("mysql2");

// Environment file
require("dotenv").config();

// Session secret for express session
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
	console.error("Missing SESSION_SECRET environment variable. Exiting...\nHave you run env_generator.js yet?");
	process.exit(1);
}

// General setup

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

const app = express();
const port = 4000;
app.use(express.json());

// Cors options to allow the use of user cookies
const corsOptions = {
	origin: "http://localhost:3000", // replace with your applications origin
	credentials: true, // allows the Access-Control-Allow-Credentials: true header
};

app.use(cors(corsOptions));
app.use(cookieParser());

// Helmet for security
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "http://localhost:8080", "http://localhost:3000"],
			scriptSrc: ["'self'", "'unsafe-inline'", "http://localhost:3000"],
			// imgSrc: ["'self'", "data:"], // If we need image uploading
        }
    },
    frameguard: {
        action: 'deny'
    },
	crossOriginEmbedderPolicy: false
}));
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////



// Database connections

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

// MySQL
// MySQL database connection
const db = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0
});

const promisePool = db.promise();
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////



// User authentication middleware

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
// Jwt
// Middleware for checking if user is logged in
const authenticateJWT = (req, res, next) => {
	// Check if cookie exists and retrieve the value, if it does not exist set accessToken to null 
	const token = req.cookies ? req.cookies.accessToken : null;
	//console.log(req.headers)
	//console.log(token)
	if (!token) {
		return res.status(401).json({ message: "Could not verify JWT token" });

	}
	// Verify the token to the jwtSecret
	jwt.verify(token, jwtSecret, (error, user) => {
		if (error) {
			return res.status(403).json({ message: "Authentication failed" });
		}
		// If successful, set req.user to the decoded user info
		req.user = user;
		next();
	});
};

// Express-session
// Cookie settings
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false, // Can be useful, creates a cookie even when user is not logged in to track behaviour. This can be taxing though.
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 3600000 }
}));

// Middleware for checking if user is logged in
const authenticateSession = (req, res, next) => {
	//console.log(req.session)
	if (req.session.user) {
		req.user = req.session.user;
		next();
	} else {
		return res.status(401).json({
			message: "Not authenticated"
		});
	}
};
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////




// General middleware

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
// Middleware for profile images
// File filter for image validation
const imageFileFilter = (req, file, cb) => {
	const allowedFileTypes = ["image/jpeg", "image/png", "image/gif"];
	if (allowedFileTypes.includes(file.mimetype)) {
		cb(null, true); // Accept file
	} else {
		cb(new Error("Only image files are allowed!"), false); // Reject file
	}
};

// Config for multer
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "public/images");
	},
	filename: function (req, file, cb) {
		const uniqueSuffix =
			Date.now() + "-" + Math.round(Math.random() * 1e9);
		const extension = path.extname(file.originalname);
		cb(
			null,
			"ProfileImage" + "-" + uniqueSuffix + extension
		);
	},
});

const profileImgUpload = multer({ storage: storage, fileFilter: imageFileFilter });
const otherFileUpload = multer({ storage: storage });

// Middleware for pagination
const routePagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const items = parseInt(req.query.items) || 100;

    if (items >= 1000) {
        return res.status(400).json({ message: "Please limit items to under 1000" });
    }
	
	// If successful, attach page and items to the req object to be used in the routes
    req.pagination = { page, items };
    next();
}

// Middleware for regex validation
const checkRegex = (req, res, next) => {
	const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{9,}$/; // At least 1 upper character, at least 1 digit/number, at least 9 chars long
	const emailRegex = /^[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?$/; // Email according to the RFC 5322 standard

	let email;
	let password;
	const { formFields } = req.body;
    if (formFields) {
        ({ email, password } = JSON.parse(formFields));
    } else {
        ({ email, password } = req.body);
    }

	// Validate email
	if (typeof email !== "undefined" && email !== "" && !emailRegex.test(email)) {
		return res.status(400).json({ message: "Invalid email format. Please enter a valid email address in the format: example@domain.com" });
	}

	// Validate password
	if (typeof password !== "undefined" && password !== "" && !passwordRegex.test(password)) {
			return res.status(400).json({ message: "Invalid password format. Password must be at least 8 characters long, include 1 capital letter, and 1 number." });
	}


    next();
};
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////



// Server routes
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

app.get("/", async (req, res) => {
	console.log("Index accessed")
	return res.status(400).send("Index page. Navigate elsewhere.");
})


// User routes

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
// MySQL & Express session

// Route for frontend pagination in MySQL
app.get("/api/count", async (req, res) => {
	console.log("MySQL pagination accessed");
	const tableName = req.query.tableName; // Get the table name from the query
	const items = parseInt(req.query.items) || 50;

	const sql = `SELECT COUNT(*) AS total FROM ??`;
	try {
		const [result] = await promisePool.query(sql, [tableName]);
		const total = result[0].total;
		const pages = Math.ceil(total / items);

		console.log("Total pages calculated:", pages);
		return res.status(200).json({ index: pages });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal Server Error", details: error.message });
	}
});

// Route for viewing regular users
app.get("/api/users", async (req, res) => {
	const sql = "SELECT * FROM users";
	try {
		const [users] = await promisePool.query(sql);
		// Process each user to add isAdmin property
		const processedUsers = users.map(user => {
			const isAdmin = user.RoleID === 4;

			// Exclude sensitive information like hashed password
			const { Password, ...userData } = user;
			return { ...userData, isAdmin };
		});
		return res.status(200).json(processedUsers);
	} catch (err) {
		console.error(err);
		return res.status(500).send(err);
	}
});

app.get("/api/users/:id", async (req, res) => {
	const { id } = req.params;
	const sql = "SELECT * FROM users WHERE UserID = ?";
	try {
		const [users] = await promisePool.query(sql, [id]);
		if (!users.length) {
			return res.status(404).json({ message: "User not found" });
		} else {
		const processedUsers = users.map(user => {
			const isAdmin = user.RoleID === 4;

			// Exclude sensitive information like hashed password
			const { Password, ...userData } = user;
			return { ...userData, isAdmin };
		});
		return res.status(200).json(processedUsers);
		}
	} catch (err) {
		console.error(err);
		return res.status(500).send(err);
	}
});


// Signing up
app.post("/api/users/signup", async (req, res) => {
    const { Name, Email, Password } = req.body;
    console.log("server api user signup accessed");

    try {
        const emailCheckSql = "SELECT Email FROM users WHERE Email = ?";
        const [user] = await promisePool.query(emailCheckSql, [Email]);

        if (user.length > 0) {
            return res.status(409).json({ message: "Email already in use" });
        }

        const hashedPassword = await bcrypt.hash(Password, 10);
        const insertSql = "INSERT INTO users (Name, Email, Password) VALUES (?, ?, ?)";
        const [result] = await promisePool.query(insertSql, [Name, Email, hashedPassword]);
        return res.status(200).json({message: "User registered successfully", id: result.insertId });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});



app.post("/api/login", async (req, res) => {
    console.log("server api login accessed");
    const { Email, Password } = req.body;
    const sql = "SELECT * FROM users WHERE Email = ?";
    
    try {
		// [[user]] takes the first user in the array wile [user] returns the whole array and you need to specify user[0] each time otherwise
        const [[user], fields] = await promisePool.query(sql, [Email]);

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        
        const match = await bcrypt.compare(Password, user.Password);
        if (match) {
            const isAdmin = user.RoleID === 4;
			req.session.user = { ...user, isAdmin };
            
			return res.status(200).json({ message: "Logged in successfully", user: req.session.user });
        } else {
            return res.status(401).json({ message: "Password incorrect" });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).send(err);
    }
});

// Check if the user is logged in
app.get("/api/profile", authenticateSession, (req, res) => {
	console.log("server api profile accessed")
	// const userData = { userData: req.user };
	res.json({
		message: "Authenticated",
		userData: req.user,
	});
});


// Profile refresh if userdata gets updated
app.get("/api/profile/refresh", authenticateSession, async (req, res) => {
	console.log("server api profile refresh accessed")
	const userId = req.user.UserID;
	const sql = "SELECT * FROM users WHERE UserID = ?";
	try {
		const [[user], fields] = await promisePool.query(sql, [userId]);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		} else {
			const isAdmin = user.RoleID === 4;
			// Exclude sensitive information like hashed password before sending the user data
			const { ...userData } = user;
			return res.status(200).json( {userData: { ...userData, isAdmin: isAdmin}});
		}
	} catch (err) {
        console.error(err);
        return res.status(500).send(err);
	}
});

// Update own user credentials
app.patch("/api/profile", authenticateSession, profileImgUpload.single("profileImage"), async (req, res) => {
	console.log("server api update own credentials accessed")
	console.log(req.user)
	const userId = req.user.UserID;
	const { Name, Email, Password, Gender, currentPassword } = req.body; // Updated credentials from request body
	const ProfileImage = req.file; // Profile image

	try {

		const match = await bcrypt.compare(currentPassword, req.user.Password)
		if (!match) {
			return res.status(403).json({ message: "Current password is incorrect" });
		}

		let hashedPassword = null;
		if (Password) {
			// Hash the new password before storing it
			hashedPassword = await bcrypt.hash(Password, 10);
		}

		// SQL query to update user data
		// updateQuery allows for multiple fields to be updated simultaneously
		let updateQuery = "UPDATE users SET ";
		let queryParams = [];

		if (Name) {
			updateQuery += "Name = ?, ";
			queryParams.push(Name);
		}
		if (Email) {
			updateQuery += "Email = ?, ";
			queryParams.push(Email);
		}
		if (Gender) {
			updateQuery += "Gender = ?, ";
			queryParams.push(Gender);
		}
		if (hashedPassword) {
			updateQuery += "Password = ?, ";
			queryParams.push(hashedPassword);
		}
		if (ProfileImage) {
			const ProfileImage_name = ProfileImage.filename;
			updateQuery += "ProfileImage = ?, ";
			queryParams.push(ProfileImage_name);
		}

		// Remove trailing comma and space
		if (queryParams.length > 0) {
			updateQuery = updateQuery.slice(0, -2);
		}
		updateQuery += " WHERE UserID = ?";
		queryParams.push(userId);

		const [result] = await promisePool.query(updateQuery, queryParams);
		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Item not found" });
		}
		if (Name) req.user.Name = Name;
		if (Email) req.user.Email = Email;
		if (Gender) req.user.Gender = Gender;
		if (hashedPassword) req.user.Password = hashedPassword;
		if (ProfileImage) req.user.ProfileImage = ProfileImage.filename;
		console.log(req.user)
		return res.status(200).json({ message: "User updated successfully", id: this.lastID });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error" });
	}
});
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////



app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});