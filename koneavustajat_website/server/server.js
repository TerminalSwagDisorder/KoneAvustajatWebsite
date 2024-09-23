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
const { check, validationResult } = require("express-validator");
const Joi = require("joi");

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
	credentials: true // allows the Access-Control-Allow-Credentials: true header
};

app.use(cors(corsOptions));
app.use(cookieParser());

// Helmet for security
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'", "http://localhost:8080", "http://localhost:3000"],
				scriptSrc: ["'self'", "'unsafe-inline'", "http://localhost:3000"]
				// imgSrc: ["'self'", "data:"], // If we need image uploading
			}
		},
		frameguard: {
			action: "deny"
		},
		crossOriginEmbedderPolicy: false
	})
);
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
app.use(
	session({
		name: "session-id",
		secret: sessionSecret,
		resave: false,
		saveUninitialized: false, // Can be useful, creates a cookie even when user is not logged in to track behaviour. This can be taxing though.
		cookie: { httpOnly: true, sameSite: "lax", maxAge: 3600000 }
	})
);

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
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		const extension = path.extname(file.originalname);
		cb(null, "ProfileImage" + "-" + uniqueSuffix + extension);
	}
});

const profileImgUpload = multer({ storage: storage, fileFilter: imageFileFilter });
const otherFileUpload = multer({ storage: storage });

const paginationSchema = Joi.object({
	page: Joi.number().min(1).default(1),
	items: Joi.number().min(1).max(1000).default(100),
});

// Middleware for pagination
const routePagination = (req, res, next) => {
	const validationResult = paginationSchema.validate({page: req.query.page, items: req.query.items});

	if (validationResult.error) {
		return res.status(400).json({ message: validationResult.error.details[0].message });
	}

	const { page, items } = validationResult.value;

	let offset = 0;
	if (page && page !== 1) {
		offset = (page - 1) * items;
	}

	if (offset < 0) {
		//return res.status(400).json({ message: "Offset cannot be below 1" });
		console.error("Offset cannot be under 0!");
	}

	// If successful, attach page and items to the req object to be used in the routes
	req.pagination = { page, items, offset };
	next();
};

const queryValidationRules = [
	check("ID").optional().isNumeric().withMessage("ID must be a number"),
	check("Url").optional().isURL().withMessage("Url must be a valid URL"),
	check("Price").optional().isNumeric().withMessage("Price must be a number"),
	check("Name").optional().isString().withMessage("Name must be a string"),
	check("strict").optional().isBoolean().withMessage("strict must be true or false")
];

// Joi schemas
const partSchema = Joi.object({
	id: Joi.number().optional(),
	url: Joi.string().uri().optional(),
	price: Joi.number().optional(),
	pricerange: Joi.string().trim()
		.pattern(/^\d+-\d+$/)
		.optional()
		.messages({
			"string.pattern.base": "Invalid range format format. Range must include number hyphen (-) number.",
		}),
	pricemin: Joi.number().optional(),
	pricemax: Joi.number().optional(),
	name: Joi.string().trim().optional(),
	manufacturer: Joi.string().trim().optional(),
	image: Joi.string().optional(),
	image_Url: Joi.string().uri().optional(),
	chassis_type: Joi.string().trim().optional(),
	dimensions: Joi.string().trim().optional(),
	color: Joi.string().trim().optional(),
	compatibility: Joi.string().trim().optional(),
	cooling_Potential: Joi.string().trim().optional(),
	fan_RPM: Joi.number().optional(),
	noise_Level: Joi.string().trim().optional(),
	cores: Joi.number().optional(),
	core_Clock: Joi.string().trim().optional(),
	memory: Joi.string().trim().optional(),
	interface: Joi.string().trim().optional(),
	tdp: Joi.string().trim().optional(),
	type: Joi.string().trim().optional(),
	amount: Joi.number().optional(),
	speed: Joi.string().trim().optional(),
	latency: Joi.string().trim().optional(),
	chipset: Joi.string().trim().optional(),
	form_Factor: Joi.string().trim().optional(),
	memory_Compatibility: Joi.string().trim().optional(),
	is_atx12v: Joi.string().trim().optional(),
	efficiency: Joi.string().trim().optional(),
	modular: Joi.string().trim().optional(),
	capacity: Joi.string().trim().optional(),
	cache: Joi.string().trim().optional(),
	flash: Joi.string().trim().optional(),
	tbw: Joi.string().trim().optional(),
	core_Count: Joi.number().optional(),
	thread_Count: Joi.number().optional(),
	base_Clock: Joi.string().trim().optional(),
	socket: Joi.string().trim().optional(),
	cpu_cooler: Joi.string().trim().optional(),
	integrated_gpu: Joi.string().trim().optional(),
	strict: Joi.boolean().optional(),
	inverted: Joi.boolean().optional()
});


const idSchema = Joi.object({
	id: Joi.number().min(1).default(1),
});

const partNameSchema = Joi.string()
	.valid("chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage")
	.default("cpu");

const tableNameSchema = Joi.string()
	.valid("chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "addresses", "address_types", "admins", "customers", "orders", "order_types", "part_inventory", "part_types", "users")
	.default("cpu");

const userFieldsSchema = Joi.string()
	.valid("name", "email", "password", "currentPassword", "gender", "profileImage");

const loginSchema = Joi.object({
	email: Joi.string().trim()
		.required()
		.email()
		.messages({
			"string.email": "Invalid email format. Please enter a valid email address in the format: example@domain.com",
			"string.empty": "Email cannot be empty",
			"any.required": "Email is required"
		}),
	password: Joi.string().trim()
		.required()
		.pattern(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{9,}$/)
		.messages({
			"string.pattern.base": "Invalid password format. Password must be at least 9 characters long, include 1 capital letter, and 1 number.",
			"string.empty": "Password cannot be empty",
			"any.required": "Password is required"
		})
});

const userSchema = Joi.object({
	name: Joi.string().trim().min(3).max(50).required().messages({
		"string.base": "Name must be a string",
		"string.empty": "Name cannot be empty",
		"string.min": "Name must be at least 3 characters long",
		"string.max": "Name cannot exceed 50 characters",
		"any.required": "Name is required"
	}),
	email: Joi.string().trim()
		.required()
		.email() // Built in regex
		.messages({
			"string.email": "Invalid email format. Please enter a valid email address in the format: example@domain.com",
			"string.empty": "Email cannot be empty",
			"any.required": "Email is required"
		}),
	password: Joi.string().trim()
		.required()
		.pattern(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{9,}$/)
		.messages({
			"string.pattern.base": "Invalid password format. Password must be at least 9 characters long, include 1 capital letter, and 1 number.",
			"string.empty": "Password cannot be empty",
			"any.required": "Password is required"
		})
});

const userUpdateSchema = Joi.object({
	name: Joi.string().trim().min(3).max(50).optional().messages({
		"string.base": "Name must be a string",
		"string.empty": "Name cannot be empty",
		"string.min": "Name must be at least 3 characters long",
		"string.max": "Name cannot exceed 50 characters"
	}),
	email: Joi.string().trim()
		.email()
		.optional()
		.messages({
			"string.email": "Invalid email format. Please enter a valid email address in the format: example@domain.com",
			"string.empty": "Email cannot be empty"
		}),
	password: Joi.string().trim()
		.pattern(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{9,}$/)
		.optional()
		.messages({
			"string.pattern.base": "Invalid password format. Password must be at least 9 characters long, include 1 capital letter, and 1 number.",
			"string.empty": "Password cannot be empty",
			"any.required": "Password is required"
		}),
	currentPassword: Joi.string().trim()
		.pattern(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{9,}$/)
		.required()
		.messages({
			"string.pattern.base": "Invalid password format. Password must be at least 9 characters long, include 1 capital letter, and 1 number.",
			"string.empty": "Password cannot be empty",
			"any.required": "Password is required"
		}),
	gender: Joi.string().trim().valid("male", "female").optional().messages({
		"string.base": "Gender must be a string",
		"any.only": "Gender must be one of either 'male' or 'female'"
	}),
	profileImage: Joi.string().trim()
		.optional()
		.messages({
			"string.base": "Profile image must be a valid filename",
		})
});

const inventorySchema = Joi.object({
	partid: Joi.number().optional(),
	parttypeid: Joi.number().optional(),
	modelnumber: Joi.string().trim().optional(),
	serialnumber: Joi.string().trim().optional(),
	available: Joi.number().optional(),
	dateadded: Joi.string().trim().optional(),
	additionaldetails: Joi.string().trim().optional(),
	price: Joi.number().optional(),
	pricerange: Joi.string().trim()
		.pattern(/^\d+-\d+$/)
		.optional()
		.messages({
			"string.pattern.base": "Invalid range format format. Range must include number hyphen (-) number.",
		}),
	availablerange: Joi.string().trim()
		.pattern(/^\d+-\d+$/)
		.optional()
		.messages({
			"string.pattern.base": "Invalid range format format. Range must include number hyphen (-) number.",
		}),
	pricemin: Joi.number().optional(),
	availablemin: Joi.number().optional(),
	pricemax: Joi.number().optional(),
	availablemax: Joi.number().optional(),
	name: Joi.string().trim().optional(),
	manufacturer: Joi.string().trim().optional(),

});

// Validators & searches
const searchSanitization = (key, value, term) => {
	const mappedColumnNames = {
		chassis: [
			"Chassis_type",
			"Dimensions",
			"Color",
			"Compatibility"
		],
		cpu: [
			"Core_Count",
			"Thread_Count",
			"Base_Clock",
			"Cache",
			"Socket",
			"Cpu_Cooler",
			"TDP",
			"Integrated_GPU"
		],
		cpu_cooler: [
			"Compatibility",
			"Cooling_Potential",
			"Fan_RPM",
			"Noise_Level",
			"Dimensions"
		],
		gpu: [
			"Cores",
			"Core_Clock",
			"Memory",
			"Interface",
			"Dimensions",
			"TDP"
		],
		memory: [
			"Type",
			"Amount",
			"Speed",
			"Latency"
		],
		motherboard: [
			"Chipset",
			"Form_Factor",
			"Memory_Compatibility"
		],
		psu: [
			"Is_ATX12V",
			"Efficiency",
			"Modular",
			"Dimensions"
		],
		storage: [
			"Capacity",
			"Form_Factor",
			"Interface",
			"Cache",
			"Flash",
			"TBW"
		],
		inventory: [
			"PartID",
			"PartTypeID",
			"ModelNumber",
			"SerialNumber",
			"Available",
			"availableMin",
			"availableMax",
			"availableRange",
			"DateAdded",
			"AdditionalDetails"
		]

	};


	const universalPartColumns = ["ID", "Url", "Image", "Image_Url"];
	const universalColumns = ["Price", "Name", "Manufacturer", "priceMin", "priceMax", "priceRange", "strict", "inverted"];
	const tableTypeColumns = key !== "inventory" ? [...universalPartColumns, ...universalColumns] : universalColumns;

	if (value === undefined || value === null || value === "") {
		return { error: "Search cannot be empty" };
	}

	const validColumns = mappedColumnNames[key] || [];
	const allValidColumns = [...tableTypeColumns, ...validColumns];

	if (!allValidColumns || !allValidColumns.map((col) => col.toLowerCase()).includes(term)) {
		return { error: `Search for '${term}' is not allowed in part '${key}'!` };
	}
	
	try {
		const currentSchema = key !== "inventory" ? partSchema : inventorySchema;
		const validationResult = Joi.attempt({ [term]: value }, currentSchema);
		return validationResult[term];
	} catch (error) {
		return { error: error.details[0].message };
	}
};

const tableSearch = (searchContext = "cpu") => { // Default value if not defined
	return (req, res, next) => {
		let searchTerms = {};
		const partName = req.query.partName || searchContext;

		for (let term in req.query) {
			const excludedParams = ["items", "page", "partName"];
			if (!excludedParams.includes(term)) {
				let value = req.query[term];

				// Add more sanitization based on the search context
				value = searchSanitization(partName.toLowerCase(), value.toLowerCase(), term.toLowerCase());
				if (value.error) {
					console.error(value.error);
					return res.status(400).json({ message: value.error });
				}
				searchTerms[term] = value;
				console.log(searchTerms);
			}
		}

		// If successful, attach searchTerms to the req object to be used in the routes
		req.searchTerms = searchTerms;
		next();
	};
};

const userValidator = (schema) => {
	return (req, res, next) => {
		let { formFields } = req.body;
		
		if (typeof formFields === "string") {
			try {
				formFields = JSON.parse(formFields);
			} catch (error) {
				return res.status(400).json({ message: "Invalid form data format" });
			}
		}

		try {
			const value = Joi.attempt(formFields, schema);
			req.body = value;
			next();
		} catch (error) {
			return res.status(400).json({ message: error.details[0].message });
		}
	};
};

const userFieldsValidator = (req, res, next) => {
	let { formFields } = req.body;

	if (typeof formFields === "string") {
		try {
			formFields = JSON.parse(formFields);
		} catch (error) {
			return res.status(400).json({ message: "Invalid form data format" });
		}
	}

	try {
		for (const item in formFields) {
			Joi.attempt(item, userFieldsSchema);
		}
		next();
	} catch (error) {
		return res.status(400).json({ message: `User field '${error._original}' is not allowed!` });
	}
};

const idValidator = (req, res, next) => {
	try {
		const value = Joi.attempt({ id: req.query.id }, idSchema);
		req.query.id = value.id;
		next();
	} catch (error) {
		return res.status(400).json({ message: error.details[0].message });
	}
};

const tableValidator = (schema, queryName) => {
	return (req, res, next) => {
		try {
			const value = Joi.attempt(req.query[queryName], schema);
			req.query[queryName] = value;
			next();
		} catch (error) {
			return res.status(400).json({ message: error.details[0].message });
		}
	};
};

// Middleware for regex validation, kind of unnecessary with joi
const checkRegex = (req, res, next) => {
	const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{9,}$/; // At least 1 upper character, at least 1 digit/number, at least 9 chars long
	const emailRegex =
		/^[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?$/; // Email according to the RFC 5322 standard

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
		return res.status(400).json({
			message: "Invalid email format. Please enter a valid email address in the format: example@domain.com"
		});
	}

	// Validate password
	if (typeof password !== "undefined" && password !== "" && !passwordRegex.test(password)) {
		return res.status(400).json({
			message:
				"Invalid password format. Password must be at least 9 characters long, include 1 capital letter, and 1 number."
		});
	}

	next();
};

const getAllRoutes = (app) => {
	return app._router.stack
		.filter((r) => r.route && r.route.path) // Filter out non-route handlers
		.map((r) => {
			return {
				method: Object.keys(r.route.methods)[0].toUpperCase(),
				path: r.route.path
			};
		});
};

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

// Server routes
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

app.get("/", async (req, res) => {
	console.log("Index accessed");
	const routes = getAllRoutes(app);
	let links = routes
		.filter((route) => route.method === "GET")
		.map((route) => `<li style="list-style-type: none;"><a style="color: blue;" href="${route.path}">${route.path}</a></li>`)
		.join("");

	const html = `
		<html style="background-color: #121212;">
			<head>
				<title>Server Routes</title>
			</head>
			<body>
				<br></br>
				<ul>${links}</ul>
			</body>
		</html>
	`;

	return res.status(200).send(html);
});

// User routes

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
// MySQL & Express session

// Route for frontend pagination in MySQL
app.get("/api/count", routePagination, tableValidator(tableNameSchema, "tableName"), async (req, res) => {
	console.log("MySQL pagination accessed");

	const tableName = req.query.tableName; // Get the table name from the query
	const { items } = req.pagination;

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

app.get("/api/routes", async (req, res) => {
	console.log("API routes accessed");
	const getRoutesArray = [];
	const postRoutesArray = [];
	const otherRoutesArray = [];
	try {
		const routes = getAllRoutes(app);

		for (const route of routes) {
			if (route.method === "GET") {
				getRoutesArray.push(route);
			} else if (route.method === "POST") {
				postRoutesArray.push(route);
			} else {
				otherRoutesArray.push(route);
			}
		}

		const routeObj = { getRoutes: getRoutesArray, postRoutes: postRoutesArray, otherRoutes: otherRoutesArray };
		return res.status(200).json(routeObj);
	} catch (error) {
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

// Route for viewing regular users
app.get("/api/users", routePagination, async (req, res) => {
	console.log("API users accessed");

	const { items, offset } = req.pagination;

	const sql = "SELECT * FROM users LIMIT ? OFFSET ?";
	try {
		const [users] = await promisePool.query(sql, [items, offset]);
		// Process each user to add isAdmin property
		const processedUsers = users.map((user) => {
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

app.get("/api/users/id", idValidator, async (req, res) => {
	console.log("API search users by id accessed");

	const id = req.query.id;

	const sql = "SELECT * FROM users WHERE UserID = ?";
	try {
		const [users] = await promisePool.query(sql, [id]);
		if (!users.length) {
			return res.status(404).json({ message: "User not found" });
		}

		const processedUsers = users.map((user) => {
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
app.post("/api/users/signup", userValidator(userSchema), userFieldsValidator, async (req, res) => {
	console.log("API user signup accessed");

	const { formFields } = req.body;
	const jsonFormFields = JSON.parse(formFields);
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
		return res.status(200).json({ message: "User registered successfully", id: result.insertId });
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

app.post("/api/users/login", userValidator(loginSchema), userFieldsValidator, async (req, res) => {
	console.log("API users login accessed");
	const { formFields, userType } = req.body;
	const jsonFormFields = JSON.parse(formFields);

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
	console.log("API logout accessed");
	req.session.destroy((error) => {
		if (error) {
			return res.status(500).json({ message: "Could not log out, please try again" });
		} else {
			res.clearCookie("session-id");
			return res.status(200).json({ message: "Logged out successfully" });
		}
	});
});

// Check if the user is logged in
app.get("/api/profile", authenticateSession, (req, res) => {
	console.log("API profile accessed");
	// const userData = { userData: req.user };
	res.json({
		message: "Authenticated",
		userData: req.user
	});
});

// Logout route (Frontend will handle removing the token with JWT)
app.post("/api/logout", (req, res) => {
	console.log("API logout accessed");
	req.session.destroy((error) => {
		if (error) {
			return res.status(500).json({ message: "Could not log out, please try again" });
		} else {
			res.clearCookie("session-id");
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
	console.log("API profile refresh accessed");
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
		return res.status(200).json({ userData: { ...userData, isAdmin: isAdmin } });
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

// Update own user credentials
app.patch( "/api/profile", authenticateSession, userValidator(userUpdateSchema), userFieldsValidator, profileImgUpload.single("profileImage"), async (req, res) => {
		console.log("API update own credentials accessed");
		console.log(req.user);
		const userId = req.user.UserID;
		const { formFields } = req.body; // Updated credentials  from request body
		const jsonFormFields = JSON.parse(formFields);
		const ProfileImage = req.file; // Profile image

		try {
			const match = await bcrypt.compare(jsonFormFields.currentPassword, req.user.Password);
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
				console.log(key);
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
	}
);

// Route for viewing parts
app.get("/api/part", routePagination, tableValidator(partNameSchema, "partName"), tableSearch(), async (req, res) => {
	console.log("API parts accessed");

	const partName = req.query.partName; // Get the table name from the query
	const { items, offset } = req.pagination;
	const searchTerms = req.searchTerms;
	let sql;
	let notOperator = "";
	let sqlParams = [];

	let searchQuery = " WHERE 1=1";

	if (searchTerms.priceMin) {
		searchQuery += " AND Price >= ?";
		sqlParams.push(searchTerms.priceMin);
	}
	if (searchTerms.priceMax) {
		searchQuery += " AND Price <= ?";
		sqlParams.push(searchTerms.priceMax);
	}

	if (searchTerms.priceRange) {
		const [minPrice, maxPrice] = searchTerms.priceRange.split("-");
		searchQuery += " AND Price BETWEEN ? AND ?";
		sqlParams.push(minPrice, maxPrice);
	}
	
	if (searchTerms.inverted) {
		notOperator = searchTerms.strict === true ? "!=" : "NOT ";
	}

	const ignoreColumns = ["strict", "priceMin", "priceMax", "priceRange", "inverted"];
	if (searchTerms.priceMin || searchTerms.priceMax || searchTerms.priceRange) {
		ignoreColumns.push("price");
	}
	for (let [column, value] of Object.entries(searchTerms)) {
		if (!ignoreColumns.includes(column)) {
			if (searchTerms.strict && searchTerms.strict === true) {
				searchQuery += ` AND ${column} ${notOperator}= ?`;
			} else {
				value = `%${value}%`;
				searchQuery += ` AND ${column} ${notOperator}LIKE ?`;
			}
			sqlParams.push(value); // Push values to sqlParams array
		}
	}

	sql = `SELECT * FROM ${partName} ${searchQuery} LIMIT ? OFFSET ?`;
	sqlParams.push(items, offset); // Push pagination params after search params

	try {
		const [parts] = await promisePool.query(sql, sqlParams);
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

app.get("/api/part/id", tableValidator(partNameSchema, "partName"), idValidator, async (req, res) => {
	console.log("API search parts by id accessed");

	const id = req.query.id;
	const partName = req.query.partName; // Get the table name from the query

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

// Route for viewing inventory
app.get("/api/inventory", routePagination, tableSearch("inventory"), async (req, res) => {
	console.log("API inventory accessed");

	const { items, offset } = req.pagination;
	const searchTerms = req.searchTerms;
	let sql;
	let notOperator = "";
	let sqlParams = [];

	let searchQuery = " WHERE 1=1";

	if (searchTerms.priceMin) {
		searchQuery += " AND Price >= ?";
		sqlParams.push(searchTerms.priceMin);
	}

	if (searchTerms.priceMax) {
		searchQuery += " AND Price <= ?";
		sqlParams.push(searchTerms.priceMax);
	}

	if (searchTerms.priceRange) {
		const [minPrice, maxPrice] = searchTerms.priceRange.split("-");
		searchQuery += " AND Price BETWEEN ? AND ?";
		sqlParams.push(minPrice, maxPrice);
	}

	if (searchTerms.availableMin) {
		searchQuery += " AND Available >= ?";
		sqlParams.push(searchTerms.availableMin);
	}

	if (searchTerms.availableMax) {
		searchQuery += " AND Available <= ?";
		sqlParams.push(searchTerms.availableMax);
	}

	if (searchTerms.availableRange) {
		const [minAvailable, maxAvailable] = searchTerms.availableRange.split("-");
		searchQuery += " AND Available BETWEEN ? AND ?";
		sqlParams.push(minAvailable, maxAvailable);
	}

	if (searchTerms.inverted) {
		notOperator = searchTerms.strict === true ? "!=" : "NOT ";
	}

	const ignoreColumns = ["strict", "priceMin", "priceMax", "priceRange", "inverted", "availableMin", "availableMax", "availableRange"];
	if (searchTerms.priceMin || searchTerms.priceMax || searchTerms.priceRange) {
		ignoreColumns.push("price");
	}
	for (let [column, value] of Object.entries(searchTerms)) {
		if (!ignoreColumns.includes(column)) {
			if (searchTerms.strict && searchTerms.strict === true) {
				searchQuery += ` AND ${column} ${notOperator}= ?`;
			} else {
				value = `%${value}%`;
				searchQuery += ` AND ${column} ${notOperator}LIKE ?`;
			}
			sqlParams.push(value); // Push values to sqlParams array
		}
	}

	sql = `SELECT * FROM part_inventory ${searchQuery} LIMIT ? OFFSET ?`;
	sqlParams.push(items, offset); // Push pagination params after search params

	try {
		const [partInventory] = await promisePool.query(sql, sqlParams);

		// AdditionalDetails needs to be parsed
		const parseInventory = partInventory.map((item) => ({
			...item,
			AdditionalDetails: item.AdditionalDetails ? JSON.parse(item.AdditionalDetails) : null
		}));

		// Process each user to add isAdmin property

		return res.status(200).json(parseInventory);
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

app.get("/api/inventory/id", idValidator, async (req, res) => {
	console.log("API search parts by id accessed");

	const id = req.query.id;

	const sql = "SELECT * FROM part_inventory WHERE PartID = ?";
	try {
		const [partInventory] = await promisePool.query(sql, [id]);
		if (!partInventory.length) {
			return res.status(404).json({ message: "Inventory item not found" });
		}

		// AdditionalDetails needs to be parsed
		const parseInventory = partInventory.map((item) => ({
			...item,
			AdditionalDetails: item.AdditionalDetails ? JSON.parse(item.AdditionalDetails) : null
		}));

		return res.status(200).json(parseInventory);
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

// Route for viewing orders
app.get("/api/orders", routePagination, async (req, res) => {
	console.log("API inventory accessed");

	const { items, offset } = req.pagination;

	const sql = "SELECT * FROM orders LIMIT ? OFFSET ?";
	try {
		const [orders] = await promisePool.query(sql, [items, offset]);

		// Items needs to be parsed
		const parseInventory = orders.map((item) => ({
			...item,
			Items: item.Items ? JSON.parse(item.Items) : null
		}));

		return res.status(200).json(parseInventory);
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

app.get("/api/orders/id", idValidator, async (req, res) => {
	console.log("API search parts by id accessed");

	const id = req.query.id;

	const sql = "SELECT * FROM orders WHERE PartID = ?";
	try {
		const [orders] = await promisePool.query(sql, [id]);
		if (!orders.length) {
			return res.status(404).json({ message: "Order not found" });
		}

		// Items needs to be parsed
		const parseInventory = orders.map((item) => ({
			...item,
			Items: item.Items ? JSON.parse(item.Items) : null
		}));

		return res.status(200).json(parseInventory);
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

// Route for viewing customers
app.get("/api/users/customers", routePagination, async (req, res) => {
	console.log("API inventory accessed");

	const { items, offset } = req.pagination;

	const sql = `SELECT c.*, u.*, a.* FROM customers c JOIN users u ON c.UserID = u.UserID JOIN addresses a ON c.CustomerID = a.CustomerID LIMIT ? OFFSET ?`;
	try {
		const [customers] = await promisePool.query(sql, [items, offset]);

		// Separate userdata from customer data
		const parseCustomers = customers.map((item) => {
			const {
				Name,
				Gender,
				ProfileImage,
				RoleID,
				Email,
				Password,
				AddressID,
				AddressTypeID,
				Street,
				City,
				State,
				PostalCode,
				Country,
				...customerData
			} = item;
			return {
				...customerData,
				UserData: { Name, Gender, ProfileImage, RoleID, Email, Password },
				AddressData: { AddressID, AddressTypeID, Street, City, State, PostalCode, Country }
			};
		});

		// More manual way to do this
		/*
		const parseCustomers = customers.map(item => ({
			CustomerID: item.CustomerID,
			UserID: item.UserID,
			UserData: {
				Name: item.Name,
				Gender: item.Gender,
				ProfileImage: item.ProfileImage,
				RoleID: item.RoleID,
				Email: item.Email,
				Password: item.Password
			}
		}));
		*/

		return res.status(200).json(parseCustomers);
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

app.get("/api/users/customers/id", idValidator, async (req, res) => {
	console.log("API search parts by id accessed");

	const id = req.query.id;

	const sql = `SELECT c.*, u.*, a.* FROM customers c JOIN users u ON c.UserID = u.UserID JOIN addresses a ON c.CustomerID = a.CustomerID WHERE c.CustomerID = ? `;
	try {
		const [customers] = await promisePool.query(sql, [id]);
		if (!customers.length) {
			return res.status(404).json({ message: "Customer not found" });
		}

		const parseCustomers = customers.map((item) => {
			const {
				Name,
				Gender,
				ProfileImage,
				RoleID,
				Email,
				Password,
				AddressID,
				AddressTypeID,
				Street,
				City,
				State,
				PostalCode,
				Country,
				...customerData
			} = item;
			return {
				...customerData,
				UserData: { Name, Gender, ProfileImage, RoleID, Email, Password },
				AddressData: { AddressID, AddressTypeID, Street, City, State, PostalCode, Country }
			};
		});

		return res.status(200).json(parseCustomers);
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

// Route for viewing addresses
app.get("/api/users/customers/addresses", routePagination, async (req, res) => {
	console.log("API inventory accessed");

	const { items, offset } = req.pagination;

	const sql = "SELECT * FROM addresses LIMIT ? OFFSET ?";
	try {
		const [addresses] = await promisePool.query(sql, [items, offset]);

		return res.status(200).json(addresses);
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

app.get("/api/users/customers/addresses/id", idValidator, async (req, res) => {
	console.log("API search parts by id accessed");

	const id = req.query.id;

	const sql = "SELECT * FROM addresses WHERE AddressID = ?";
	try {
		const [addresses] = await promisePool.query(sql, [id]);
		if (!addresses.length) {
			return res.status(404).json({ message: "Order not found" });
		}

		return res.status(200).json(addresses);
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
