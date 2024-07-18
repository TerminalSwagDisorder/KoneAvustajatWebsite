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
// Also jwt secret for possible jwt
const sessionSecret = process.env.SESSION_SECRET;
const jwtSecret = process.env.JWT_SECRET;
if (!sessionSecret) {
	console.error("Missing SESSION_SECRET environment variable. Exiting...\nHave you run env_generator.js yet?");
	process.exit(1);
}
if (!jwtSecret) {
	console.error("Missing JWT_SECRET environment variable. Exiting...\nHave you run env_generator.js yet?");
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
	name: "session-id",
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
    const numPage = parseInt(req.query.page, 10);
	const numItems = parseInt(req.query.items, 10);
	const page = isNaN(numPage) ? 1 : numPage;
	const items = isNaN(numItems) ? 100 : numItems;

	if (page <= 0) {
		return res.status(400).json({ message: "Page must be a positive integer" });
	}

	if (items <= 0) {
		return res.status(400).json({ message: "Number of items must be a positive integer" });
	}

    if (items >= 1000) {
        return res.status(400).json({ message: "Please limit items to under 1000" });
    }

	let offset = 0;
	if (page && page !== 1) {
		offset = (page - 1) * items;
	}

	if (offset < 0) {
		//return res.status(400).json({ message: "Offset cannot be below 1" });
		console.error("Offset cannot be under 0!")
	}

	// If successful, attach page and items to the req object to be used in the routes
    req.pagination = { page, items, offset };
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
	const numItems = parseInt(req.query.items, 10);
	const items = isNaN(numItems) ? 50 : numItems;
	
	if (items <= 0) {
		return res.status(400).json({ message: "Number of items cannot be below 1" });
	}

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
app.get("/api/users", routePagination, async (req, res) => {
	console.log("API users accessed")

	const { items, offset } = req.pagination;

	const sql = "SELECT * FROM users LIMIT ? OFFSET ?";
	try {
		const [users] = await promisePool.query(sql, [items, offset]);
		// Process each user to add isAdmin property
		const processedUsers = users.map(user => {
			const isAdmin = user.RoleID === 4;

			// Exclude sensitive information like hashed password
			const { Password, ...userData } = user;
			return { ...userData, isAdmin };
		});
		return res.status(200).json(processedUsers);
	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

app.get("/api/users/id", async (req, res) => {
	console.log("API search users by id accessed")

	const numId = parseInt(req.query.id, 10);
	const id = isNaN(numId) ? 1 : numId;

	const sql = "SELECT * FROM users WHERE UserID = ?";
	try {
		const [users] = await promisePool.query(sql, [id]);
		if (!users.length) {
			return res.status(404).json({ message: "User not found" });
		}

		const processedUsers = users.map(user => {
			const isAdmin = user.RoleID === 4;

			// Exclude sensitive information like hashed password
			const { Password, ...userData } = user;
			return { ...userData, isAdmin };
		});
	
		return res.status(200).json(processedUsers);
	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

// Signing up
app.post("/api/users/signup", checkRegex, async (req, res) => {
    console.log("API user signup accessed");

    const { formFields } = req.body;
	const jsonFormFields = JSON.parse(formFields)
	const { name, email, password } = jsonFormFields;

    try {
		// Check if email exists
        const emailCheckSql = "SELECT email FROM users WHERE Email = ?";
        const [user] = await promisePool.query(emailCheckSql, [email]);
        if (user.length > 0) {
            return res.status(409).json({ message: "One or more fields already in use" });
        }

		// Hash password & insert data into db
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertSql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
        const [result] = await promisePool.query(insertSql, [name, email, hashedPassword]);
        return res.status(200).json({message: "User registered successfully", id: result.insertId });

    } catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
    }
});

app.post("/api/users/login", async (req, res) => {
    console.log("API users login accessed");
    const { formFields, userType } = req.body;
	const jsonFormFields = JSON.parse(formFields)	
	
	const { email, password } = jsonFormFields;
    const sql = "SELECT * FROM users WHERE Email = ?";
    
    try {
		// [[user]] takes the first user in the array wile [user] returns the whole array and you need to specify user[0] each time otherwise
        const [[user], fields] = await promisePool.query(sql, [email]);

        if (!user) {
            return res.status(404).json({ message: "Email or password is incorrect" });
        }

		// If the email is not an exact match
		if (user.Email !== email) {
			return res.status(404).json({ message: "Email or password is incorrect" });
		}
        
        const match = await bcrypt.compare(password, user.Password);
        if (match) {
            const isAdmin = user.RoleID === 4;
			req.session.user = { ...user, isAdmin };

			/*
			// Provide an accessToken cookie
			const accessToken = jwt.sign({ user, userType }, jwtSecret, {
				expiresIn: "1h",
			});
			res.cookie("accessToken", accessToken, {
				httpOnly: true,
				sameSite: "lax",
				maxAge: 3600000
			});
            */

			return res.status(200).json({ message: "Logged in successfully", user: req.session.user });
        } else {
            return res.status(401).json({ message: "Email or password is incorrect" });
        }
    } catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
    }
});

app.post("/api/logout", (req, res) => {
    console.log("API logout accessed")
    req.session.destroy(error => {
        if (error) {
            return res.status(500).json({ message: "Could not log out, please try again" });
        } else {
            res.clearCookie("session-id")
            return res.status(200).json({ message: "Logged out successfully" });
        }
    });
}); 


// Check if the user is logged in
app.get("/api/profile", authenticateSession, (req, res) => {
	console.log("API profile accessed")
	// const userData = { userData: req.user };
	res.json({
		message: "Authenticated",
		userData: req.user,
	});
});

// Logout route (Frontend will handle removing the token with JWT)
app.post("/api/logout", (req, res) => {
	console.log("API logout accessed")
    req.session.destroy(error => {
        if (error) {
            return res.status(500).json({ message: "Could not log out, please try again" });
        } else {
            res.clearCookie("session-id")
            return res.status(200).json({ message: "Logged out successfully" });
        }
    });
});

/*
app.post("/api/logout", (req, res) => {
	console.log("API logout accessed")
	res.clearCookie("accessToken");
	res.json({ message: "Logged out successfully" });
});
*/

// Profile refresh if userdata gets updated
app.get("/api/profile/refresh", authenticateSession, async (req, res) => {
	console.log("API profile refresh accessed")
	const userId = req.user.UserID;
	const sql = "SELECT * FROM users WHERE UserID = ?";
	try {
		const [[user], fields] = await promisePool.query(sql, [userId]);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		const isAdmin = user.RoleID === 4;
		// Exclude sensitive information like hashed password before sending the user data
		const { ...userData } = user;
		return res.status(200).json( {userData: { ...userData, isAdmin: isAdmin}});

	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

// Update own user credentials
app.patch("/api/profile", authenticateSession, checkRegex, profileImgUpload.single("profileImage"), async (req, res) => {
	console.log("API update own credentials accessed");
	console.log(req.user);
	const userId = req.user.UserID;
	const { formFields } = req.body; // Updated credentials  from request body
	const jsonFormFields = JSON.parse(formFields);
	const ProfileImage = req.file; // Profile image

	try {

		const match = await bcrypt.compare(jsonFormFields.currentPassword, req.user.Password)
		if (!match) {
			return res.status(403).json({ message: "Current password is incorrect" });
		}

		let hashedPassword = null;
		const allowedFields = ["name", "email", "password", "gender", "profileImage"];

		// SQL query to update user data
		// updateQuery allows for multiple fields to be updated simultaneously
		let updateQuery = "UPDATE users SET ";
		let queryParams = [];
 
		// More dynamic way of updating users
		for (const key in jsonFormFields) {
			console.log(key)
			if (allowedFields.includes(key)) {
				if (jsonFormFields.hasOwnProperty(key)) {
					if (jsonFormFields[key] !== "") {
						updateQuery += key.charAt(0).toUpperCase() + key.slice(1) + " = ?, "; // Since the first letters are capitalized in the db
						if (key === "password") {
							// Hash the new password before storing it
							hashedPassword = await bcrypt.hash(jsonFormFields[key], 10);
							queryParams.push(hashedPassword);

						} else {	
							queryParams.push(jsonFormFields[key]);
						}
					}
				}
			}
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

		return res.status(200).json({ message: "User updated successfully" });
	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
		/*		
		const message = error.message || "Internal Server Error";
        const status = 500;
		return res.status(status).json({ message: message });
		*/
	}
});

// Route for viewing regular users
app.get("/api/part", routePagination, async (req, res) => {
	console.log("API users accessed");

	const partName = req.query.partName ? req.query.partName : "cpu"; // Get the table name from the query
	const { items, offset } = req.pagination;

	const allowedPartNames = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage"];
	if (!allowedPartNames.includes(partName) || partName === "") {
		console.error(`partName "${partName}" is not allowed!`);
		throw new Error(`partName "${partName}" is not allowed!`);
	}

	const sql = `SELECT * FROM ${partName} LIMIT ? OFFSET ?`;
	try {
		const [parts] = await promisePool.query(sql, [items, offset]);
		// Process each user to add isAdmin property

		return res.status(200).json(parts);
	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

app.get("/api/part/id", async (req, res) => {
	console.log("API search users by id accessed");

	const numId = parseInt(req.query.id, 10);
	const id = isNaN(numId) ? 1 : numId;
	const partName = req.query.partName ? req.query.partName : "cpu"; // Get the table name from the query

	const allowedPartNames = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage"];
	if (!allowedPartNames.includes(partName) || partName === "") {
		console.error(`partName "${partName}" is not allowed!`);
		throw new Error(`partName "${partName}" is not allowed!`);
	}

	const sql = `SELECT * FROM ${partName} WHERE ID = ?`;
	try {
		const [part] = await promisePool.query(sql, [id]);
		if (!part.length) {
			return res.status(404).json({ message: "Part not found" });
		}
	
		return res.status(200).json(part);
	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////



app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});