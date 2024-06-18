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
const axios = require("axios");

// User authentication exports
const jwt = require("jsonwebtoken");
const session = require("express-session");

// Database connection exports
const mysql = require("mysql2");

// Environment file
require("dotenv").config();

// Session secret for express session
const sessionSecret = process.env.SESSION_SECRET;
const jwtSecret = process.env.JWT_SECRET;
const apiEndpoint = process.env.API_ENDPOINT;
if (!sessionSecret) {
	console.error("Missing SESSION_SECRET environment variable. Exiting...\nHave you run env_generator.js yet?");
	process.exit(1);
}
if (!jwtSecret) {
	console.error("Missing JWT_SECRET environment variable. Exiting...\nHave you run env_generator.js yet?");
	process.exit(1);
}
if (!apiEndpoint) {
	console.error("Missing API_ENDPOINT environment variable. Exiting...\nHave you run env_generator.js yet?");
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


// Check the health status of the API
const checkApiHealth = async () => {
	let statusMessage;
	try {
		// Known good endpoint
		const response = await axios.get(`${apiEndpoint}users?page=1&items=1`);

		if (!response.headers["x-total-count"] || response.headers["x-total-count"] === "undefined") {
			// If the response was successful, but has no x-total-count header. This means the API is outdated.	
			statusMessage = `Connection to API server established, but there was an error. Have you updated the API?: {Upgrade Required: 426}`;
			console.log(statusMessage)

			return { status: 426, statusText: "Upgrade Required", statusMessage };
		}
		
		if (response.data.length === 0 || response.headers["x-total-count"] === "0") {
			// If the response was successful, but there is no data.	
			statusMessage = `Connection to API server established, but no data exists: {Not Found: 404}`;
			console.log(statusMessage)

			return { status: 404, statusText: "Not Found", statusMessage };
		}

		// If successful
		statusMessage = `Connection to API server established: {${response.statusText}: ${response.status}}`;
		console.log(statusMessage)
		
		return { status: response.status, statusText: response.statusText, statusMessage };


	} catch (error) {
		// For different http errors
		if (error.response) {
			statusMessage = `Connection to API server established, but there was an error: {${error.response.statusText}: ${error.response.status}}`;
		} else if (error.request) {
			statusMessage = "Request was made, but got no response from API";
			// console.error(`Request was made, but got no response from API: ${error.request}`);
		} else {
			statusMessage = `Something went horribly wrong: ${error.message}`;
		}

		console.log(statusMessage)
				
		return { status: error.response ? error.response?.status : 500, statusText: error.response ? error.response?.statusText : "Internal Server Error", statusMessage };
		//process.exit(1); // Exits the program if no connection could be established
	}
};

checkApiHealth();


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
// MySQL & Express session (not anymore mysql only)

// Route to check connection to the API
app.get("/api/health", async (req, res) => {
	console.log("API health accessed")
	const response = await checkApiHealth();
	try {
		// Success message & status, with defaults
		const message = response.statusMessage || response.statusText;
        const status = response.status || 500;

		return res.status(status).json({ message: message });
	} catch (error) {
		// Non-success message & status, with defaults
		const message = error.response ? error.response?.data : "Internal Server Error";
        const status = error.response ? error.response?.status : 500;
        return res.status(status).json({ message: message });
		
	}
});


// Route for frontend pagination 
app.get("/api/count", authenticateJWT, async (req, res) => {
	console.log("API pagination accessed")
	const tableName = req.query.tableName; // Get the table name from the query
	const items = parseInt(req.query.items) || 50;
	
    try {
		if ( req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		const apiRes = await axios.get(`${apiEndpoint}${tableName}`, { params: { page: 1, items } });
		const index = parseInt(apiRes.headers["x-total-pages"], 10);

		console.log(typeof(index))
        return res.status(200).json({index: index});

    } catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
    }
});

// Route for viewing regular users
app.get("/api/users", routePagination, authenticateJWT, async (req, res) => {
	console.log("API users accessed")
	const { page, items } = req.pagination;
	
    try {
		if ( req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		const apiRes = await axios.get(`${apiEndpoint}users`, { params: { page, items } });

		if (apiRes.data.length === 0) {
			return res.status(400).json({ message: "You have exceeded the amount of items" });
		}

		// Dont need to check for response code as axios hadles them automatically
        return res.status(200).json(apiRes.data);

    } catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
    }
});

// Route for viewing med users
app.get("/api/med/users", routePagination, authenticateJWT, async (req, res) => {
	console.log("API med users accessed")
	const { page, items } = req.pagination;
	
    try {
		if ( req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

        const apiRes = await axios.get(`${apiEndpoint}med/users`, { params: { page, items } });

		if (apiRes.data.length === 0) {
			return res.status(400).json({ message: "You have exceeded the amount of items" });
		}
		
		// Dont need to check for response code as axios hadles them automatically
        return res.status(200).json(apiRes.data);

    } catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
    }
});

// Get users by email
app.get("/api/users/search", authenticateJWT, async (req, res) => {
	console.log("API search users by email accessed")
	const email = req.query.email;
	console.log(email)
	
	try {
		if ( req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		const apiRes = await axios.get(`${apiEndpoint}users/search`, { params: { email } });
        const users = apiRes.data;
        if (!users) {
            return res.status(404).json({ message: "No users with that type of email found" });
        }
		console.log(users.length)
		return res.status(200).json({ users });

	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
	}
});

// Get med users by email
app.get("/api/med/users/search", authenticateJWT, async (req, res) => {
	console.log("API search med users by email accessed")
	const email = req.query.email;
	
	try {
		if ( req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		const apiRes = await axios.get(`${apiEndpoint}med/users/search`, { params: { email } });
        const users = apiRes.data;
        if (!users) {
            return res.status(404).json({ message: "No med users with that type of email found" });
        }

		return res.status(200).json({ users });

	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
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
// Apparently only med users will need signup
app.post("/api/users/signup", checkRegex, async (req, res) => {
    console.log("API user signup accessed");

    const { formFields } = req.body;
	const jsonFormFields = JSON.parse(formFields)
	const { name, email, password, phone_number, med_id, role } = jsonFormFields;
	console.log({name, email, password, phone_number, med_id, role})

    try {
		// Check if email exists
		const apiRes = await axios.get(`${apiEndpoint}users/search`, { params: { email } });
        const emailCheck = apiRes.data;
        if (emailCheck.length > 0) {
            return res.status(409).json({ message: "One or more fields already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const apiPostRes = await axios.post(`${apiEndpoint}register`, {name, email, password: hashedPassword, phone_number, med_id, role});
        return res.status(200).json({message: "User registered successfully" });

    } catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
    }
});

// Med user signup
app.post("/api/med/users/signup", checkRegex, async (req, res) => {
    console.log("API med user signup accessed");

    const { formFields } = req.body;
	const jsonFormFields = JSON.parse(formFields)
    const { name, email, password, phone_number, role, organisation } = jsonFormFields;
	console.log({ name, email, password, phone_number, role, organisation })


    try {
		// Check if email exists
		const apiRes = await axios.get(`${apiEndpoint}med/users/search`, { params: { email } });
        const emailCheck = apiRes.data;
        if (emailCheck.length > 0) {
            return res.status(409).json({ message: "One or more fields already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const apiPostRes = await axios.post(`${apiEndpoint}med/register`, {name, email, password: hashedPassword, phone_number, role, organisation});
        return res.status(200).json({message: "Med user registered successfully" });

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
	console.log(email, password)
	console.log(userType)
    try {
		if (userType === "user") {
			const apiRes = await axios.get(`${apiEndpoint}users/search`, { params: { email } });

			// If the search resulted in more (or less) than 1 user
			if (apiRes.data.length !== 1) {
				return res.status(404).json({ message: "Email or password is incorrect" });
			}
			
			const user = apiRes.data[0]; // Sadly, the search endpoint transforms the data into an array of objects
			user.userType = userType;
			
			// If the email is not an exact match
			if (!user || user.email !== email) {
				return res.status(404).json({ message: "Email or password is incorrect" });
			}

			//const match = await bcrypt.compare(password, user.password);
			const match = true; // Remember to change
			if (match) {

				// Provide an accessToken cookie
				const accessToken = jwt.sign({ user, userType }, jwtSecret, {
					expiresIn: "1h",
				});
				res.cookie("accessToken", accessToken, {
					httpOnly: true,
					sameSite: "lax",
					maxAge: 3600000
				});

				return res.status(200).json({ message: "Logged in successfully", user });
			} else {
				return res.status(401).json({ message: "password incorrect" });
			}
		} else {
			return res.status(403).json({ message: "Not authorised to login as a user" }); 
		}
    } catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
    }
});

app.post("/api/med/users/login", async (req, res) => {
    console.log("API med users login accessed");
    const { formFields, userType } = req.body;
	const jsonFormFields = JSON.parse(formFields)	
	
	const { email, password } = jsonFormFields;
	console.log(email, password)
	console.log(userType)
	try {
		if (userType === "meduser") {
			const apiRes = await axios.get(`${apiEndpoint}med/users/search`, { params: { email } });

			// If the search resulted in more (or less) than 1 user
			if (apiRes.data.length !== 1) {
				return res.status(404).json({ message: "Email or password is incorrect" });
			}
			
			const user = apiRes.data[0]; // Sadly, the search endpoint transforms the data into an array of objects
			user.userType = userType;
			
			// If the email is not an exact match
			if (!user || user.email !== email) {
				return res.status(404).json({ message: "Email or password is incorrect" });
			}

			//const match = await bcrypt.compare(password, user.password);
			const match = true; // Remember to change
			if (match) {

				// Provide an accessToken cookie
				const accessToken = jwt.sign({ user, userType }, jwtSecret, {
					expiresIn: "1h",
				});
				res.cookie("accessToken", accessToken, {
					httpOnly: true,
					sameSite: "lax",
					maxAge: 3600000
				});

				return res.status(200).json({ message: "Logged in successfully", user });
			} else {
				return res.status(401).json({ message: "password incorrect" });
			}
		} else {
			return res.status(403).json({ message: "Not authorised to login as a medical user" }); 
		}
    } catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
    }
});


//Should this part be deleted?? (because of 'api/users/login')
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

// Logout route (Frontend will handle removing the token with JWT)
app.post("/api/logout", (req, res) => {
	console.log("API logout accessed")
	res.clearCookie("accessToken");
	res.json({ message: "Logged out successfully" });
});

// Check if the user is logged in
app.get("/api/profile", authenticateJWT, (req, res) => {
	console.log("API profile accessed")
	// If we're here, the JWT was valid and `req.user` contains the payload from the JWT
	// const userData = { userData: req.user };

	res.json({ message: "Authenticated", userData: req.user });
});


// Profile refresh if userdata gets updated
app.get("/api/profile/refresh", authenticateJWT, async (req, res) => {
	console.log("API profile refresh accessed")
	const userId = req.user.user.id;
	//console.log((`${apiEndpoint}users/${userId}`))
	//console.log(req.user.user)
	try {
		let apiRes;
		if (req.user.userType === "user") {
			apiRes = await axios.get(`${apiEndpoint}users/${userId}`);
		} else if (req.user.userType === "meduser") {	
			apiRes = await axios.get(`${apiEndpoint}med/users/${userId}`);
		}

		const user = apiRes.data;
		user.userType = req.user.userType;

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		return res.status(200).json({ userData: user });
			
	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
	}
});

// Update own user credentials
app.patch("/api/profile", authenticateJWT, checkRegex, async (req, res) => {
	console.log("API update own credentials accessed")
	console.log(req.user)
	const userId = req.user.user.id;
	const currentUser = req.user.user;
	const { formFields } = req.body; // Updated credentials from request body

	try {
		//const match = await bcrypt.compare(currentPassword, req.user.password)
		const match = true; // Remember to change
		if (!match) {
			return res.status(403).json({ message: "Current password is incorrect" });
		}

		let hashedPassword = null;
		let updateQuery = {};
		const jsonFormFields = JSON.parse(formFields)
		const allowedFields = ["name","email", "password"];

		// More dynamic way of updating users
		for (const key in jsonFormFields) {
			console.log(key)
			if (allowedFields.includes(key)) {
				if (jsonFormFields.hasOwnProperty(key)) {
					if (jsonFormFields[key] !== "") {
						if (key === "password") {
							// Hash the new password before storing it
							hashedPassword = await bcrypt.hash(jsonFormFields[key], 10);
							updateQuery[key] = hashedPassword;
						} else {	
							updateQuery[key] = jsonFormFields[key];
						}
					}
				}
			}
		}

		//const apiPostRes = await axios.patch(`${apiEndpoint}users/${userId}`, updateQuery);

		let apiPostRes;
		if (req.user.userType === "user") {
			apiPostRes = await axios.patch(`${apiEndpoint}users/${userId}`, updateQuery);
		} else if (req.user.userType === "meduser") {	
			apiPostRes = await axios.patch(`${apiEndpoint}med/users/${userId}`, updateQuery);
		}

		return res.status(200).json({ message: "User updated successfully" });
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

// For admins
// Add user
app.post("/api/admin/signup", authenticateJWT, checkRegex, async (req, res) => {
    console.log("API admin user signup accessed");
    const { formFields } = req.body;

    try {
		// Only admins/medusers are allowed to update through this
		if ( req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		let postQuery = {};
		const jsonFormFields = JSON.parse(formFields)
		const allowedFields = ["name", "role", "email", "password", "med_id", "phone_number"];

		const { email } = jsonFormFields
		const apiRes = await axios.get(`${apiEndpoint}users/search`, { params: { email } });
        const emailCheck = apiRes.data;
        if (emailCheck.length > 0) {
            return res.status(409).json({ message: "Email already in use" });
        }

		// More dynamic way of updating users, used with formFields & FormData
		for (const key in jsonFormFields) {
			if (allowedFields.includes(key)) {
				if (jsonFormFields.hasOwnProperty(key)) {
					if (jsonFormFields[key] !== "") {
						if (key === "password") {
							// Hash the new password before storing it
							hashedPassword = await bcrypt.hash(jsonFormFields[key], 10);
							postQuery[key] = hashedPassword;
						} else {	
							postQuery[key] = jsonFormFields[key];
						}
					}
				}
			}
		}
		console.log(postQuery)
        const apiPostRes = await axios.post(`${apiEndpoint}register`, postQuery);
        return res.status(200).json({message: "User registered successfully" });

    } catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
    }
});

// Add meduser
app.post("/api/admin/med/signup", authenticateJWT, checkRegex, async (req, res) => {
    console.log("API admin med user signup accessed");
    const { formFields } = req.body;

    try {
		// Only admins/medusers are allowed to update through this
		if ( req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		let postQuery = {};
		const jsonFormFields = JSON.parse(formFields)
		const allowedFields = ["name", "role", "email", "password", "organisation", "phone_number"];

		const { email } = jsonFormFields
		const apiRes = await axios.get(`${apiEndpoint}med/users/search`, { params: { email } });
        const emailCheck = apiRes.data;
        if (emailCheck.length > 0) {
            return res.status(409).json({ message: "Email already in use" });
        }

		// More dynamic way of updating users, used with formFields & FormData
		for (const key in jsonFormFields) {
			if (allowedFields.includes(key)) {
				if (jsonFormFields.hasOwnProperty(key)) {
					if (jsonFormFields[key] !== "") {
						if (key === "password") {
							// Hash the new password before storing it
							hashedPassword = await bcrypt.hash(jsonFormFields[key], 10);
							postQuery[key] = hashedPassword;
						} else {	
							postQuery[key] = jsonFormFields[key];
						}
					}
				}
			}
		}

        const apiPostRes = await axios.post(`${apiEndpoint}med/register`, postQuery);
        return res.status(200).json({message: "Med user registered successfully" });

    } catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
    }
});

// Update user credentials
app.patch("/api/users/:id", authenticateJWT, checkRegex, async (req, res) => {
	console.log("API admin update credentials accessed")
	const { id } = req.params;
	const { formFields, selectedUser } = req.body; // For updating, use it dynamically like this

	try {
		// Only admins/medusers are allowed to update through this
		if (req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		let hashedPassword = null;
		let updateQuery = {};
		const jsonFormFields = JSON.parse(formFields)
		const allowedFields = ["id", "name", "role", "email", "password", "med_id", "phone_number"];

		// More dynamic way of updating users
		for (const key in jsonFormFields) {
			console.log(key)
			if (allowedFields.includes(key)) {
				if (jsonFormFields.hasOwnProperty(key)) {
					if (jsonFormFields[key] !== "") {
						if (key === "password") {
							// Hash the new password before storing it
							hashedPassword = await bcrypt.hash(jsonFormFields[key], 10);
							updateQuery[key] = hashedPassword;
						} else {	
							updateQuery[key] = jsonFormFields[key];
						}
					}
				}
			}
		}

		apiPostRes = await axios.patch(`${apiEndpoint}users/${id}`, updateQuery);

		return res.status(200).json({ message: "User updated successfully" });

	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
	}
});

// Update med user credentials
app.patch("/api/med/users/:id", authenticateJWT, checkRegex, async (req, res) => {
	console.log("API admin update med credentials accessed")
	const { id } = req.params;
	const { formFields, selectedUser } = req.body; // For updating, use it dynamically like this

	try {
		// Only admins/medusers are allowed to update through this
		if (req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		let hashedPassword = null;
		let updateQuery = {};
		const jsonFormFields = JSON.parse(formFields)
		const allowedFields = ["id", "name", "role", "email", "password", "organisation", "phone_number"];

		// More dynamic way of updating users
		for (const key in jsonFormFields) {
			console.log(key)
			if (allowedFields.includes(key)) {
				if (jsonFormFields.hasOwnProperty(key)) {
					if (jsonFormFields[key] !== "") {
						if (key === "password") {
							// Hash the new password before storing it
							hashedPassword = await bcrypt.hash(jsonFormFields[key], 10);
							updateQuery[key] = hashedPassword;
						} else {	
							updateQuery[key] = jsonFormFields[key];
						}
					}
				}
			}
		}

		apiPostRes = await axios.patch(`${apiEndpoint}med/users/${id}`, updateQuery);

		return res.status(200).json({ message: "Med user updated successfully" });

	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
	}
});

// Get user by id
app.get("/api/users/:id", authenticateJWT, async (req, res) => {
	console.log("API single user accessed")
	const { id } = req.params;
	try {
		if ( req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		const apiRes = await axios.get(`${apiEndpoint}users/${id}`);
        const user = apiRes.data;
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

		// Exclude sensitive information like hashed password, if included
		//const { password, ...userData } = user;
		//return res.status(200).json({ userData });
		return res.status(200).json({ user });

	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
	}
});

// Get med user by id
app.get("/api/med/users/:id", authenticateJWT, async (req, res) => {
	console.log("API single user accessed")
	const { id } = req.params;
	try {
		if ( req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		const apiRes = await axios.get(`${apiEndpoint}med/users/${id}`);
        const user = apiRes.data;
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

		// Exclude sensitive information like hashed password, if included
		//const { password, ...userData } = user;
		//return res.status(200).json({ userData });
		return res.status(200).json({ user });

	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
	}
});

// Get data for the dashboard
app.get("/api/admin/dashboard", authenticateJWT, async (req, res) => {
	console.log("API admin dashboard accessed")
	//const tableName = req.query.tableName; // Get the table name from the query
	const items = parseInt(req.query.items) || 50;
	
    try {
		if ( req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		const apiUsersRes = await axios.get(`${apiEndpoint}users`, { params: { page: 1, items: 1 } });
		const apiMedUsersRes = await axios.get(`${apiEndpoint}med/users`, { params: { page: 1, items: 1 } });

		const userHeaders = {...apiUsersRes.headers, type: "user" }
		const medUserHeaders = {...apiMedUsersRes.headers, type: "meduser" }

		return res.status(200).json({ userHeaders, medUserHeaders });

	} catch (error) {
        console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ message: message });
	}
});

// Get latest users
app.get("/api/admin/latest", authenticateJWT, async (req, res) => {
	console.log("API admin latest added accessed")	
    try {
		if ( req.user.userType !== "meduser") {
			return res.status(403).json({ message: "Unauthorized" });
		}

		const apiUsersRes = await axios.get(`${apiEndpoint}users`, { params: { page: 1, items: 1 } });
		const apiMedUsersRes = await axios.get(`${apiEndpoint}med/users`, { params: { page: 1, items: 1 } });
		
		const latestUser = apiUsersRes.headers["x-total-pages"]
		const latestMedUser = apiMedUsersRes.headers["x-total-pages"]

		const latestUserRes = await axios.get(`${apiEndpoint}users`, { params: { page: latestUser, items: 1 } });
		const latestMedUserRes = await axios.get(`${apiEndpoint}med/users`, { params: { page: latestMedUser, items: 1 } });
		
		user = { ...latestUserRes.data[0], userType: "user" };
		medUser = { ...latestMedUserRes.data[0], userType: "meduser" };

		return res.status(200).json({ user, medUser });

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