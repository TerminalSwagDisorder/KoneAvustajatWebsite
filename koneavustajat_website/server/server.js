"use strict";
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
const { check, validationResult } = require("express-validator");
const Joi = require("joi");
const { Client } = require('@opensearch-project/opensearch');
const Fuse = require('fuse.js');

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
const opensearch = process.env.OPENSEARCH_URL;
if (!sessionSecret) {
	console.error("Missing SESSION_SECRET environment variable. Exiting...\nHave you run env_generator.js yet?");
	process.exit(1);
}
if (!jwtSecret) {
	console.error("Missing JWT_SECRET environment variable. Exiting...\nHave you run env_generator.js yet?");
	process.exit(1);
}
if (!opensearch) {
	console.error("Missing OPENSEARCH_URL environment variable. Exiting...\nHave you run env_generator.js yet?");
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
				defaultSrc: ["'self'", "http://localhost:8080", "http://localhost:3000", opensearch],
				scriptSrc: ["'self'", "'unsafe-inline'", "http://localhost:3000", opensearch]
				// imgSrc: ["'self'", "data:"], // If we need image uploading
			}
		},
		frameguard: {
			action: "deny"
		},
		crossOriginEmbedderPolicy: false
	})
);

// const client = new Client({ node: process.env.OPENSEARCH_URL });
const client = new Client({
    node: opensearch, 
    auth: {
        username: "admin",
        password: "Mhavurt123"
    }
});

const PARTS_INDEX = 'computer_parts';
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
// Check the health status of the API
const checkApiHealth = async () => {
	let statusMessage;
	try {
		// Known good endpoint
		const response = await axios.get(opensearch, { timeout: 5000 });

		// If successful
		statusMessage = `Connection to the opensearch instance established: {${response.statusText}: ${response.status}}`;
		console.log(statusMessage);
		
		return { status: response.status, statusText: response.statusText, statusMessage };


	} catch (error) {
		// For different http errors
		if (error.response) {
			statusMessage = `Connection to the opensearch instance established, but there was an error: {${error.response.statusText}: ${error.response.status}}`;
		} else if (error.request) {
			statusMessage = "Request was made, but got no response from the opensearch instance.\n-This might be because of the opensearch security plugin.\n--Make sure that its either configured correctly or disabled for development.";
		} else {
			statusMessage = `Something went horribly wrong: ${error.message}`;
		}

		console.log(statusMessage);
				
		return { status: error.response ? error.response?.status : 500, statusText: error.response ? error.response?.statusText : "Internal Server Error", statusMessage };
		//process.exit(1); // Exits the program if no connection could be established
	}
};

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

const opensearchSchemaBasic = Joi.object({
	method: Joi.string().trim().required().valid("create", "insert", "purge", "delete"),
	amount: Joi.string().trim().optional().valid("all", "single"),
	type: Joi.string().trim().optional().valid("index", "template", "data", "document"), 
	part: Joi.string().trim().optional().valid("chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory"),
	id: Joi.number().optional(),
});

const opensearchSchema = Joi.object({
	method: Joi.string().trim().required().valid("create", "insert", "purge", "delete"),
	amount: Joi.string()
		.trim()
		.optional()
		.valid("all", "single")
		.when("method", {
			is: Joi.valid("insert", "delete"),
			then: Joi.required()
		}),
	type: Joi.string()
		.trim()
		.optional()
		.valid("index", "template", "data", "document")
		.when("method", {
			is: Joi.valid("create", "delete"),
			then: Joi.required()
		}),
	part: Joi.string()
		.trim()
		.optional()
		.valid("chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory")
		.when("method", {
			is: Joi.valid("insert", "delete"),
			then: Joi.when("amount", {
				is: Joi.valid("single"),
				then: Joi.required()
			})
		}),
	id: Joi.number()
		.optional()
		.when("method", {
			is: "delete",
			then: Joi.when("amount", {
				is: Joi.valid("single"),
				then: Joi.required()
			})
		})
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
	strict: Joi.boolean().optional(),
	inverted: Joi.boolean().optional()

});

// Validators & searches
const searchSanitization = (key, value, term) => {
	if (value === undefined || value === null || value === "") {
		return { error: `Search for '${term}' cannot be empty` };
	}

	key = key ? key.toLowerCase() : key;
	value = value ? value.toLowerCase() : value;
	term = term ? term.toLowerCase() : term;

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
			"additionaldetails"
		],
		opensearch: [
			"method",
			"amount",
			"type",
			"part",
			"id",
		]

	};

	const universalPartColumns = ["ID", "Url", "Image", "Image_Url"];
	const universalColumns = ["Price", "Name", "Manufacturer", "priceMin", "priceMax", "priceRange", "strict", "inverted"];
	const combinedColumns = key !== "inventory" ? [...universalPartColumns, ...universalColumns] : universalColumns;
	const tableTypeColumns = key !== "opensearch" ? combinedColumns : [];

	const validColumns = mappedColumnNames[key] || [];
	const allValidColumns = [...tableTypeColumns, ...validColumns];

	if (!allValidColumns || !allValidColumns.map((col) => col.toLowerCase()).includes(term)) {
		return { error: `Search for '${term}' is not allowed in part '${key}'!` };
	}
	
	return value;

};

const tableSearch = (searchContext = "cpu") => {
	// Default value if not defined
	return (req, res, next) => {
		let searchTerms = {};
		const partName = req.query.partName ? req.query.partName : (req.query.partName = searchContext);
		for (let term in req.query) {
			const excludedParams = ["items", "page", "partName"];
			if (!excludedParams.includes(term)) {
				let value = req.query[term];

				value = searchSanitization(partName, value, term);
				if (value.error) {
					console.error(value.error);
					return res.status(400).json({ message: value.error });
				}
				searchTerms[term] = value;
			}
		}
		try {
			let currentSchema = partSchema;
			if (partName === "inventory") {
				currentSchema = inventorySchema;
			}
			if (partName === "opensearch") {
				currentSchema = opensearchSchema;
			}
			const validationResult = Joi.attempt(searchTerms, currentSchema);

			req.searchTerms = validationResult;
			next();
		} catch (error) {
			return res.status(400).json({ message: error.details[0].message });
		}
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
		.filter((r) => r.route && r.route.path)
		.map((r) => {
			return {
				method: Object.keys(r.route.methods)[0].toUpperCase(),
				path: r.route.path
			};
		});
};


// OpenSearch & related functions
const indexPartData = async (partData) => {
    try {
        const response = await client.index({
            index: PARTS_INDEX,
            body: partData,
        });
        console.log('Part data indexed:', response);
    } catch (error) {
        console.error('Error indexing part data:', error);
    }
};

const createPartIndex = async () => {
	try {
		const partTypes = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory"];
		const excludedParams = ["price", "name", "manufacturer", "id", "partid", "image", "image_url", "url", "additionaldetails", "dateadded"];
		const toParseNum = ["cores", "core_clock", "memory", "thread_count", "core_count", "tdp", "cooling_potential", "amount", "base_clock", "cache", "capacity", "wattage", "speed"];
		let sql;
		for (const part of partTypes) {
			const sql = `SELECT * FROM ${part} LIMIT 1`;
			const [[data]] = await promisePool.query(sql);

			let resObj = {
				index: part,
				body: {
					settings: {
						number_of_shards: 2,
						number_of_replicas: 1,
						analysis: {
							analyzer: {
								custom_analyzer: {
									type: "custom",
									char_filter: ["html_strip"],
									tokenizer: "standard",
									filter: ["lowercase", "stop"]
								}
							}
						}
					},
					mappings: {
						dynamic_templates: [
							{
								strings_with_custom_analyzer: {
									match_mapping_type: "string",
									mapping: {
										type: "text",
										analyzer: "custom_analyzer"
									}
								}
							}
						],
						properties: {
							price: { 
								type: "float", 
								"ignore_malformed": true 
							},
							name: {
								type: "text",
								analyzer: "custom_analyzer"
							},
							manufacturer: {
								type: "text",
								analyzer: "custom_analyzer",
								fields: {
									raw: { type: "keyword" }
								}
							}
						}
					}
				}
			};

			for (const key in data) {
				if (!excludedParams.includes(key.toLowerCase())) {
					resObj.body.mappings.properties[key.toLowerCase()] = {
						type: "text",
						analyzer: "custom_analyzer",
						fields: {
							raw: { type: "keyword" }
						}
					};
					if (toParseNum.includes(key.toLowerCase())) {
						resObj.body.mappings.properties[`${key.toLowerCase()}_parsed`] = {
							type: "float",
							"ignore_malformed": true // To handle type mismatches
						};
					}
				}
				if (key.toLowerCase() === "additionaldetails") {
					resObj.body.mappings.properties[key.toLowerCase()] = {
						type: "object",
						enabled: true,
						dynamic: "true"
					};
				}
				if (key.toLowerCase() === "dateadded") {
					resObj.body.mappings.properties[key.toLowerCase()] = {
						type: "date",
					};
				}
				if (key.toLowerCase() === "partid" || key.toLowerCase() === "id") {
					resObj.body.mappings.properties.id = {
						type: "long",
					};
				}
			}

			const response = await client.indices.create({
				index: resObj.index,
				body: resObj.body
			});

			console.log(`${part} index created:`, response);
		}
	} catch (error) {
		console.error(`Error creating index:`, error);
	}
};

const createIndexTemplate = async () => {
	try {
		const response = await client.indices.putTemplate({
			name: "parts_template",
			body: {
				order: 1,
				index_patterns: ["chassis*", "cpu*", "cpu_cooler*", "gpu*", "memory*", "motherboard*", "psu*", "storage*"],
				priority: 100,
				settings: {
					number_of_shards: 2,
					number_of_replicas: 1,
					analysis: {
						analyzer: {
							custom_analyzer: {
								type: "custom",
								char_filter: ["html_strip"],
								tokenizer: "standard",
								filter: ["lowercase", "stop"]
							}
						}
					}
				},
				mappings: {
					properties: {
						ID: { type: "integer" },
						price: { type: "float" },
						name: {
							type: "text",
							analyzer: "custom_analyzer"
						},
						manufacturer: {
							type: "text",
							analyzer: "custom_analyzer",
							fields: {
								raw: { type: "keyword" }
							}
						}
					}
				}
			}
		});
		console.log("Index template created:", response);
	} catch (error) {
		console.error("Error creating index template:", error);
	}
};


const insertToPartIndex = async (items = 250) => {
	try {
		const partTypes = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory"];
		const excludedParams = ["image", "image_url", "url"];
		const toParseNum = ["cores", "core_clock", "thread_count", "core_count", "tdp", "cooling_potential", "amount", "base_clock", "speed"];
		const toParseBytes = ["memory", "cache", "capacity"];

		for (const part of partTypes) {
			const countSql = `SELECT COUNT(*) AS total FROM ??`;
			const [[{ total }]] = await promisePool.query(countSql, part);
			const pages = Math.ceil(total / items);

			for (let page = 0; page < pages; page++) {
				const offset = page * items;

				const sql = `SELECT * FROM ${part} LIMIT ? OFFSET ?`;
				const [rows] = await promisePool.query(sql, [items, offset]);

				const bulkBody = [];
				for (const row of rows) {
					const normalizedRow = {};
					for (const key in row) {
						if (!excludedParams.includes(key.toLowerCase())) {
							normalizedRow[key.toLowerCase()] = row[key];
						}
					}
					if (normalizedRow.additionaldetails && typeof normalizedRow.additionaldetails !== "object") {
						try {
							normalizedRow.additionaldetails = JSON.parse(normalizedRow.additionaldetails);
						} catch (err) {
							console.error(`Error parsing JSON for ID ${normalizedRow.id}:`, err);
							normalizedRow.additionaldetails = {};						
						}
					}
					if (part === "cpu" || part === "gpu") {
						const calculatedPerformance = performanceCalculator(normalizedRow, part);
						normalizedRow.approximate_performance = parseFloat(calculatedPerformance);
					}
					if (part === "storage") {
						const convert = normalizedConversion(normalizedRow.capacity);
						normalizedRow.capacity = convert;
					}
					if (part === "psu") {
						const convert = wattageConversion(normalizedRow.name);
						normalizedRow.wattage = convert;
					}
					if (part === "memory") {
						const convert = extractMemorySpeed(normalizedRow.speed);
						normalizedRow.speed_parsed = convert;
					}
					for (const val of toParseNum) {
						if (normalizedRow[val] !== undefined && normalizedRow[val] !== null) {
							const parsedValue = extractFirstNumbers(normalizedRow[val]);
							normalizedRow[`${val}_parsed`] = parsedValue;
						}
					}
					for (const val of toParseBytes) {
						if (normalizedRow[val] !== undefined && normalizedRow[val] !== null) {
							const normalizedValue = normalizedConversion(normalizedRow[val]);
							if (normalizedValue && val !== "cache") normalizedRow[val] = normalizedValue;
							const parsedValue = extractByteNumbers(normalizedRow[val]);
							normalizedRow[`${val}_parsed`] = parsedValue;
						}
					}
					
					bulkBody.push({
						index: {
							_index: part,
							_id: normalizedRow.id || normalizedRow.partid
						}
					});
					bulkBody.push(normalizedRow);
				}

				const response = await client.bulk({ refresh: true, body: bulkBody });

				if (response.body.errors) {
					const failedItems = response.body.items.filter(item => item.index && item.index.error);
					console.error(`Errors occurred during bulk indexing for ${part}`, failedItems[0].index.error);
					throw new Error(`This error has caused problems: ${failedItems[0].index.error}`);
				} else {
					console.log(`Data successfully indexed to the ${part} index`);
				}
			}
		}
		console.log("All parts indexed succesfully!");
	} catch (error) {
		console.error("Error inserting data:", error);
	}
};


const insertSingleToPartIndex = async (part, data) => {
	try {
		const partTypes = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory"];
		if (!partTypes.includes(part.toLowerCase())) {
			throw new Error(`${part} is not a valid part name!`);
		}

		const normalizedRow = {};
		for (const key in data) {
			normalizedRow[key.toLowerCase()] = data[key];
		}

		const response = await client.index({
			index: part,
			body: data
		});
		console.log(`Data added to index ${part}:`, response);
	} catch (error) {
		console.error(`Error adding data to index ${part}:`, error);
	}
};

const purgePartIndices = async (confirmation) => {
	try {
		if (String(confirmation).toLowerCase() !== "true") {
			throw new Error('Confirmation required: You must provide the value "true" to purge all part indices!');
		}
		
		const partTypes = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory"];
		
		const deletePromises = partTypes.map(async (part) => {
			const response = await client.indices.delete({ index: part });
			console.log(`${part} index deleted:`, response);
			return response;
		});

		const results = await Promise.all(deletePromises);

		console.log("All part indices have been purged.");
	} catch (error) {
		console.error(`Error deleting indices:`, error);
	}
};

const deleteAllFromPartIndex = async (part) => {
	try {
		const partTypes = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory"];
		if (!partTypes.includes(part.toLowerCase())) {
			throw new Error(`${part} is not a valid part name!`);
		}

		// Delete all data from index without deleting the index
		const response = await client.delete_by_query({
			index: part,
			body: {
				query: {
					match_all: {} // This deletes all data in the index
				}
			}
		});

		console.log(`All data deleted from ${part} index:`, response);
	} catch (error) {
		console.error(`Error deleting data from index ${part}:`, error);
	}
};

const deleteSingleFromPartIndex = async (part, dataId) => {
	try {
		const partTypes = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory"];
		if (!partTypes.includes(part.toLowerCase())) {
			throw new Error(`${part} is not a valid part name!`);
		}

		const response = await client.delete({
			index: part,
			id: dataId
		});

		console.log(`Data with ID ${dataId} deleted from index ${part}:`, response);
	} catch (error) {
		console.error(`Error deleting data from index ${part}:`, error);
	}
};

const viewDataInIndex = async (index) => {
	try {
		const response = await client.search({
			index: index,
			body: {
				size: 5,
				query: {
					match_all: {}
				}
			}
		});
		console.log("Data in index:", response.body.hits.hits.length);
		return response.body.hits.hits;
	} catch (error) {
		console.error("Error viewing data:", error);
	}
};
const searchInIndex = async (index, query) => {
	try {
		const response = await client.search({
			index,
			body: {
				query: {
					bool: {
						must: [
							{ range: { price: { gte: query } } } // Price range
						]
					}
				}
			}
		});
		return response;
	} catch (error) {
		console.error("Error during search:", error);
	}
};

const searchWithFilters = async (index) => {
	try {
		const response = await client.search({
			index,
			body: {
				query: {
					bool: {
						must: [
							{ match: { manufacturer: "AMD" } },
							{ range: { price: { gte: 100, lte: 500 } } }
						]
					}
				}
			}
		});
		console.log(response.hits.hits);
		return response.hits.hits;
	} catch (error) {
		console.error("Error during filtered search:", error);
	}
};

const fullTextSearch = async (index, searchTerm) => {
	try {
		const response = await client.search({
			index,
			body: {
				query: {
					match: {
						description: searchTerm
					}
				}
			}
		});
		console.log(response.hits.hits);
		return response.hits.hits;
	} catch (error) {
		console.error("Error during full-text search:", error);
	}
};


const wizardSearch = async (index, query) => {
	try {
		const response = await client.search({
			index,
			body: query
		});
		return response;
	} catch (error) {
		console.error("Error during search:", error);
	}
};

const extractFirstNumbers = (num) => {
	if (!num) {
		return null;
	}
	let removeDdr = num.replace(/ddr(\d)?(-)?/i, "");

	const match = removeDdr.match(/((\d+)([\.\,]\d+)?)/i);
	if (!match) {
		return null;
	}
	const number = match[0].replace(",", ".");
	return parseFloat(number, 10);

};

const extractByteNumbers = (num) => {
	if (!num) {
		return null;
	}
	let removeDdr = num.replace(/ddr(\d)?(-)?/i, "");
	const byteMatch = removeDdr.match(/(\d+(\.\d+)?)(\s*(t\s?b|t\s?t|g\s?b|g\s?t|m\s?b|m\s?t|k\s?b|k\s?t|m\s+|k\s+))/i);
	if (byteMatch) {
		const number = parseFloat(byteMatch[1]);
		const unit = String(byteMatch[4]).trim().toLowerCase();
		if (unit.match(/(t\s?b|t\s?t)/i)) {
			return parseFloat(number * 1024000, 10);
		}
		else if (unit.match(/(g\s?b|g\s?t)/i)) {
			return parseFloat(number * 1024, 10);
		}
		else if (unit.match(/(k\s?b|k\s?t)/i)) {
			return parseFloat(number / 1024, 10);
		}
		else {
			return parseFloat(number, 10);
		}
	}

	const match = removeDdr.match(/(\d+)/i);
	if (!match) {
		return null;
	}
	return parseFloat(match[0], 10);

};

const normalizedConversion = (value) => {
	if (!value) {
		return null;
	}
	const match = value.match(/(\d+(\.\d+)?)(\s*)(tb|tt|gb|mt|mb|gt|kb|kt)/i);
	if (!match) {
		return null;
	}
	const number = parseFloat(match[1]);
	const unit = match[4].toLowerCase();
	if (unit == "tb" || unit == "tt") {
		return String(number * 1024) + "GB";
	}
	else if (unit == "mb" || unit == "mt") {
		return String(number / 1024) + "GB";
	}
	else if (unit == "kb" || unit == "kt") {
		return String(number / 1024000) + "GB";
	}
	else {
		return String(number) + "GB";
	}

};

const wattageConversion = (value) => {
	if (!value) {
		return null;
	}
	const match = value.match(/(\d+)\s*w/i);
	if (!match) {
		return null;
	}
	const number = parseFloat(match[0]);
	return number;

};

const extractNumber = (str) => {
	let match = str.match(/\d+(\.\d+)?/i);
	if (!match) {
		return null;
	}
	return parseFloat(match[0], 10);
};

const extractMemorySpeed = (value) => {
	if (!value) {
		return null;
	}
	let match = value.match(/\d{3,5}/i);
	if (!match) {
		return null;
	}
	return parseFloat(match[0], 10);
};

const extractMemory = (num) => {
	if (!num) {
		return null;
	}
	let findDdr = num.match(/(ddr\d+)/i);
	if (!findDdr) {
		return "";
	}
	return String(findDdr[0].toLowerCase());
};

const performanceCalculator = (part, partType = null) => {
	if (partType === "cpu") {
		let coreCount = extractFirstNumbers(part.core_count);
		let baseClock = extractFirstNumbers(part.base_clock);
		let cache = extractByteNumbers(part.cache);
    	let cpuPerformance = (((coreCount * 2) + (baseClock * 1.5) + (cache / 2)) / 3);

    	return cpuPerformance;
		
	}
	if (partType === "gpu") {
		let gpuCores = extractFirstNumbers(part.cores);
		let gpuClock = extractFirstNumbers(part.core_clock);
		let memory = extractByteNumbers(part.memory);
    	let gpuPerformance = ((((gpuCores * 2) + (gpuClock * 1.5) + (memory / 2)) / 3) / 100);

    	return gpuPerformance;
		
	}
	return 0;
};

const getIndexDocumentCount = async () => {
    const countResponse = await client.count({ index: 'motherboard' });
    return countResponse.body.count;
};

const getUniqueCpuCompatibilities = async () => {
	try {
		let totalDocs = await getIndexDocumentCount();
		if (totalDocs > 1000) {
			totalDocs = 1000;
		}

		const response = await client.search({
			index: "motherboard",
			size: 0,
			body: {
				aggs: {
					unique_sockets: {
						terms: {
							field: "cpu_compatibility.raw",
							size: totalDocs 
						}
					}
				}
			}
		});

		const uniqueSockets = response.body.aggregations.unique_sockets.buckets.map((bucket) => bucket.key);
		return uniqueSockets;
	} catch (error) {
		console.error("Error fetching unique CPU compatibilities:", error);
		return [];
	}
};

const getMemoryCompatibilityBySocket = async (compatibleSockets) => {
	try {
		const response = await client.search({
			index: "motherboard",
			size: 0,
			body: {
				query: {
					match: {
						cpu_compatibility: compatibleSockets.toString().replace(/,/g, " ")
					}
				},
				aggs: {
					unique_memory_types: {
						terms: {
							field: "memory_compatibility.raw",
							size: 100
						}
					}
				}
			}
		});

		// Extract the memory types from the aggregation results
		const memoryTypes = response.body.aggregations.unique_memory_types.buckets.map((bucket) => bucket.key);

		return memoryTypes;
	} catch (error) {
		console.error("Error retrieving memory compatibility:", error);
		return [];
	}
};

const buildWizardQuery = async (queryBody, partType, formFields, compatibleSockets) => {
	let scoring = {
		// out of 100
		cpu: 20,
		gpu: 20,
		cpu_cooler: 5,
		motherboard: 15,
		memory: 10,
		chassis: 10,
		psu: 10,
		storage: 10
	};

	let prices = {
		cpu: 0,
		gpu: 0,
		cpu_cooler: 0,
		motherboard: 0,
		memory: 0,
		chassis: 0,
		psu: 0,
		storage: 0
	};

	let functionScore = [];

	let psuEfficiencyBoost = 2;
	for (const [key, value] of Object.entries(formFields)) {
		if (value !== "noPreference") {
			if (key === "useCase") {
				if (value === "generalUse") {
					if (partType === "cpu") {
						queryBody.bool.must_not.push({
							multi_match: {
								query: "epyc threadripper xeon",
								fields: ["name"], 
								fuzziness: "AUTO",
							}
						});
					}
					if (partType === "gpu") {
						queryBody.bool.must_not.push({
							match_phrase: {
								name: "radeon pro"
							}
						});
						queryBody.bool.must_not.push({
							multi_match: {
								query: "quadro",
								fields: ["name"], 
								fuzziness: "AUTO"
							}
						});
					}
					if (partType !== "gpu" && partType !== "cpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "pro professional",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 0.3
							}
						});
					}
				}
				if (value === "gaming") {
					scoring.cpu = 25;
					scoring.gpu = 25;
					scoring.memory = 12;
					scoring.motherboard = 10;
					scoring.chassis = 5;
					scoring.psu = 8;
					if (partType === "cpu") {
						queryBody.bool.must_not.push({
							multi_match: {
								query: "epyc threadripper xeon",
								fields: ["name"], 
								fuzziness: "AUTO",
							}
						});
					}
					if (partType === "gpu") {
						queryBody.bool.must_not.push({
							match_phrase: {
								name: "radeon pro"
							}
						});
						queryBody.bool.must_not.push({
							multi_match: {
								query: "quadro",
								fields: ["name"], 
								fuzziness: "AUTO"
							}
						});
					}
					if (partType !== "gpu" && partType !== "cpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "pro professional",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 0.3
							}
						});
					}
				}
				if (value === "work") {
					scoring.cpu = 25;
					scoring.gpu = 15;
					if (partType === "cpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "epyc threadripper xeon",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 0.5
							}
						});
					}
					if (partType === "gpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "quadro pro",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 0.5
							}
						});
					}
					if (partType !== "gpu" && partType !== "cpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "pro professional",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 0.5
							}
						});
					}
				}
				if (value === "streaming") {
					scoring.cpu = 25;
					scoring.gpu = 15;
					scoring.memory = 15;
					scoring.chassis = 5;
					if (partType === "cpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "epyc threadripper xeon",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 0.65
							}
						});
					}
					if (partType === "gpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "quadro pro",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 0.65
							}
						});

					}
					if (partType !== "gpu" && partType !== "cpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "pro professional",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 0.65
							}
						});
					}
				}
				if (value === "editing") {
					scoring.cpu = 24;
					scoring.gpu = 24;
					scoring.memory = 15;
					scoring.chassis = 5;
					scoring.motherboard = 10;
					scoring.psu = 7;
					if (partType === "cpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "epyc threadripper xeon",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 1
							}
						});
					}
					if (partType === "gpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "radeon pro",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 1,
								operator: "and"
							}
						});
						queryBody.bool.should.push({
							multi_match: {
								query: "quadro",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 1
							}
						});
					}
					if (partType !== "gpu" && partType !== "cpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "pro professional",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 1
							}
						});
					}
				}
				if (value === "workstation") {
					scoring.cpu = 25;
					scoring.gpu = 25;
					scoring.chassis = 5;
					scoring.motherboard = 10;
					if (partType === "cpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "epyc threadripper xeon",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 1.25
							}
						});
					}
					if (partType === "gpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "radeon pro",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 1.25,
								operator: "and"
							}
						});
						queryBody.bool.should.push({
							multi_match: {
								query: "quadro",
								fields: ["name"], 
								boost: 1.25,
								fuzziness: "AUTO"
							}
						});
					if (partType !== "gpu" && partType !== "cpu") {
						queryBody.bool.should.push({
							multi_match: {
								query: "pro professional",
								fields: ["name"], 
								fuzziness: "AUTO",
								boost: 1.25
							}
						});
					}
					}
				}
			}

			if (key === "performancePreference") {
				if (partType === "gpu") {
					if (value === "maxGpu") {
						functionScore.push({
							"field_value_factor": {
								"field": "approximate_performance",
								"factor": 0.5,
								"modifier": "square",
								"missing": 1
							}
						});
						scoring.gpu = scoring.gpu + 7;
						scoring.cpu = scoring.cpu - 1;
						scoring.cpu_cooler = scoring.cpu_cooler - 1;
						scoring.motherboard = scoring.motherboard - 1;
						scoring.memory = scoring.memory - 1;
						scoring.chassis = scoring.chassis - 1;
						scoring.psu = scoring.psu - 1;
						scoring.storage = scoring.storage - 1;
					} else {
						functionScore.push({
							"field_value_factor": {
								"field": "approximate_performance",
								"factor": 0.25,
								"modifier": "square",
								"missing": 1
							}
						});
					}
				}
				if (partType === "cpu") {
					if (value === "maxCpu") {
						
					functionScore.push({
						"field_value_factor": {
							"field": "approximate_performance",
							"factor": 0.5,
							"modifier": "square",
							"missing": 1
						}
					});
					scoring.cpu = scoring.cpu + 7;
					scoring.gpu = scoring.gpu - 1;
					scoring.cpu_cooler = scoring.cpu_cooler - 1;
					scoring.motherboard = scoring.motherboard - 1;
					scoring.memory = scoring.memory - 1;
					scoring.chassis = scoring.chassis - 1;
					scoring.psu = scoring.psu - 1;
					scoring.storage = scoring.storage - 1;
					} else {
						functionScore.push({
							"field_value_factor": {
								"field": "approximate_performance",
								"factor": 0.25,
								"modifier": "square",
								"missing": 1
							}
						});
					}
				}
				if (value === "maxRamAmount" && partType === "memory") {
					functionScore.push({
						"field_value_factor": {
							"field": "amount_parsed",
							"factor": 0.5,
							"modifier": "sqrt",
							"missing": 1
						}
					});
				}
				if (value === "maxRamSpeed"  && partType === "memory") {
					functionScore.push({
						"field_value_factor": {
							"field": "speed_parsed",
							"factor": 0.5,
							"modifier": "log1p",
							"missing": 1
						}
					});
				}
				if (value === "maxEfficiency") {
					psuEfficiencyBoost += 1;
				}
			}
			// Manufacturer Preference Example
			if (key === "cpuManufacturer" && value.endsWith("Preference") && partType === "cpu") {
				let manufacturer = value.replace("Preference", ""); // Extract the manufacturer (e.g., 'amd', 'intel')
				queryBody.bool.must.push({
					multi_match: {
						query: manufacturer.toLowerCase(),
						fields: ["manufacturer"], 
						fuzziness: "AUTO",
						boost: 2
					}
				});
			}

			if ((key === "colorPreference" && value !== "other") || (key === "otherColor" && value !== "")) {
				queryBody.bool.should.push({
					multi_match: {
						query: value,
						fields: ["name", "color"], // List the fields you want to match
						fuzziness: "AUTO:2,4", // Enables fuzzy matching for typo-tolerance
						boost: 2
					}
				});
			}

			if (key === "rgbPreference") {
				if (value === "noRgb") {
					queryBody.bool.must_not.push({
						multi_match: {
							query: "rgb",
							fields: ["name", "color"], // Replace with fields relevant to your document schema
							fuzziness: 1,
							boost: 2
						}
					});
				} else {
					const boost = value === "maximumRgb" ? 3 : value === "largeRgb" ? 2 : 1;
					queryBody.bool.should.push({
						multi_match: {
							query: "rgb",
							fields: ["name", "color"], // Replace with fields relevant to your document schema
							fuzziness: 1,
							boost: 2
						}
					});
				}
			}


			if (key === "gpuManufacturer" && value.endsWith("Preference") && partType === "gpu") {
				let manufacturer;
				if (value === "nvidiaPreference") {
					manufacturer = "geforce quadro nvidia";
				}
				if (value === "amdPreference") {
					manufacturer = "radeon amd";
				}
				if (value === "intelPreference") {
					manufacturer = "intel arc";
				}
				queryBody.bool.must.push({
					multi_match: {
						query: manufacturer.toLowerCase(),
						fields: ["manufacturer", "name"], 
						fuzziness: "AUTO",
						boost: 2 // Check what lower boost does
					}
				});
			}
			
			if (key === "psuBias" && partType === "psu") {
				if (value === "bestEfficiency") {
					psuEfficiencyBoost += 1;
				}
				if (value === "highWattage") {
					functionScore.push({
						"field_value_factor": {
							"field": "wattage",
							"factor": 0.5,
							"modifier": "log1p",
							"missing": 1
						}
					});
				}
			}

			if (key === "storageBias" && partType === "storage") {
				// "onlyM2" preference
				if (value === "onlyM2") {
					queryBody.bool.must.push({
						multi_match: {
							query: "nvme pcie",
							fields: ["interface"],
							fuzziness: "AUTO",
							boost: 2
						}
					});
					queryBody.bool.must.push({
						multi_match: {
							query: "2280 m.2",
							fields: ["form_factor"],
							fuzziness: "AUTO",
							boost: 2
						}
					});
				}

				// "onlySsd" preference
				if (value === "onlySsd") {
					queryBody.bool.must.push({
						multi_match: {
							query: "nvme pcie sata",
							fields: ["interface"],
							fuzziness: "AUTO",
							boost: 2
						}
					});
					queryBody.bool.must.push({
						multi_match: {
							query: "2280 m.2 2.5",
							fields: ["form_factor"],
							fuzziness: "AUTO",
							boost: 2
						}
					});
					queryBody.bool.must_not.push({
						multi_match: {
							query: "3.5 sas",
							fields: ["form_factor"],
							fuzziness: "AUTO",
							boost: 2
						}
					});
				}

				// "bootSsd" preference
				if (value === "bootSsd") {
					queryBody.bool.must.push({
						multi_match: {
							query: "nvme pcie sata",
							fields: ["interface"],
							fuzziness: "AUTO",
							boost: 2
						}
					});
					queryBody.bool.must.push({
						multi_match: {
							query: "2280 m.2 2.5",
							fields: ["form_factor"],
							fuzziness: "AUTO",
							boost: 2
						}
					});
					queryBody.bool.should.push({
						match: {
							"form_factor": "3.5"
						}
					});
				}

				// "onlyHdd" preference
				if (value === "onlyHdd") {
					queryBody.bool.must.push({
						multi_match: {
							query: "sata",
							fields: ["interface"],
							fuzziness: "AUTO",
							boost: 2
						}
					});
					queryBody.bool.must.push({
						multi_match: {
							query: "3.5",
							fields: ["form_factor"],
							fuzziness: "AUTO",
							boost: 2
						}
					});
				}
			}
		}
	}

	if (partType === "cpu" && compatibleSockets.length > 0) {
		queryBody.bool.should.push({
			multi_match: {
				query: compatibleSockets.toString().replace(/,/g, " "),
				fields: ["socket"], 
				fuzziness: "AUTO:5,8",
				boost: 5,
			}
		});
	}

	if (psuEfficiencyBoost > 2 && partType === "psu") {
        const efficiencyLevels = [
            { level: "Titanium", weight: 2.5 },
            { level: "Platinum", weight: 2.25 },
            { level: "Gold", weight: 2 },
            { level: "Silver", weight: 1.75 },
            { level: "Bronze", weight: 1.5 },
            { level: "80", weight: 1 },
        ];

		queryBody.bool.should.push({
			multi_match: {
					query: "Bronze Silver Gold Platinum Titanium",
					fields: ["efficiency", "name"],
					fuzziness: "AUTO",
					boost: psuEfficiencyBoost
				}
			
		});

	}

	for (let key in prices) {
		if (key === partType) {
			prices[key] = scoring[key] * (0.01 * formFields.price);
			queryBody.bool.must.push({
				range: {
					price: { lte: prices[key]},
				}
			});
			functionScore.push({
				"field_value_factor": {
					"field": "price",
					"factor": 0.02,
					"modifier": "square",
					"missing": 1
				}
			});
		}
	}

	if (functionScore.length > 0) {
		queryBody = {
			"function_score": {
				"query": queryBody, // Base query
				"functions": functionScore, // Add the boost functions here
				"boost_mode": "multiply", // Multiply the original score with the boost
				"score_mode": "sum" // Sum up the function scores
			}
		};
	}

	// Return the built query
	return { queryBody: queryBody, prices: prices, scoring: scoring };
};

const getMaxValue = (data, key) => {
	if (!data) {
		return null;
	}
	if (!key) {
		return null;
	}

	const value = data
		.map((d) => d[key])
		.filter((value) => value !== undefined && value !== null)
		.reduce((max, value) => Math.max(max, value), null);

	return value;
};

const getMinValue = (data, key, maxCoolingPotential) => {
	if (!data) {
		return null;
	}
	if (!key) {
		return null;
	}

	const value = data
		.map((d) => d[key])
		.filter((value) => value !== undefined && value !== null)
		.reduce((min, value) => Math.min(min, value), maxCoolingPotential);

	return value;
};

const constraintComparator = async (queryBody, formFields, currentData, maxScores, index = 0) => {
/*
	const compareMoboMemory = currentData.motherboard.filter((mobo) => {
		return currentData.memory.some(memory => extractMemory(mobo.memory_compatibility).includes(extractMemory(memory.type)));
	});

	console.log(currentData.motherboard);
	if (compareMoboMemory.length === 0) {
		console.error("No compatible motherboards found when running constraintComparator");
	}

	currentData.motherboard = compareMoboMemory;
	const compareMemoryMobo = currentData.memory.filter((mem) => {
		return currentData.motherboard.some(motherboard => mem.type.includes(extractMemory(motherboard.memory_compatibility)));
	});

	console.log(currentData.motherboard);
	if (compareMemoryMobo.length === 0) {
		console.error("No compatible memory kits found when running constraintComparator");
	}

	currentData.memory = compareMemoryMobo;
	const compareCpuMobo = currentData.cpu.filter((cpu) => {
		return currentData.motherboard.some(mb => cpu.socket.includes(mb.cpu_compatibility));
	});

	if (compareCpuMobo.length === 0) {
		console.error("No compatible CPUs found when running constraintComparator");
	}

	currentData.cpu = compareCpuMobo;

	const compareMoboCpu = currentData.motherboard.filter((mobo) => {
		return currentData.cpu.some(cpu => mobo.cpu_compatibility.includes(cpu.socket));
	});

	console.log(currentData.motherboard);
	if (compareMoboCpu.length === 0) {
		console.error("No compatible motherboards found when running constraintComparator");
	}

	currentData.motherboard = compareMoboCpu;
*/


	const maxCpuTdp = getMaxValue(currentData.cpu_cooler, "cooling_potential_parsed");
	const maxCoolingPotential = getMaxValue(currentData.cpu, "tdp_parsed"); // Problems with some builds featuring high wattage items
	const minCoolingPotential = getMinValue(currentData.cpu, "tdp_parsed", maxCoolingPotential);
	const maxPsuWattage = getMaxValue(currentData.psu, "wattage");
	const maxGpuTdp = getMaxValue(currentData.gpu, "tdp_parsed");

	//const memoryCompatibility = await getMemoryCompatibilityBySocket(currentData.cpu.map(cpu => cpu.socket));
	//const cpuCompatibility = checkCpuCompatibility(currentData.cpu, currentData.motherboard);
	const ddrType = checkMemoryCompatibility(currentData.motherboard, currentData.memory);
	console.log("ddrType", ddrType);

	const constraintMap = {
		cpu: {
			motherboard: (cpu) => ({
				bool: {
					must: [
						//{ match: { chipset: cpu.manufacturer } }, // Probably not needed with cpu compatiblity
						{
							multi_match: {
								fields: ["cpu_compatibility"],
								query: cpu.socket,
								fuzziness: "AUTO:5,8"
							}
						}
					]
				}
			}),
			cpu_cooler: (cpu) => ({
				bool: {
					must: [
						{
							multi_match: {
								fields: ["compatibility"],
								query: cpu.socket,
								fuzziness: "AUTO:5,8"
							}
						},
						{ range: { cooling_potential_parsed: { gte: minCoolingPotential } } }
					],
					should: [
						{ range: { cooling_potential_parsed: { gte: maxCoolingPotential } } }
					]
				}
			})
		},
		motherboard: {
			memory: (motherboard) => ({
				bool: {
					must: [{ match: { type: extractMemory(motherboard.memory_compatibility) } }]
				}
			}),
			chassis: (motherboard) => ({
				bool: {
					must: [{ match: { compatibility: motherboard.form_factor } }]
				}
			})
		},
		/*memory: {
			motherboard: (memory) => ({
				bool: {
					must: [{ match: { memory_compatibility: ddrType } }]
				}
			})
		},*/
		gpu: {
			psu: (gpu, formFields) => {
				const constraints = {
					bool: {
						must: [{ range: { wattage: { gte: maxGpuTdp * 1.2 } } }]
					}
				};

				if (formFields.psuBias === "highWattage") {
					constraints.bool.should = [
						{
							range: {
								wattage: { gte: maxGpuTdp * 1.5 }
							}
						}
					];
					constraints.bool.minimum_should_match = 1;
				}

				return constraints;
			}
		},
		psu: {
			gpu: (psu) => ({
				bool: {
					must: [{ range: { tdp_parsed: { lte: maxPsuWattage * 1.3 } } }]
				}
			})
		},
		chassis: {
			motherboard: (chassis) => ({
				bool: {
					must: [
						{
							multi_match: {
								query: `${chassis.compatibility || ""} ${chassis.chassis_type || ""}`,
								fields: ["form_factor"],
								fuzziness: "AUTO"
							}
						}
					]
				}
			})
		},
	};
	
	for (const partType in currentData) {
		if (constraintMap[partType]) {
			if (currentData[partType].length > 0) {
				// Use the first result from currentData as the representative part
				const partData = currentData[partType][index];
				for (const relatedPart in constraintMap[partType]) {
					if (constraintMap[partType][relatedPart]) {
						const constraintFunction = constraintMap[partType][relatedPart];
						const constraint = constraintFunction(partData, formFields);
						if (constraint && constraint.bool) {
							if (queryBody[relatedPart].function_score) {
								queryBody[relatedPart].function_score.min_score = maxScores[relatedPart] * 0.75;
								if (constraint.bool.must) {
									queryBody[relatedPart].function_score.query.bool.must.push(...constraint.bool.must);
								}
								if (constraint.bool.should) {
									queryBody[relatedPart].function_score.query.bool.should.push(
										...constraint.bool.should
									);
								}
								if (constraint.bool.must_not) {
									queryBody[relatedPart].function_score.query.bool.must_not.push(
										...constraint.bool.must_not
									);
								}
							} else {
								queryBody[relatedPart].min_score = maxScores[relatedPart] * 0.75;
								if (constraint.bool.must) {
									queryBody[relatedPart].bool.must.push(...constraint.bool.must);
								}
								if (constraint.bool.should) {
									queryBody[relatedPart].bool.should.push(...constraint.bool.should);
								}
								if (constraint.bool.must_not) {
									queryBody[relatedPart].bool.must_not.push(...constraint.bool.must_not);
								}
							}
						}
					}
				}
			}
		}
		if (queryBody[partType].function_score) {
			queryBody[partType].function_score.min_score = maxScores[partType] * 0.75;
		} else {
			queryBody[partType].min_score = maxScores[partType] * 0.75;
		}
	}
	return queryBody;
};

const checkMemoryCompatibility = (motherboards, memoryKits) => {
	if (!motherboards || !memoryKits) {
		return null;
	}

	for (let motherboard of motherboards) {
		const motherboardMemoryType = extractMemory(motherboard.memory_compatibility);
		for (let memory of memoryKits) {
			const memoryType = extractMemory(memory.type);
			console.log("memoryType", memoryType, "motherboardMemoryType", motherboardMemoryType);
			if (motherboardMemoryType.includes(memoryType)) {
				console.log("memoryType", memoryType);
				return memoryType;
			} 
		}
		console.log("motherboardMemoryType", motherboardMemoryType);
		return motherboardMemoryType;
	}


    return null;
};

const checkCpuCompatibility = (cpus, motherboards) => {
	if (!cpus || !motherboards) {
		return null;
	}
    for (let cpu of cpus) {
        for (let mobo of motherboards) {
            if (mobo.cpu_compatibility.includes(cpu.socket)) {
                return {cpu: cpu, motherboard: mobo};
            }
        }
    }


    return null; // No compatible combination found
};


const getRandomRange = (value, skipFirst = 0) => {
	if (!value || typeof skipFirst !== "number") {
		return null;
	}
	const range = Math.floor(Math.random() * (value - 1)) + skipFirst;
	return range;
};

const populateRandomBuilds = () => {
	
};

const initialQuery = async (key, jsonFormFields) => {
	let queryBody = {
		bool: {
			must: [], // Mandatory clauses
			filter: [], // Filters that must match
			should: [], // Optional clauses to boost relevance
			must_not: [] // Clauses that must not match
		}
	};

	const compatibleSockets = await getUniqueCpuCompatibilities();
	
	const buildQuery = await buildWizardQuery(queryBody, key, jsonFormFields, compatibleSockets);
	if (buildQuery) {
		queryBody = { ...buildQuery.queryBody };

	}
	const opensearchResult = await wizardSearch(key, {query: queryBody});
	if (opensearchResult) {
		return {opensearchResult: opensearchResult, queryBody: queryBody, prices: buildQuery.prices, scoring: buildQuery.scoring};
	} else {
		return "Search failed";
	}
};

const chooseParts = async (finRes, maxScores, formFields, addComparator) => {
	let completedBuilds = 0;
	const buildAmount = 4;
	let searchResults = {};

    let randomBuilds = Array(buildAmount).fill(null).map(() => ({
        cpu: null,
        gpu: null,
        cpu_cooler: null,
        motherboard: null,
        memory: null,
        chassis: null,
        psu: null,
        storage: null
    }));

	let newQueryParts = {
		build1: {
			cpu: [],
			gpu: [],
			cpu_cooler: [],
			motherboard: [],
			memory: [],
			chassis: [],
			psu: [],
			storage: []
		},
		build2: {
			cpu: [],
			gpu: [],
			cpu_cooler: [],
			motherboard: [],
			memory: [],
			chassis: [],
			psu: [],
			storage: []
		}
	};
	const compareCpuMobo = finRes.cpu.hits.hits.map((hit) => hit._source).filter((cpu) => {
		return finRes.motherboard.hits.hits.map((hit) => hit._source).some(mb => mb.cpu_compatibility.includes(cpu.socket));
	});
	if (compareCpuMobo.length === 0) {
		throw new Error("No compatible CPUs found when running chooseParts");
	}
	finRes.cpu.hits.hits._source = compareCpuMobo;

	for (const key in finRes) {
		const sourceData = finRes[key].hits.hits.map((hit) => hit._source);
		if (key !== "gpu" && key !== "cpu") {
			newQueryParts.build1[key].push(...sourceData);
			newQueryParts.build2[key].push(...sourceData);
		} else {
			if (sourceData.length > 1) {
				newQueryParts.build1[key].push(sourceData[0]);
				newQueryParts.build2[key].push(
					sourceData[getRandomRange(sourceData.length, 1)]
				);
			} else {
				newQueryParts.build1[key].push(...sourceData);
				newQueryParts.build2[key].push(...sourceData);
			}
		}
	}

	for (const key in newQueryParts) {
		const cloneComparator = structuredClone(addComparator);
		const lateCloneComparator = structuredClone(addComparator);
		let searchResult;
		searchResults[key] = {};
		const newQuery = await constraintComparator(cloneComparator, formFields, newQueryParts[key], maxScores);
		for (const k in newQueryParts[key]) {
			searchResult = await wizardSearch(k, { query: newQuery[k] });
			if (!searchResult) {
				console.error("Something went wrong while searching for random parts.");
				//searchResult = await wizardSearch(k, { query: lateCloneComparator[k] });
				continue;
			}
			const newMaxScore = searchResult.body.hits.max_score;
			const partData = searchResult.body.hits.hits.map((hit) => ({...hit._source, score: hit._score}));

            searchResults[key][k] = [
            	...partData,
            	{ maxscore: newMaxScore }
            ];
		}

		for (completedBuilds; completedBuilds < buildAmount; completedBuilds++) {
			if (completedBuilds === 2 && key !== "build2") {
				break;
			}
			const cpuVal = searchResults[key].cpu[getRandomRange(searchResults[key].cpu.length)];
			const gpuVal = searchResults[key].gpu[getRandomRange(searchResults[key].gpu.length)];
			randomBuilds[completedBuilds] = {
				cpu: cpuVal,
				gpu: gpuVal
			}; 

			if (randomBuilds[completedBuilds].cpu && randomBuilds[completedBuilds].gpu) {
				for (const k in searchResults[key]) {
					// Defaults to SOMETHING in case of (cpu_cooler) failure (LGA3647)
					if (searchResults[key][k].length < 2) {
						console.warn(`${k} was empty.`);
						continue;
						/*
						console.warn(`${k} was empty, trying to add default data.`);
						searchResult = await wizardSearch(k, { query: lateCloneComparator[k] });
						const newMaxScore = searchResult.body.hits.max_score;
						const partData = searchResult.body.hits.hits.map((hit) => ({...hit._source, score: hit._score}));
						searchResults[key][k] = [
							...partData,
							{ maxscore: newMaxScore }
						];*/
					}
					if (k !== "gpu" && k !== "cpu") {
						randomBuilds[completedBuilds][k] =
							searchResults[key][k][getRandomRange(searchResults[key][k].length)];
					}
					randomBuilds[completedBuilds][k].maxscore = searchResults[key][k].slice(-1)[0]?.maxscore;
				}
			}
		}
	}

	randomBuilds = randomBuilds.filter((build, index) => {
		for (const [key, value] of Object.entries(build)) {
			if (value.maxscore === null || value === undefined || value === null || value.length === 0) {
				console.warn(`${key} was empty, deleting build ${index}`);
				return false;
			}
		}
		return true;
	});
	return randomBuilds;
};

const chooseRandomBuild = async (randomBuilds, scoring) => {
	if (!randomBuilds || !scoring || randomBuilds.length === 0) {
		return null;
	}
	const threshold = 0.95;
	let totalScores = [];
	for (const build in randomBuilds) {
		let total = 0;
		for (const [key, value] of Object.entries(randomBuilds[build])) {
			const normalized = parseFloat(value.score || 1) / parseFloat(value.maxscore || 1);
			const weighted = parseFloat(normalized) * parseFloat(scoring[key]);
			total += weighted;
		}
		totalScores.push({ index: build, total: total });
	}

	const highestScore = Math.max(...totalScores.map(b => b.total));
	const thresholdScore = highestScore * threshold;
	const buildsWithinThreshold = totalScores.filter(b => b.total >= thresholdScore);

	if (buildsWithinThreshold.length === 0) {
		return null;
	}

	const chosenBuild = buildsWithinThreshold[getRandomRange(buildsWithinThreshold.length) || 0];

	return randomBuilds[chosenBuild.index];
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

// Route to check connection to the opensearch instance
app.get("/api/health", async (req, res) => {
	console.log("API health accessed");
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

app.get("/api/opensearch/manage", tableSearch("opensearch"), async (req, res) => {
	console.log("API opensearch accessed");

	try {
		const { method, amount, type, part, id, data } = req.searchTerms;
		let operation = "Failed to run any operation!";

		if (method === "create") {
			if (type === "index") {
				await createPartIndex();
				operation = "createPartIndex completed successfully";
			}
			if (type === "template") {
				await createIndexTemplate();
				operation = "createIndexTemplate completed successfully";
			}
		}

		if (method === "insert") {
			if (amount === "all") {
				await insertToPartIndex();
				operation = "insertToPartIndex completed successfully";
			} 
			if (amount === "single" && (type === "document" || type === "data")) {
				if (!part || !data) {
					console.log("Missing part or data for single document insertion.");
				}
				await insertSingleToPartIndex(part, data);
				operation = `insertSingleToPartIndex with ${part} and ${data} completed successfully`;
			}
		}

		if (method === "purge") {
			await purgePartIndices("true");
			operation = "Ran purgePartIndices";
		}

		if (method === "delete") {
			if (amount === "all" && type === "data") {
				await deleteAllFromPartIndex(part);
				operation = `deleteAllFromPartIndex with ${part} completed successfully`;
			}
			if (amount === "single" && type === "document") {
				if (!part || !id) {
					console.log("Missing part or ID for single document deletion.");
				}
				await deleteSingleFromPartIndex(part, id);
				operation = `deleteSingleFromPartIndex with ${part} and ${id} completed successfully`;
			}
		}


		return res.status(200).json({ message: operation });
	} catch (error) {
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

app.get("/api/opensearch/view", async (req, res) => {
	const viewQuery = req.query.type || "indices";
	try {
	// const response2 = await axios.get(`${opensearch}/${viewQuery}`, { timeout: 5000 });
	const response = await client.cat[viewQuery]({ format: 'json' });

	return res.status(200).json(response);
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

app.get("/api/opensearch/backup", async (req, res) => {
	const index = req.query.index || "cpu";
	let query = req.query.query || "100";
	try {
	const response = await searchInIndex(index, query);

	return res.status(200).json(response);
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
		const message = error.response ? error.response.data : "Internal Server Error";
		const status = error.response ? error.response.status : 500;
		return res.status(status).json({ message: message });
	}
});

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

app.post("/api/algorithm", routePagination, tableValidator(partNameSchema, "partName"), tableSearch(), async (req, res) => {
	console.log("API algorithm accessed");
	console.log("\n");
	console.log("\n");

	/* 
	// For debugging
	const jsonFormFields = {
		price: 1500,
		useCase: "gaming",
		performancePreference: "maxCpu",
		formFactor: "noPreference",
		colorPreference: "noPreference",
		otherColor: "",
		rgbPreference: "noPreference",
		cpuManufacturer: "amdPreference",
		gpuManufacturer: "nvidiaPreference",
		psuBias: "bestEfficiency",
		storageBias: "onlySsd",
		additionalStorage: "noPreference"
	};
	*/

	const { formFields } = req.body;
	if (!formFields) {
		return res.status(400).json({ message: "Request body did not contain expected form!" });
	}

	const jsonFormFields = JSON.parse(formFields);

	const validFormFields = {
		price: 0,
		useCase: ["noPreference", "gaming", "work", "streaming", "generalUse", "editing", "workstation"],
		performancePreference: ["noPreference", "maxGpu", "maxCpu", "maxRamAmount", "maxRamSpeed", "maxStorageAmount", "maxEfficiency"],
		formFactor: ["noPreference", "smallest", "small", "medium", "large", "largest"],
		colorPreference: ["noPreference", "black", "white", "red", "blue", "other"],
		otherColor: "",
		rgbPreference: ["noPreference", "noRgb", "minimumRgb", "largeRgb", "maximumRgb"],
		cpuManufacturer: ["noPreference", "amdPreference", "intelPreference"],
		gpuManufacturer: ["noPreference", "amdPreference", "nvidiaPreference", "intelPreference"],
		psuBias: ["noPreference", "bestEfficiency", "balanced", "highWattage"],
		storageBias: ["noPreference", "onlyM2", "onlySsd", "bootSsd", "balanced", "onlyHdd"],
		additionalStorage: ["noPreference", "noAdded", "oneAdded", "twoAdded", "threeAdded", "maxAdded"]
	};

	let opensearchResults = {
		cpu: [],
		gpu: [],
		cpu_cooler: [],
		motherboard: [],
		memory: [],
		chassis: [],
		psu: [],
		storage: []
	};

	let comparatorResults = {
		cpu: [],
		gpu: [],
		cpu_cooler: [],
		motherboard: [],
		memory: [],
		chassis: [],
		psu: [],
		storage: []
	};

	let partObj = {
		cpu: [],
		gpu: [],
		cpu_cooler: [],
		motherboard: [],
		memory: [],
		chassis: [],
		psu: [],
		storage: []
	};
	
	let maxScores = {
		cpu: 0,
		gpu: 0,
		cpu_cooler: 0,
		motherboard: 0,
		memory: 0,
		chassis: 0,
		psu: 0,
		storage: 0
	};

	let addComparator = {};
	let comparatorQuery = {};
	let finRes = {};
	let scoring;

	try {
		// Validate form fields
		for (const key in jsonFormFields) {
			if (key !== "price" && key !== "otherColor" && !validFormFields[key].includes(jsonFormFields[key])) {
				//throw new Error(`${jsonFormFields[key]} is not allowed! Valid values are ${validFormFields[key]}.`);
				return res.status(400).json({ message: `${jsonFormFields[key]} is not allowed! Valid values are ${validFormFields[key]}.` });
			} else if (key === "price" && typeof jsonFormFields[key] !== "number") {
				//throw new Error(`${key} must be a number!`);
				//return res.status(400).json({ message: `${key} must be a number!` });
				jsonFormFields[key] = parseFloat(jsonFormFields[key]);
			} else if (key === "otherColor" && typeof jsonFormFields[key] !== "string") {
				//throw new Error(`${key} must be a string!`);
				//return res.status(400).json({ message: `${key} must be a string!` });
				jsonFormFields[key] = String(jsonFormFields[key]);
			}
		}
		
		// Fetch OpenSearch results for each part
		for (const key in opensearchResults) {
			const opensearchResult = await initialQuery(key, jsonFormFields);
			
			if (!opensearchResult) {
				// 406 Not Acceptable or 404 Not Found
				return res.status(500).json({ message: "Couldn't fetch initial data." });
			}
			
			opensearchResults[key] = opensearchResult.opensearchResult.body.hits.hits.map(hit => hit._source);
			maxScores[key] = opensearchResult.opensearchResult.body.hits.max_score;
			comparatorQuery[key] = opensearchResult.queryBody;
			scoring = opensearchResult.scoring;
		}

		const preComparatorQuery = structuredClone(comparatorQuery);

		addComparator = await constraintComparator(comparatorQuery, jsonFormFields, opensearchResults, maxScores);

		// Search for comparator results
		for (const key in addComparator) {
			comparatorResults[key] = await wizardSearch(key, {query: addComparator[key]});

		}

		// Extract final results
		for (const key in comparatorResults) {
			finRes[key] = comparatorResults[key].body;
		}
		
		// Generate random builds
		const randomBuilds = await chooseParts(finRes, maxScores, jsonFormFields, preComparatorQuery);

		if (randomBuilds.length === 0) {
		   return res.status(422).json({ message: "No valid builds could be created with the given constraints." });
		}
		
		// Choose a random build within the scoring threshold
		const chosenBuild = await chooseRandomBuild(randomBuilds, scoring);

		if (!chosenBuild) {
			return res.status(404).json({ message: "No suitable build found with the given preferences." });
		}

		// Query for acutal data in database
		const partQueries = Object.keys(chosenBuild).map((build) => {
			const sql = `SELECT * FROM ${build} WHERE ID = ?`;
			return promisePool.query(sql, [chosenBuild[build].id]);
		});

		const parts = await Promise.all(partQueries);
		
		// Populate part objects
		for (const [index, part] of parts.entries()) {
			const build = Object.keys(chosenBuild)[index];
			if (!part.length) {
				return res.status(404).json({ message: `Part ${build} not found` });
			}
			partObj[build] = part[0][0];
		}

		/*
		for (const build in chosenBuild) {
			sql = `SELECT * FROM ${build} WHERE ID = ?`;
			const [part] = await promisePool.query(sql, [chosenBuild[build].id]);
			if (!part.length) {
				return res.status(404).json({ message: "Part not found" });
			}
			partObj[build] = part[0];
		}
		*/
		// Calculate total price

		for (const item in partObj) {
			if (partObj[item] === null || partObj[item].length === 0) {
				partObj[item] = { Name: `${item} did not return any results with your current settings!` };
			}
		}

		const totalPrice = Object.values(partObj).reduce((sum, part) => sum + (parseFloat(part.Price) || 0), 0).toFixed(2);
		console.log(totalPrice);

		return res.status(200).json({partObj: partObj, totalPrice: totalPrice});
	} catch (error) {
		console.error(error);
		// If there is a status message or data then use that, otherwise the defaults
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
		notOperator = searchTerms.strict === true ? "!" : "NOT ";
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
		notOperator = searchTerms.strict === true ? "!" : "NOT ";
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

		// additionaldetails needs to be parsed
		const parseInventory = partInventory.map((item) => ({
			...item,
			additionaldetails: item.additionaldetails ? JSON.parse(item.additionaldetails) : null
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

		// additionaldetails needs to be parsed
		const parseInventory = partInventory.map((item) => ({
			...item,
			additionaldetails: item.additionaldetails ? JSON.parse(item.additionaldetails) : null
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
	checkApiHealth();
});
