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
const crypto = require("crypto");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const axios = require("axios");
const Joi = require("joi");
const PdfPrinter = require("pdfmake");
const { Client } = require('@opensearch-project/opensearch');

// User authentication exports
const jwt = require("jsonwebtoken");
const session = require("express-session");

// Database connection exports
const mysql = require("mysql2");

// Environment file
require("dotenv").config();

// Environment variables
// Remember, secrets should not be published
const sessionSecret = process.env.SESSION_SECRET;
const jwtSecret = process.env.JWT_SECRET;
const opensearch = process.env.OPENSEARCH_URL;
const stripeSecret = process.env.STRIPE_SK;
const stripePublish = process.env.STRIPE_PK;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
if (!stripeSecret) {
	console.error("Missing STRIPE_SK environment variable. Exiting...");
	process.exit(1);
}
if (!stripePublish) {
	console.error("Missing STRIPE_PK environment variable. Exiting...");
	process.exit(1);
}
if (!stripeWebhookSecret) {
	console.error("Missing STRIPE_WEBHOOK_SECRET environment variable. Exiting...");
	process.exit(1);
}

const stripe = require("stripe")(stripeSecret);


// General setup

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

const app = express();
const port = 4000;

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
const profileStorage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "public/profile_images");
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		const extension = path.extname(file.originalname);
		cb(null, "ProfileImage" + "-" + uniqueSuffix + extension);
	}
});

const productStorage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "public/product_images");
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		const extension = path.extname(file.originalname);
		cb(null, "ProductImage" + "-" + uniqueSuffix + extension);
	}
});

const otherStorage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "public");
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		const extension = path.extname(file.originalname);
		cb(null, "File" + "-" + uniqueSuffix + extension);
	}
});

const profileImgUpload = multer({ storage: profileStorage, fileFilter: imageFileFilter });
const productImgUpload = multer({ storage: productStorage, fileFilter: imageFileFilter });
const otherFileUpload = multer({ storage: otherStorage });

const deleteFile = async (filePath) => {
    try {
        await fs.promises.access(filePath);
        await fs.promises.unlink(filePath);
        console.log("Successfully deleted file:", filePath);
        return true;
    } catch (error) {
        if (error.code === "ENOENT") {
            console.warn("File does not exist:", filePath);
            return true;
        }
		console.error("Error deleting file:", error);
		return false;
    }
};

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

// Joi schemas
const partSchema = Joi.object({
	ID: Joi.number().optional(),
	Url: Joi.string().uri().optional(),
	Price: Joi.number().optional(),
	priceRange: Joi.string().trim()
		.pattern(/^\d+-\d+$/)
		.optional()
		.messages({
			"string.pattern.base": "Invalid range format format. Range must include number hyphen (-) number.",
		}),
	priceMin: Joi.number().optional(),
	priceMax: Joi.number().optional(),
	Name: Joi.string().trim().optional(),
	Manufacturer: Joi.string().trim().optional(),
	Image: Joi.string().optional(),
	Image_Url: Joi.string().uri().optional(),
	Chassis_Type: Joi.string().trim().optional(),
	Dimensions: Joi.string().trim().optional(),
	Color: Joi.string().trim().optional(),
	Compatibility: Joi.string().trim().optional(),
	Cooling_Potential: Joi.string().trim().optional(),
	Fan_RPM: Joi.number().optional(),
	Noise_Level: Joi.string().trim().optional(),
	Cores: Joi.number().optional(),
	Core_Clock: Joi.string().trim().optional(),
	Memory: Joi.string().trim().optional(),
	Interface: Joi.string().trim().optional(),
	TDP: Joi.string().trim().optional(),
	Type: Joi.string().trim().optional(),
	Amount: Joi.number().optional(),
	Speed: Joi.string().trim().optional(),
	Latency: Joi.string().trim().optional(),
	Chipset: Joi.string().trim().optional(),
	Form_Factor: Joi.string().trim().optional(),
	Memory_Compatibility: Joi.string().trim().optional(),
	Is_ATX12V: Joi.string().trim().optional(),
	Efficiency: Joi.string().trim().optional(),
	Modular: Joi.string().trim().optional(),
	Capacity: Joi.string().trim().optional(),
	Cache: Joi.string().trim().optional(),
	Flash: Joi.string().trim().optional(),
	TBW: Joi.string().trim().optional(),
	Core_Count: Joi.number().optional(),
	Thread_Count: Joi.number().optional(),
	Base_Clock: Joi.string().trim().optional(),
	Socket: Joi.string().trim().optional(),
	Cpu_Cooler: Joi.string().trim().optional(),
	Integrated_GPU: Joi.string().trim().optional(),
	strict: Joi.boolean().optional(),
	inverted: Joi.boolean().optional()
});

const idSchema = Joi.object({
	id: Joi.number().min(1).default(1),
});

const opensearchSchemaBasic = Joi.object({
	method: Joi.string().trim().required().valid("create", "insert", "purge", "delete", "reset"),
	amount: Joi.string().trim().optional().valid("all", "single"),
	type: Joi.string().trim().optional().valid("index", "template", "data", "document"), 
	part: Joi.string().trim().optional().valid("chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory"),
	id: Joi.number().optional(),
});

const opensearchSchema = Joi.object({
	method: Joi.string().trim().required().valid("create", "insert", "purge", "delete", "reset"),
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
	.valid("Name", "Email", "Password", "currentPassword", "Gender", "ProfileImage");

const loginSchema = Joi.object({
	Email: Joi.string().trim()
		.required()
		.email()
		.messages({
			"string.email": "Invalid email format. Please enter a valid email address in the format: example@domain.com",
			"string.empty": "Email cannot be empty",
			"any.required": "Email is required"
		}),
	Password: Joi.string().trim()
		.required()
		.pattern(/^(?=.*[A-Z])(?=.*\d)[\w!@#$%^&*()_\-+=\[\]{}:;"'<>,.?\/]{9,}$/)
		.messages({
			"string.pattern.base": "Invalid password format. Password must be at least 9 characters long, include 1 capital letter, and 1 number.",
			"string.empty": "Password cannot be empty",
			"any.required": "Password is required"
		})
});

const userSchema = Joi.object({
	Name: Joi.string().trim().min(3).max(50).required().messages({
		"string.base": "Name must be a string",
		"string.empty": "Name cannot be empty",
		"string.min": "Name must be at least 3 characters long",
		"string.max": "Name cannot exceed 50 characters",
		"any.required": "Name is required"
	}),
	Email: Joi.string().trim()
		.required()
		.email() // Built in regex
		.messages({
			"string.email": "Invalid email format. Please enter a valid email address in the format: example@domain.com",
			"string.empty": "Email cannot be empty",
			"any.required": "Email is required"
		}),
	Password: Joi.string().trim()
		.required()
		.pattern(/^(?=.*[A-Z])(?=.*\d)[\w!@#$%^&*()_\-+=\[\]{}:;"'<>,.?\/]{9,}$/)
		.messages({
			"string.pattern.base": "Invalid password format. Password must be at least 9 characters long, include 1 capital letter, and 1 number.",
			"string.empty": "Password cannot be empty",
			"any.required": "Password is required"
		})
});

const userUpdateSchema = Joi.object({
	Name: Joi.string().trim().min(3).max(50).optional().messages({
		"string.base": "Name must be a string",
		"string.empty": "Name cannot be empty",
		"string.min": "Name must be at least 3 characters long",
		"string.max": "Name cannot exceed 50 characters"
	}),
	Email: Joi.string().trim()
		.email()
		.optional()
		.messages({
			"string.email": "Invalid email format. Please enter a valid email address in the format: example@domain.com",
			"string.empty": "Email cannot be empty"
		}),
	Password: Joi.string().trim()
		.pattern(/^(?=.*[A-Z])(?=.*\d)[\w!@#$%^&*()_\-+=\[\]{}:;"'<>,.?\/]{9,}$/)
		.optional()
		.messages({
			"string.pattern.base": "Invalid password format. Password must be at least 9 characters long, include 1 capital letter, and 1 number.",
			"string.empty": "Password cannot be empty"
		}),
	currentPassword: Joi.string().trim()
		.pattern(/^(?=.*[A-Z])(?=.*\d)[\w!@#$%^&*()_\-+=\[\]{}:;"'<>,.?\/]{9,}$/)
		.required()
		.messages({
			"string.pattern.base": "Invalid password format for current password.",
			"string.empty": "Current password cannot be empty",
			"any.required": "Current password is required"
		}),
	Gender: Joi.string().trim().valid("male", "female").optional().messages({
		"string.base": "Gender must be a string",
		"any.only": "Gender must be one of either 'male' or 'female'"
	}),
	ProfileImage: Joi.string().trim()
		.optional()
		.messages({
			"string.base": "Profile image must be a valid filename",
		})
});

const inventorySchema = Joi.object({
	PartID: Joi.number().optional(),
	PartTypeID: Joi.number().optional(),
	ModelNumber: Joi.string().trim().optional(),
	SerialNumber: Joi.string().trim().optional(),
	Available: Joi.number().optional(),
	DateAdded: Joi.string().trim().optional(),
	AdditionalDetails: Joi.string().trim().optional(),
	Price: Joi.number().optional(),
	priceRange: Joi.string().trim()
		.pattern(/^\d+-\d+$/)
		.optional()
		.messages({
			"string.pattern.base": "Invalid range format format. Range must include number hyphen (-) number.",
		}),
	availableRange: Joi.string().trim()
		.pattern(/^\d+-\d+$/)
		.optional()
		.messages({
			"string.pattern.base": "Invalid range format format. Range must include number hyphen (-) number.",
		}),
	priceMin: Joi.number().optional(),
	availableMin: Joi.number().optional(),
	priceMax: Joi.number().optional(),
	availableMax: Joi.number().optional(),
	Name: Joi.string().trim().optional(),
	Manufacturer: Joi.string().trim().optional(),
	strict: Joi.boolean().optional(),
	inverted: Joi.boolean().optional()

});

const contentSchemaMin = Joi.object({
	contentid: Joi.number().optional(),
	site_identifier: Joi.string().trim().max(255).optional(),
	main_tag: Joi.string().trim().max(20).optional(),
	language: Joi.string().trim().max(10).optional(),
	content_text: Joi.string().trim().optional(),
	content_type: Joi.string().trim().max(20).optional(),
	status: Joi.string().trim().max(10).optional(),
	version: Joi.number().optional(),
	added_by: Joi.number().optional(),
	last_edited_by: Joi.number().optional(),
	created_at: Joi.date().optional(),
	modified_at: Joi.date().optional(),
	strict: Joi.boolean().optional(),
	inverted: Joi.boolean().optional()

});

const contentSchema = Joi.object({
	ContentID: Joi.number().optional(),
	Site_Identifier: Joi.string().trim().max(255).optional(),
	Main_Tag: Joi.string().trim().max(20).optional(),
	Language: Joi.string().trim().max(10).optional(),
	Content_Text: Joi.string().trim().optional(),
	Content_Type: Joi.string().trim().max(20).optional(),
	Status: Joi.string().trim().max(10).optional(),
	Version: Joi.number().optional(),
	Added_By: Joi.number().optional(),
	Last_Edited_By: Joi.number().optional(),
	Created_At: Joi.date().optional(),
	Modified_At: Joi.date().optional(),
	strict: Joi.boolean().optional(),
	inverted: Joi.boolean().optional()
});

const addressSchema = Joi.object({
	AddressID: Joi.number().optional(),
	CustomerID: Joi.number().optional(),
	AddressTypeID: Joi.number().optional(),
	Street: Joi.string().trim().max(100).optional(),
	City: Joi.string().trim().max(100).optional(),
	State: Joi.string().trim().max(100).optional(),
	PostalCode: Joi.string().trim().max(20).optional(),
	Country: Joi.string().trim().max(100).optional(),
	currentPassword: Joi.string().trim()
		.pattern(/^(?=.*[A-Z])(?=.*\d)[\w!@#$%^&*()_\-+=\[\]{}:;"'<>,.?\/]{9,}$/)
		.required()
		.messages({
			"string.pattern.base": "Invalid password format for current password.",
			"string.empty": "Current password cannot be empty",
			"any.required": "Current password is required"
		})
});

const orderSchema = Joi.object({
	OrderID: Joi.number().optional(),
	OrderTypeID: Joi.number().optional(),
	CustomerID: Joi.number().optional(),
	ReceiptID: Joi.string().trim().max(30).optional(),
	OrderDate: Joi.date().optional(),
	Status: Joi.string().trim().max(255).optional(),
	TotalPrice: Joi.number().optional(),
	Currency: Joi.string().trim().max(10).optional(),
	Items: Joi.array().items(Joi.object().optional()).optional(),
	PaymentMethod: Joi.string().trim().max(255).optional(),
	PaymentProvider: Joi.string().trim().max(255).optional(),
	TransactionID: Joi.string().trim().max(255).optional(),
	PaymentStatus: Joi.string().trim().max(255).optional(),
	PaymentDate: Joi.date().optional(),
	ModifiedAt: Joi.date().optional()
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
		],
		content: [
			"contentid",
			"site_identifier",
			"main_tag",
			"language",
			"content_text",
			"content_type",
			"added_by",
			"last_edited_by",
			"created_at",
			"modified_at",
			"status"
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
			if (partName === "content") {
				currentSchema = contentSchema;
			}
			if (partName === "address") {
				currentSchema = addressSchema;
			}
			const validationResult = Joi.attempt(searchTerms, currentSchema);

			req.searchTerms = validationResult;
			next();
		} catch (error) {
			return res.status(400).json({ message: error.details[0].message });
		}
	};
};

const formFieldsValidator = (schema) => {
	return (req, res, next) => {
		let unvalidatedData;

		if (req.headers["content-type"] && req.headers["content-type"].includes("multipart/form-data")) {
			unvalidatedData = req.body;
		} else {
			let { formFields } = req.body;

			if (typeof formFields === "string") {
				try {
					formFields = JSON.parse(formFields);
				} catch (err) {
					return res.status(400).json({ message: "Unable to parse data" });
				}
			}

			if (typeof formFields !== "object") {
				return res.status(400).json({ message: "Invalid form data format" });
			}
			
			unvalidatedData = Object.fromEntries(
				Object.entries(formFields).filter(([_, value]) => value !== "")
			);
		}

		try {
			const value = Joi.attempt(unvalidatedData, schema);
			req.validatedForm = value;
			next();
		} catch (error) {
			return res.status(400).json({ message: error.details[0].message });
		}
	};
};

const userFieldsValidator = (req, res, next) => {
	let formFields = req.validatedForm;

	if (typeof formFields === "string") {
		try {
			formFields = JSON.parse(formFields);
		} catch (err) {
			return res.status(400).json({ message: "Unable to parse data" });		
		}
	}

	if (typeof formFields !== "object") {
		return res.status(400).json({ message: "Invalid form data format" });
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
		const id = req.query.id || req.params.id;
		const value = Joi.attempt({ id: id }, idSchema);
		req.validatedId = value.id;
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
	const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[\w!@#$%^&*()_\-+=\[\]{}:;"'<>,.?\/]{9,}$/; // At least 1 upper character, at least 1 digit/number, at least 9 chars long
	const emailRegex =
		/^[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?$/; // Email according to the RFC 5322 standard

	let Email;
	let Password;
	const { formFields } = req.body;
	if (formFields) {
		({ Email, Password } = JSON.parse(formFields));
	} else {
		({ Email, Password } = req.body);
	}

	// Validate email
	if (typeof Email !== "undefined" && Email !== "" && !emailRegex.test(Email)) {
		return res.status(400).json({
			message: "Invalid email format. Please enter a valid email address in the format: example@domain.com"
		});
	}

	// Validate password
	if (typeof Password !== "undefined" && Password !== "" && !passwordRegex.test(Password)) {
		return res.status(400).json({
			message:
				"Invalid password format. Password must be at least 9 characters long, include 1 capital letter, and 1 number."
		});
	}

	next();
};

const handleServerError = (error) => {
	console.error(error);
	// If there is a status message or data then use that, otherwise the defaults
	const message = error.response ? error.response.data : `${error}`;
	const status = error.response ? error.response.status : 500;
	return [status, message];
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
		return null;
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
					throw(`This error has caused problems: ${failedItems[0].index.error}`);
				} else {
					console.log(`Data successfully indexed to the ${part} index`);
				}
			}
		}
		console.log("All parts indexed succesfully!");
	} catch (error) {
		console.error("Error inserting data:", error);
		return null;
	}
};


const insertSingleToPartIndex = async (part, data) => {
	try {
		const partTypes = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory"];
		if (!partTypes.includes(part.toLowerCase())) {
			throw (`${part} is not a valid part name!`);
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
			throw ('Confirmation required: You must provide the value "true" to purge all part indices!');
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
		return null;
	}
};

const deleteAllFromPartIndex = async (part) => {
	try {
		const partTypes = ["chassis", "cpu", "cpu_cooler", "gpu", "memory", "motherboard", "psu", "storage", "part_inventory"];
		if (!partTypes.includes(part.toLowerCase())) {
			throw (`${part} is not a valid part name!`);
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
			throw (`${part} is not a valid part name!`);
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
		console.error("\x1b[41m", "Error during search:\n", JSON.stringify(error));
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

			if (((key === "colorPreference" && value !== "other") || (key === "otherColor" && value !== "")) && partType !== "storage") {
				const colorMap = {
					black: "musta",
					white: "valkoinen",
					red: "punainen",
					blue: "sininen",
					green: "vihreä",
					musta: "black",
					valkionen: "white",
					punainen: "red",
					sininen: "blue",
					vihreä: "green"
				};
				queryBody.bool.should.push({
					multi_match: {
						query: `${value} ${colorMap[value] || ""}`,
						fields: ["name", "color"], // List the fields you want to match
						fuzziness: "AUTO:2,4", // Enables fuzzy matching for typo-tolerance
						boost: 1.5
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
							boost: 1.5
						}
					});
				} else {
					const boost = value === "maximumRgb" ? 1.75 : value === "largeRgb" ? 1.5 : 1;
					queryBody.bool.should.push({
						multi_match: {
							query: "rgb",
							fields: ["name", "color"], // Replace with fields relevant to your document schema
							fuzziness: 1,
							boost: boost
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
		return "";
	}
	if (!key) {
		return "";
	}

	const value = data
		.map((d) => d[key])
		.filter((value) => value !== undefined && value !== null)
		.reduce((max, value) => Math.max(max, value), null);

	return value;
};

const getMinValue = (data, key, maxCoolingPotential) => {
	if (!data) {
		return "";
	}
	if (!key) {
		return "";
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


	//const maxCpuTdp = getMaxValue(currentData.cpu_cooler, "cooling_potential_parsed");
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
			cpu: (cpu) => ({
				bool: {
					must: [
						//{ match: { chipset: cpu.manufacturer } }, // Probably not needed with cpu compatiblity
						{
							multi_match: {
								fields: ["socket"],
								query: cpu.socket,
								fuzziness: "AUTO:5,8"
							}
						}
					]
				}
			}),
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
					must: [{ match: { type: ddrType } }]
				}
			}),
			chassis: (motherboard) => ({
				bool: {
					must: [{ match: { compatibility: motherboard.form_factor || "" } }]
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
		/* // Can be used in conjunction with psu wattage, but kind of unnecessary
		psu: {
			gpu: (psu) => ({
				bool: {
					must: [{ range: { tdp_parsed: { lte: maxPsuWattage * 1.3 } } }]
				}
			})
		},
		*/
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
								queryBody[relatedPart].function_score.min_score = maxScores[relatedPart] * 0.5;
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
								queryBody[relatedPart].min_score = maxScores[relatedPart] * 0.5;
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
			queryBody[partType].function_score.min_score = maxScores[partType] * 0.5;
		} else {
			queryBody[partType].min_score = maxScores[partType] * 0.5;
		}
	}
	return queryBody;
};

const checkMemoryCompatibility = (motherboards, memoryKits) => {
	if (!motherboards || !memoryKits) {
		return "";
	}

	for (let motherboard of motherboards) {
		if (!motherboard.memory_compatibility) {
			console.log("No memory type for motherboard");
			return "";
		}
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


    return "";
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

const preProcessPartData = async (finRes, newQueryParts) => {
	for (const key in finRes) {
		if (key === "gpu" || key === "cpu") {
			const sourceData = finRes[key].hits.hits.map((hit) => hit._source);
			if (sourceData.length > 1) {
				newQueryParts.build1[key].push(sourceData[0]);
				newQueryParts.build2[key].push(sourceData[getRandomRange(sourceData.length, 1)]);
			} else {
				newQueryParts.build1[key].push(...sourceData);
				newQueryParts.build2[key].push(...sourceData);
			}
		}
	}
	return newQueryParts;
};

const chooseParts = async (finRes, maxScores, formFields, addComparator) => {
	const lateCloneComparator = structuredClone(addComparator);

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

	newQueryParts = await preProcessPartData(finRes, newQueryParts);

	for (const key in newQueryParts) {
		const cloneComparator = structuredClone(addComparator);
		let searchResult;
		const newQuery = await constraintComparator(cloneComparator, formFields, newQueryParts[key], maxScores);

		for (const k in newQueryParts[key]) {
			searchResult = await wizardSearch(k, { query: newQuery[k] });
			if (!searchResult) {
				console.error("Something went wrong while searching for random parts.");
				continue;
			}
			const newMaxScore = searchResult.body.hits.max_score;
			const partData = searchResult.body.hits.hits.map((hit) => ({ ...hit._source, score: hit._score }));

			newQueryParts[key][k] = [...partData, { maxscore: newMaxScore }];
		}
	}

	for (const key in newQueryParts) {
		let searchResult;
		const cloneComparator = structuredClone(addComparator);
		searchResults[key] = {};
		const newQuery = await constraintComparator(cloneComparator, formFields, newQueryParts[key], maxScores);
		console.log(`Before:\n`);
		console.log(JSON.stringify(newQuery, null, 2));
		for (const k in newQueryParts[key]) {
			searchResult = await wizardSearch(k, { query: newQuery[k] });
			if (!searchResult) {
				console.error("Something went wrong while searching for random parts.");
				//searchResult = await wizardSearch(k, { query: lateCloneComparator[k] });
				continue;
			}
			const newMaxScore = searchResult.body.hits.max_score;
			const partData = searchResult.body.hits.hits.map((hit) => ({ ...hit._source, score: hit._score }));

			searchResults[key][k] = [...partData, { maxscore: newMaxScore }];
		}
	}

	for (const key in newQueryParts) {
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
					if (searchResults[key][k].length < 2) {
						console.warn(`${k} was empty.`);
						continue;
						/*
						// Defaults to SOMETHING in case of failure (eg. cpu_cooler -> LGA3647)
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

const generateReceiptId = (customerID) => {
	if (!customerID) {
		return null;
	}

	const hashedUserId = crypto.createHash("sha256").update(customerID.toString()).digest("hex").slice(0, 8);

	const currentDate = new Date();
	const formattedDate = currentDate.toLocaleDateString("en-GB").replace(/\//g, "");

	const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
	
	const receiptId = `${hashedUserId}${formattedDate}-${randomChars}`;
	return receiptId;
};


const generateReceipt = async (result, customer, Items, calculatedPrice, paymentIntent) => {
	const fonts = {
		Roboto: {
			normal: path.resolve(__dirname, "../fonts/Roboto/Roboto-Regular.ttf"), // Point to the actual TTF file
			bold: path.resolve(__dirname, "../fonts/Roboto/Roboto-Bold.ttf"),
			italics: path.resolve(__dirname, "../fonts/Roboto/Roboto-Italic.ttf"),
			bolditalics: path.resolve(__dirname, "../fonts/Roboto/Roboto-BoldItalic.ttf"),
		},
	};

	const printer = new PdfPrinter(fonts);

	const address = `${customer.Street || ""}, ${customer.City || ""}, ${customer.State || ""}, ${customer.PostalCode || ""}`;
	const receiptPath = path.join(__dirname, `../receipts/receipt_${result.ReceiptID}.pdf`);

	// Convert items to table rows
	const tableBody = [
		[
			{ text: "Tuote", style: "tableHeader" },
			{ text: "Tuottaja", style: "tableHeader" },
			{ text: "Määrä", style: "tableHeader" },
			{ text: "Hinta (€/kpl)", style: "tableHeader" },
			{ text: "Yhteensä (€)", style: "tableHeader" }
		]
	];

	for (const item of Items) {
		let price;
		let name;
		let manufacturer;
		let quantity;
		if (item.table === "completedBuild") {
			quantity = 1;
			price = parseFloat(item.totalPrice).toFixed(2) || 0;
			name = "Computer build";
			manufacturer = "KoneAvustajat";
		} else if (item.table === "usedParts") {
			quantity = item.quantity || 1;
			price = parseFloat(item.Price).toFixed(2) || 0;
			name = `Käytetty tuote: ${item.Name || "-"}`;
			manufacturer = item.Manufacturer || "-";
		} else {
			quantity = item.quantity || 1;
			price = parseFloat(item.Price).toFixed(2) || 0;
			name = item.Name || "-";
			manufacturer = item.Manufacturer || "-";
		}
		
		tableBody.push([
			name,
			manufacturer,
			String(quantity),
			price,
			(quantity * price).toFixed(2),
		]);
	}

	// Payment status
	const paidStatus = paymentIntent?.status === "succeeded" ? "Kyllä" : "Ei";
	const paidDate = paymentIntent?.status === "succeeded" ? (result.PaymentDate.toLocaleDateString() || "Ei päivämäärää") : "";

	// docDefinition for PDFMake
	const docDefinition = {
		pageSize: "A4",
		pageMargins: [40, 60, 40, 60],
		content: [
			{
				text: "Kuitti",
				style: "header",
				alignment: "center"
			},
			{ text: "Myyjä:", style: "listHeader" },
			{
				text: [
					"Yrityksen nimi: KoneAvustajat\n",
					"Y-tunnus: 3365106-1\n",
					"Sähköposti: benniw139@gmail.com\n\n"
				],
				style: "body"
			},
			{ text: "Asiakas:", style: "listHeader" },
			{
				text: [
					`Nimi: ${customer.Name || "Ei määritelty"}\n`,
					`Osoite: ${address || "Ei määritelty"}\n`,
					`Sähköposti: ${customer.Email || "Ei määritelty"}\n\n`
				],
				style: "body"
			},
			{
				text: [
					{ text: "Kuittinumero:", bold: true }, ` ${result.ReceiptID}\n`,
					{ text: "Luomispäivämäärä:", bold: true }, ` ${new Date().toLocaleDateString()}\n\n`
				],
				style: "body"
			},
			{ text: "Tuotteet:", style: "subheader" },
			{
				style: "tableExample",
				table: {
					headerRows: 1,
					widths: ["auto", "auto", "auto", "auto", "auto"],
					body: tableBody
				},
				layout: {
					hLineWidth: (i, node) => {
						return i === 1 ? 2 : 0.5;
					},
					vLineWidth: (i, node) => {
						return 0.5;
					},
					paddingTop: (rowIndex, node) => 5,
					paddingBottom: (rowIndex, node) => 5,
					paddingLeft: (rowIndex, node) => 5,
					paddingRight: (rowIndex, node) => 5,
				},
				margin: [0, 20, 0, 20]
			},
			{
				text: [{ text: "\nYhteensä (sis. ALV 25.5%):", bold: true }, ` ${calculatedPrice}€`],
				style: "rightAlign"
			},
			{
				text: [{ text: "Maksettu:", bold: true }, ` ${paidStatus}`, { text: "\nMaksutapa: ", bold: true }, "Kortti", { text: "\nMaksupäivämäärä: ", bold: true }, `${paidDate}\n`],
				style: "rightAlign"
			},
			{ text: "Takuuehdot:", style: "subheader", pageBreak: "before" },
			{ 
				text: [
					"1kk täysi takuu (paitsi SSD & PSU) & 3kk ilmainen korjaus & 6kk tukea. ",
					"Takuu kattaa valmistusvirheet ja normaalin käytön aiheuttamat viat. ",
					"Takuu ei kata fyysisiä vaurioita tai virheellisesti asennettujen osien aiheuttamia ongelmia.\n\n",
					"Tämä kuitti toimii virallisena todisteena ostosta. Takuu- ja tukipalvelut ovat voimassa vain esittämällä tämän kuitin.\n\n"
				]
			},
			{ text: "Takuu ei kata:", style: "listHeader" },
			{
				ul: [
					"SSD ja PSU",
					"Fyysiset vauriot",
					"Asiakkaan aiheuttamat virheet asennuksessa tai käytössä"
				],
				margin: [20, 5, 0, 10]
			},
			{ 
				text: [
					{ text: "\nIlmainen korjaus", bold: true }, " koskee valmistusvirheistä johtuvia vikoja ja muita ongelmia, ",
					"jotka ilmenevät normaalissa käytössä kolmen (3) kuukauden sisällä ostopäivästä. ",
					"Ilmainen korjaus koskee vain alkuperäisiä komponentteja ja alkuperäistä kokoonpanoa.\n\n",
					{ text: "Tuki", bold: true }, " sisältää teknistä apua ja neuvontaa kuuden (6) kuukauden ajan ostopäivästä.\n\n"
				]
			},
			{ text: "Huoltopalvelut:", style: "listHeader" },
			{ 
				text: [
					"Tarjoamme myös erillisiä huoltopalveluita, jotka ovat erillisiä laitteen oston yhteydessä tarjottavista korjauspalveluista. ",
					"Huoltopalvelut eivät sisälly takuuseen ja niistä peritään erillinen maksu. ",
					"Emme vastaa korjausten aikana mahdollisesti syntyneistä vahingoista. ",
					"Kaikki huoltopalvelut suoritetaan asiakkaan omalla vastuulla. ",
					"Mikäli huoltopalvelun aikana ilmenee lisävaurioita tai komponenttien rikkoutumisia, emme ole velvollisia korvaamaan näitä vahinkoja.\n\n"
				]
			},
			{ text: "Nouto:", style: "listHeader" },
			{ 
				text: [
					"Kun laite on valmis (sekä oston että huoltopalveluiden osalta) tai todetaan korjauskelvottomaksi, ",
					"asiakasta ilmoitetaan joko tekstiviestillä tai sähköpostilla laitteen noutoa varten. ",
					"Asiakkaan tulee noutaa laite mahdollisimman pian ilmoituksen saatuaan. ",
					"Säilytämme laitteita kaksi viikkoa siitä, kun asiakasta on ilmoitettu laitteen olevan noudettavissa, ",
					"ellei asiakas ole etukäteen ilmoittanut pidemmästä säilytysajasta.\n\n"
				]
			},
			{ text: "Lisätietoja:", style: "listHeader" },
			{ 
				text: [
					"Mikäli tarvitsette lisätietoja takuusta, teknisestä tuesta tai huollosta, ottakaa yhteyttä KoneAvustajien asiakaspalveluun.\n\n"
				]
			},
			{ text: "Huomio:", style: "listHeader" },
			{ 
				text: [
					"Tämä kuitti toimii virallisena ostotodistuksena ja takuuehtojen vahvistuksena. Säilyttäkää kuitti turvallisessa paikassa.\n\n"
				]
			},
		],
		styles: {
			header: {
				fontSize: 18,
				bold: true,
				margin: [0, 0, 0, 10],
				font: "Roboto"
			},
			subheader: {
				fontSize: 14,
				bold: true,
				margin: [0, 10, 0, 5],
				font: "Roboto"
			},
			listHeader: {
				fontSize: 12,
				bold: true,
				margin: [0, 10, 0, 5],
				font: "Roboto"
			},
			tableHeader: {
				bold: true,
				fontSize: 12,
				color: "black",
				font: "Roboto"
			},
			body: {
				fontSize: 12,
				margin: [0, 5, 0, 5],
				font: "Roboto"
			},
			rightAlign: {
				fontSize: 12,
				margin: [0, 5, 0, 5],
				alignment: "right",
				font: "Roboto"
			},
			tableExample: {
				margin: [0, 5, 0, 15],
				lineHeight: 1.5
			}
		}
	};

	// Create PDFKit document
	const pdfDoc = printer.createPdfKitDocument(docDefinition);
	pdfDoc.pipe(fs.createWriteStream(receiptPath));
	pdfDoc.end();

	return receiptPath;
};

// Stripe payment
const createPaymentIntent = async (amount, currency, customer) => {
	if (!customer) {
		console.error("No customer given!");
		return null;
	}
	
	const customerSql = `SELECT c.CustomerID, c.UserID, u.Name, u.Email, a.AddressID, a.AddressTypeID, a.Street, a.City, a.State, a.PostalCode, a.Country FROM customers c LEFT JOIN users u ON c.UserID = u.UserID LEFT JOIN addresses a ON c.CustomerID = a.CustomerID WHERE a.AddressTypeID = 1 AND c.UserID = ?`;

	const originalTotal = Math.round(amount * 100);
	const taxPrice = originalTotal * 0.255;
	const newTotal = originalTotal + taxPrice;

	try {
		const [user] = await promisePool.query(customerSql, [customer.UserID]);
		if (!user.length) {
			throw ("Customer not found");
		}

		if (!user[0].Street || !user[0].PostalCode || !user[0].City) {
			throw ("Missing required address data!");
		}

		const stripeCustomer = await generateStripeCustomer(user[0]);
		console.log(stripeCustomer);
		
		const paymentIntent = await stripe.paymentIntents.create({
			amount: Math.round(newTotal), // Amount in cents
			currency: currency,
			customer: stripeCustomer.id,
			payment_method_types: ["card"]
		});
		
		await storeTaxTransaction(paymentIntent.id, taxPrice);

		console.log(paymentIntent);
		return paymentIntent;
	} catch (error) {
		throw (`Error while trying to pay: ${error}`);
	}
};

const generateStripeCustomer = async (customer) => {
	if (!customer || typeof customer !== "object") {
		console.error("Missing customer object for Stripe customer user!");
		return null;
	}
	
	const stripeCustomer = await stripe.customers.create({
		name: customer.Name,
		email: customer.Email,
		address: {
			line1: customer.Street,
			postal_code: customer.PostalCode,
			city: customer.City,
			country: "FI" // Finland
		},
		metadata: { userId: customer.UserID }
	});
	return stripeCustomer;
};

const storeTaxTransaction = async (paymentIntentId, taxAmount) => {
	console.log(taxAmount);
	try {
		await stripe.paymentIntents.update(paymentIntentId, {
			metadata: {
				tax_transaction: `Tax Amount: ${Math.round(taxAmount/100)} EUR`
			}
		});
		console.log(`Stored tax transaction for PaymentIntent ${paymentIntentId}`);
	} catch (error) {
		console.error("Error storing tax transaction:", error);
	}
};


////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

// Server routes
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////


// Webhook needs to be before the express json setting
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case "payment_intent.succeeded":
            const paymentIntent = event.data.object;

            await promisePool.query(
                "UPDATE orders SET PaymentStatus = ?, Status = ?, PaymentDate = NOW() WHERE TransactionID = ?",
                ["paid", "processing", paymentIntent.id]
            );
            console.log(`Payment succeeded for TransactionID: ${paymentIntent.id}`);
            break;

        case "payment_intent.payment_failed":
            const failedIntent = event.data.object;

            await promisePool.query(
                "UPDATE orders SET PaymentStatus = ?, Status = ? WHERE TransactionID = ?",
                ["failed", "verifying", failedIntent.id]
            );
            console.log(`Payment failed for TransactionID: ${failedIntent.id}`);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    // Acknowledge receipt of the event
    res.status(200).send("Webhook received");
});

app.use(express.json());

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
		const [status, message] = handleServerError(error);
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
		
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });	}
});

app.get("/api/routes", async (req, res) => {
	console.log("API routes accessed");
	const getRoutesArray = [];
	const postRoutesArray = [];
	const patchRoutesArray = [];
	const deleteRoutesArray = [];
	const otherRoutesArray = [];
	try {
		const routes = getAllRoutes(app);

		for (const route of routes) {
			if (route.method === "GET") {
				getRoutesArray.push(route);
			} else if (route.method === "POST") {
				postRoutesArray.push(route);
			} else if (route.method === "PATCH") {
				patchRoutesArray.push(route);
			} else if (route.method === "DELETE") {
				deleteRoutesArray.push(route);
			} else {
				otherRoutesArray.push(route);
			}
		}

		const routeObj = { getRoutes: getRoutesArray, postRoutes: postRoutesArray, patchRoutes: patchRoutesArray, deleteRoutes: deleteRoutesArray, otherRoutes: otherRoutesArray };
		return res.status(200).json(routeObj);
	} catch (error) {
		const [status, message] = handleServerError(error);
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
			operation = "purgePartIndices completed successfully";
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

		if (method === "reset") {
			let resetError = [];
			const purge = await purgePartIndices("true");
			if (purge === null) {
				resetError.push(" 'Purging failed when trying to reset'");
			}
			const create = await createPartIndex();
			if (create === null) {
				resetError.push(" 'Creating indices failed when trying to reset'");
			}
			const insert = await insertToPartIndex();
			if (insert === null) {
				resetError.push(" 'Inserting to indices failed when trying to reset'");
			}
			if (resetError.length !== 0) {
				operation = `Something went wrong with the reset, reason: ${resetError}`;
				return res.status(400).json({ message: operation });
			}
			operation = "Resetting completed successfully";
		}

		return res.status(200).json({ message: operation });
	} catch (error) {
		const [status, message] = handleServerError(error);
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
		const [status, message] = handleServerError(error);
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
		const [status, message] = handleServerError(error);
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
				partObj[item] = { 
									Name: `${item} did not return any results with your current settings!`,
									Reason: "No compatible options found with the provided settings.",
									ShortReason: "No match" 
								};
			}
		}

		const totalPrice = Object.values(partObj).reduce((sum, part) => sum + (parseFloat(part.Price) || 0), 0).toFixed(2);
		console.log(totalPrice);

		return res.status(200).json({partObj: partObj, totalPrice: totalPrice});
	} catch (error) {
		const [status, message] = handleServerError(error);
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
		
		const processedUsers = users.map((user) => {
			const isAdmin = user.RoleID === 4;

			// Exclude sensitive information like hashed password
			const { Password, ...userData } = user;
			return { ...userData, isAdmin };
		});
		return res.status(200).json(processedUsers);
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.get("/api/users/id", idValidator, async (req, res) => {
	console.log("API search users by id accessed");

	const id = req.validatedId;

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
		const [status, message] = handleServerError(error);
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
		
		const processedUsers = users.map((user) => {
			const isAdmin = user.RoleID === 4;

			// Exclude sensitive information like hashed password
			const { Password, ...userData } = user;
			return { ...userData, isAdmin };
		});
		return res.status(200).json(processedUsers);
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.get("/api/users/id", idValidator, async (req, res) => {
	console.log("API search users by id accessed");

	const id = req.validatedId;

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
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

// Signing up
app.post("/api/users/signup", formFieldsValidator(userSchema), userFieldsValidator, async (req, res) => {
	console.log("API user signup accessed");

	const { Name, Email, Password } = req.validatedForm;

	try {
		// Check if email exists
		const emailCheckSql = "SELECT Email FROM users WHERE Email = ?";
		const [user] = await promisePool.query(emailCheckSql, [Email]);
		if (user.length > 0) {
			return res.status(409).json({ message: "One or more fields already in use" });
		}

		// Hash password & insert data into db
		const hashedPassword = await bcrypt.hash(Password, 10);
		const insertSql = "INSERT INTO users (Name, Email, Password, RoleID) VALUES (?, ?, ?, ?)";
		const [result] = await promisePool.query(insertSql, [Name, Email, hashedPassword, 2]); // 2 = Customer
		const insertCustomer = "INSERT INTO customers (UserID) VALUES (?)";
		const [customer] = await promisePool.query(insertCustomer, result.insertId);
		return res.status(200).json({ message: "User registered successfully", id: result.insertId });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.post("/api/users/login", formFieldsValidator(loginSchema), userFieldsValidator, async (req, res) => {
	console.log("API users login accessed");

	const { Email, Password } = req.validatedForm;
	const sql = "SELECT * FROM users WHERE Email = ?";

	try {
		// [[user]] takes the first user in the array wile [user] returns the whole array and you need to specify user[0] each time otherwise
		const [[user], fields] = await promisePool.query(sql, [Email]);

		if (!user) {
			return res.status(404).json({ message: "Email or password is incorrect" });
		}

		// If the email is not an exact match
		if (user.Email !== Email) {
			return res.status(404).json({ message: "Email or password is incorrect" });
		}

		const match = await bcrypt.compare(Password, user.Password);
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
		const [status, message] = handleServerError(error);
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
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.get("/api/profile/addresses", authenticateSession, async (req, res) => {
	console.log("API search addresses by currentuser accessed");

	const id = req.user.UserID;

	const customerSql = "SELECT * FROM customers WHERE UserID = ?";
	const sql = "SELECT * FROM addresses WHERE CustomerID = ?";
	try {
		const [customer] = await promisePool.query(customerSql, [id]);
		if (!customer.length) {
			return res.status(401).json({ message: "User is not a customer!" });
		}

		const [addresses] = await promisePool.query(sql, [customer[0].CustomerID]);
		if (!addresses.length) {
			return res.status(404).json({ message: "No addresses found" });
		}

		return res.status(200).json(addresses);
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.get("/api/profile/orders", authenticateSession, async (req, res) => {
	console.log("API search parts by id accessed");

	const id = req.user.UserID;

	const customerSql = "SELECT * FROM customers WHERE UserID = ?";
	const sql = "SELECT * FROM orders WHERE CustomerID = ?";
	try {
		const [customer] = await promisePool.query(customerSql, [id]);
		if (!customer.length) {
			return res.status(401).json({ message: "User is not a customer!" });
		}

		const [orders] = await promisePool.query(sql, [customer[0].CustomerID]);
		if (!orders.length) {
			return res.status(404).json({ message: "No orders found" });
		}

		// Items needs to be parsed
		const parseInventory = orders.map((item) => ({
			...item,
			Items: item.Items ? JSON.parse(item.Items) : null
		}));

		return res.status(200).json(parseInventory);
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.get("/api/profile/orders/:id", idValidator, authenticateSession, async (req, res) => {
	console.log("API search parts by id accessed");

	const userId = req.user.UserID;
	const orderId = req.validatedId;

	const customerSql = "SELECT * FROM customers WHERE UserID = ?";
	const sql = "SELECT * FROM orders WHERE CustomerID = ? AND OrderID = ?";
	try {
		const [customer] = await promisePool.query(customerSql, [userId]);
		if (!customer.length) {
			return res.status(401).json({ message: "User is not a customer!" });
		}

		const [orders] = await promisePool.query(sql, [customer[0].CustomerID, orderId]);
		if (!orders.length) {
			return res.status(404).json({ message: "No orders found" });
		}

		// Items needs to be parsed
		const parseInventory = orders.map((item) => ({
			...item,
			Items: item.Items ? JSON.parse(item.Items) : null
		}));

		return res.status(200).json(parseInventory);
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

// Update own user credentials
app.patch("/api/profile", authenticateSession, profileImgUpload.single("ProfileImage"), formFieldsValidator(userUpdateSchema), userFieldsValidator, async (req, res) => {
		console.log("API update own credentials accessed");
		const userId = req.user.UserID;
		const oldProfileImage = req.user.ProfileImage;
		const jsonFormFields = req.validatedForm;
		const ProfileImage = req.file; // Profile image

		try {
			const match = await bcrypt.compare(jsonFormFields.currentPassword, req.user.Password);
			if (!match) {
				return res.status(403).json({ message: "Current password is incorrect" });
			}

			let hashedPassword = null;
			const allowedFields = ["Name", "Email", "Password", "Gender", "ProfileImage"];

			if (ProfileImage) {
				if (oldProfileImage && oldProfileImage !== null && oldProfileImage !== "default-profile.png") {
					const imagePath = path.join(__dirname, "..", "public", "profile_images", oldProfileImage);
					await deleteFile(imagePath);
				}
			}

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
							if (key === "Password") {
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
			const [status, message] = handleServerError(error);
			return res.status(status).json({ message: message });

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
		

		return res.status(200).json(parts);
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

// Route for deleting parts
app.delete("/api/part/delete/:part/:id", idValidator, authenticateSession, async (req, res) => {
	console.log("API delete part accessed");
	
	const { part } = req.params; 
	const id = req.validatedId;
	
	const sql = `DELETE FROM ${part} WHERE ID = ?`;
	try {
		const [part] = await promisePool.query(sql, [id]);
		if (!part.length) {
			return res.status(404).json({ message: "Part not found" });
		}

		return res.status(200).json({ message: `${part} deleted succesfully` });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.patch("/api/part/update/:part/:id", authenticateSession, productImgUpload.single("ProductImage"), idValidator, tableValidator(partNameSchema, "partName"), formFieldsValidator(partSchema), async (req, res) => {
		console.log("API part accessed");
		const { part } = req.params;
		const id = req.validatedId;
		const jsonFormFields = req.validatedForm;
		const ProductImage = req.file; // Product image
		const allowedFieldsSql = `SELECT DISTINCT column_name FROM information_schema.columns WHERE table_name IN ('chassis', 'cpu', 'cpu_cooler', 'gpu', 'motherboard', 'memory', 'storage', 'psu') AND table_schema = '${process.env.DB_NAME}';`;

		try {
			const [allowedColumns] = await promisePool.query(allowedFieldsSql);
			const allowedFields = allowedColumns.map(item => item.column_name);

			// SQL query to update part data
			// updateQuery allows for multiple fields to be updated simultaneously
			let updateQuery = `UPDATE ${part} SET `;
			let queryParams = [];

			// More dynamic way of updating parts
			for (const key in jsonFormFields) {
				console.log(key);
				if (allowedFields.includes(key)) {
					if (jsonFormFields.hasOwnProperty(key)) {
						if (jsonFormFields[key] !== "") {
							updateQuery += key.charAt(0).toUpperCase() + key.slice(1) + " = ?, "; // Since the first letters are capitalized in the db
							queryParams.push(jsonFormFields[key]);	
						}
					}
				}
			}

			if (ProductImage) {
				const ProductImage_name = ProductImage.filename;
				updateQuery += "Image = ?, ";
				queryParams.push(ProductImage_name);
			}

			// Remove trailing comma and space
			if (queryParams.length > 0) {
				updateQuery = updateQuery.slice(0, -2);
			}

			updateQuery += " WHERE ID = ?";
			queryParams.push(parseInt(id));

			const [result] = await promisePool.query(updateQuery, queryParams);
			if (result.affectedRows === 0) {
				return res.status(404).json({ message: "Item not found" });
			}

			return res.status(200).json({ message: "Part updated successfully" });
		} catch (error) {
			const [status, message] = handleServerError(error);
			return res.status(status).json({ message: message });

		}
	}
);

app.get("/api/part/id", tableValidator(partNameSchema, "partName"), idValidator, async (req, res) => {
	console.log("API search parts by id accessed");

	const id = req.validatedId;
	const partName = req.query.partName; // Get the table name from the query

	const sql = `SELECT * FROM ${partName} WHERE ID = ?`;
	try {
		const [part] = await promisePool.query(sql, [id]);
		if (!part.length) {
			return res.status(404).json({ message: "Part not found" });
		}

		return res.status(200).json(part);
	} catch (error) {
		const [status, message] = handleServerError(error);
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

		

		return res.status(200).json(parseInventory);
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});


app.post("/api/inventory/add", authenticateSession, formFieldsValidator(inventorySchema), async (req, res) => {
	console.log("API add inventory accessed");

	const userId = req.user.UserID;
	const jsonFormFields = req.validatedForm;
	const { PartTypeID, Name, Manufacturer, ModelNumber, SerialNumber, Price, Available, AdditionalDetails } = jsonFormFields;	
	const allowedFields = ["PartTypeID", "Name", "Manufacturer", "ModelNumber", "SerialNumber", "Price", "Available", "AdditionalDetails"];

	try {
		if (req.user.RoleID !== 4) {
			return res.status(401).json({ message: "User is not an admin" });
		}

		let insertQuery = `INSERT INTO part_inventory SET `;
		let queryParams = [];

		// More dynamic way of updating content
		for (const key in jsonFormFields) {
			console.log(key);
			if (allowedFields.includes(key)) {
				if (jsonFormFields[key] !== "") {
					insertQuery += key.charAt(0).toUpperCase() + key.slice(1) + " = ?, ";
					queryParams.push(jsonFormFields[key]);
				}
			}
		}

		if (queryParams.length > 0) {
			insertQuery = insertQuery.slice(0, -2);
		}

		const [result] = await promisePool.query(insertQuery, queryParams);
		return res.status(200).json({ message: "Added part to inventory successfully", id: result.insertId });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.get("/api/inventory/:id", idValidator, async (req, res) => {
	console.log("API search parts by id accessed");

	const id = req.validatedId;

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
		const [status, message] = handleServerError(error);
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
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.get("/api/orders/:id", idValidator, async (req, res) => {
	console.log("API search parts by id accessed");

	const id = req.validatedId;

	const sql = "SELECT * FROM orders WHERE OrderID = ?";
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
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.post("/api/orders/add", authenticateSession, formFieldsValidator(orderSchema), async (req, res) => {
	console.log("API add order accessed");

	const userId = req.user.UserID;
	const jsonFormFields = req.validatedForm;
	const { TotalPrice,  Items, } = jsonFormFields;
	const currency = "eur";
	const allowedFields = ["Items"];
	const customerSql = "SELECT * FROM customers WHERE UserID = ?";

	try {
		if (!TotalPrice || !Items) {
			return res.status(400).json({ message: "All required form fields were not provided" });
		}

		const [customer] = await promisePool.query(customerSql, [userId]);
		if (!customer.length) {
			return res.status(401).json({ message: "User is not a customer!" });
		}

		const calculatedPrice = Items.map(item => item)
			.filter(i => i && i.Price || i.totalPrice)
			.reduce((acc, i) => acc + (parseFloat(i.Price || i.totalPrice) || 0) * parseInt(i.quantity || 1), 0)
		.toFixed(2);
		
		const paymentIntent = await createPaymentIntent(calculatedPrice, currency, customer[0]);

		let insertQuery = `INSERT INTO orders SET `;
		let queryParams = [];

		// More dynamic way of updating content
		for (const key in jsonFormFields) {
			console.log(key);
			if (allowedFields.includes(key)) {
				if (jsonFormFields[key] !== "") {
					insertQuery += key.charAt(0).toUpperCase() + key.slice(1) + " = ?, ";
					if (typeof jsonFormFields[key] === "object") {
						queryParams.push(JSON.stringify(jsonFormFields[key]));
					} else {
						queryParams.push(jsonFormFields[key]);
					}
				}
			}
		}

		if (queryParams.length > 0) {
			insertQuery = insertQuery.slice(0, -2);
		}

		// OrderID, OrderTypeID, CustomerID, ReceiptID, OrderDate, Status, TotalPrice, Currency, Items, PaymentMethod, PaymentProvider, TransactionID, PaymentStatus, PaymentDate, ModifiedAt
		insertQuery += ", CustomerID = ?, TotalPrice = ?, OrderTypeID = ?, ReceiptID = ?, Status = ?, Currency = ?, PaymentProvider = ?, TransactionID = ?, PaymentMethod = ?, PaymentStatus = ?";
		queryParams.push(parseInt(customer[0].CustomerID), paymentIntent.amount / 100, 1, generateReceiptId(customer[0].CustomerID), "verifying", paymentIntent.currency, "stripe", paymentIntent.id, paymentIntent.payment_method_types, "unpaid");		

		const [result] = await promisePool.query(insertQuery, queryParams);
		return res.status(200).json({ message: "Added order successfully", id: result.insertId, clientSecret: paymentIntent.client_secret });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.patch("/api/orders/update/:id", authenticateSession, idValidator, async (req, res) => {
	console.log("API update order accessed");
	
	const userId = req.user.UserID;
	const orderId = req.validatedId;

	const customerSql = "SELECT * FROM customers WHERE UserID = ?";
	const currentOrderSql = "SELECT * FROM orders WHERE OrderID = ?";

	try {
		const [customer] = await promisePool.query(customerSql, [userId]);
		if (!customer.length) {
			return res.status(401).json({ message: "User is not a customer!" });
		}
		
		const [currentOrder] = await promisePool.query(currentOrderSql, [orderId]);
		if (!currentOrder.length) {
			return res.status(404).json({ message: "Order not found!" });
		}
		const totalPrice = parseFloat(currentOrder[0].TotalPrice);
		
		const paymentIntent = await createPaymentIntent(totalPrice, "eur", customer[0]);

		let updateQuery = `UPDATE orders SET `;
		let queryParams = [];

		updateQuery += "Status = ?, Currency = ?, PaymentProvider = ?, TransactionID = ?, PaymentMethod = ?, PaymentStatus = ? ";
		queryParams.push("verifying", "eur", "stripe", paymentIntent.id, "card", "verifying");

		updateQuery += "WHERE OrderID = ?";
		queryParams.push(orderId);
	
		const [order] = await promisePool.query(updateQuery, queryParams);
		if (order.affectedRows === 0) {
			return res.status(404).json({ message: "Order not updated!" });
		}

		return res.status(200).json({ message: `${order} updated succesfully`, clientSecret: paymentIntent.client_secret });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.patch("/api/orders/update/:id/verify", authenticateSession, idValidator, formFieldsValidator(orderSchema), async (req, res) => {
    console.log("API verify order accessed");
    
	const jsonFormFields = req.validatedForm;
	const { TransactionID } = jsonFormFields;
    const userId = req.user.UserID;
    const orderId = req.validatedId;

	const customerSql = `SELECT c.CustomerID, c.UserID, u.Name, u.Email, a.AddressID, a.AddressTypeID, a.Street, a.City, a.State, a.PostalCode, a.Country FROM customers c LEFT JOIN users u ON c.UserID = u.UserID LEFT JOIN addresses a ON c.CustomerID = a.CustomerID WHERE a.AddressTypeID = 1 AND c.UserID = ?`;	
	
    const currentOrderSql = "SELECT * FROM orders WHERE OrderID = ?";

    try {
		if (!TransactionID) {
			return res.status(400).json({ message: "Transaction ID is required" });
		}

        const [customer] = await promisePool.query(customerSql, [userId]);
        if (!customer.length) {
            return res.status(401).json({ message: "User is not a customer!" });
        }
        
        const [currentOrder] = await promisePool.query(currentOrderSql, [orderId]);
        if (!currentOrder.length) {
            return res.status(404).json({ message: "Order not found!" });
        }

        // Validate payment with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(TransactionID);
        if (!paymentIntent || paymentIntent.status !== "succeeded") {
            return res.status(400).json({ message: "Payment not verified with Stripe" });
        }

        if (paymentIntent.id !== currentOrder[0].TransactionID) {
            return res.status(400).json({ message: "Transaction ID mismatch" });
        }

        // Update order to "paid"
        const updateQuery = "UPDATE orders SET PaymentStatus = ?, Status = ?, PaymentDate = NOW() WHERE OrderID = ?";
        const [order] = await promisePool.query(updateQuery, ["paid", "processing", orderId]);

        if (order.affectedRows === 0) {
            return res.status(404).json({ message: "Order not verified" });
        }

        const [updatedOrder] = await promisePool.query(currentOrderSql, [orderId]);
        if (!updatedOrder.length) {
            return res.status(404).json({ message: "Order not found!" });
        }
		
		let parsedItems;
		if (typeof updatedOrder[0].Items !== "object") {
		 	parsedItems = JSON.parse(updatedOrder[0].Items);
		}
		console.log(parsedItems);

		const receipt = await generateReceipt(updatedOrder[0], customer[0], parsedItems, updatedOrder[0].TotalPrice, paymentIntent);
		if (!receipt) {
			console.warn("Failed to generate receipt");
		}
		
        return res.status(200).json({ message: `Order ${orderId} verified successfully` });
    } catch (error) {
        const [status, message] = handleServerError(error);
        return res.status(status).json({ message: message });
    }
});


// Route for viewing customers
app.get("/api/users/customers", routePagination, async (req, res) => {
	console.log("API inventory accessed");

	const { items, offset } = req.pagination;
	const sql = `SELECT c.CustomerID AS CustomerID, c.*, u.*, a.AddressID, a.AddressTypeID, a.Street, a.City, a.State, a.PostalCode, a.Country, o.OrderID, o.OrderTypeID, o.ReceiptID ,o.OrderDate, o.Status, o.TotalPrice, o.Items, o.PaymentMethod, o.PaymentStatus FROM customers c LEFT JOIN users u ON c.UserID = u.UserID LEFT JOIN addresses a ON c.CustomerID = a.CustomerID LEFT JOIN orders o ON c.CustomerID = o.CustomerID LIMIT ? OFFSET ?`;	
	//const sql = `SELECT c.*, u.*, a.* FROM customers c LEFT JOIN users u ON c.UserID = u.UserID LEFT JOIN addresses a ON c.CustomerID = a.CustomerID LIMIT ? OFFSET ?`;

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
				OrderID,
				OrderTypeID,
				ReceiptID,
				OrderDate,
				Status,
				TotalPrice,
				Items,
				PaymentMethod,
				PaymentStatus,
				...customerData
			} = item;
			return {
				UserData: { ...customerData, Name, Gender, ProfileImage, RoleID, Email, Password },
				AddressData: { AddressID, AddressTypeID, Street, City, State, PostalCode, Country },
				OrderData: {OrderID, OrderTypeID, ReceiptID, OrderDate, Status, TotalPrice, Items, PaymentMethod, PaymentStatus }
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
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.get("/api/users/customers/:id", idValidator, async (req, res) => {
	console.log("API search parts by id accessed");

	const id = req.validatedId;
	const sql = `SELECT c.CustomerID AS CustomerID, c.*, u.*, a.AddressID, a.AddressTypeID, a.Street, a.City, a.State, a.PostalCode, a.Country, o.OrderID, o.OrderTypeID, o.ReceiptID ,o.OrderDate, o.Status, o.TotalPrice, o.Items, o.PaymentMethod, o.PaymentStatus FROM customers c LEFT JOIN users u ON c.UserID = u.UserID LEFT JOIN addresses a ON c.CustomerID = a.CustomerID LEFT JOIN orders o ON c.CustomerID = o.CustomerID LIMIT ? OFFSET ? WHERE c.CustomerID = ?`;
	//const sql = `SELECT c.*, u.*, a.* FROM customers c LEFT JOIN users u ON c.UserID = u.UserID LEFT JOIN addresses a ON c.CustomerID = a.CustomerID WHERE c.CustomerID = ? `;

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
				CustomerID,
			} = item;
			return {
				UserData: { CustomerID, Name, Gender, ProfileImage, RoleID, Email, Password },
				AddressData: { AddressID, AddressTypeID, Street, City, State, PostalCode, Country }
			};
		});

		return res.status(200).json(parseCustomers);
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.get("/api/addresstypes", routePagination, async (req, res) => {
	console.log("API addresstypes accessed");

	const sql = "SELECT * FROM address_types";
	try {
		const [address_types] = await promisePool.query(sql);

		return res.status(200).json(address_types);
	} catch (error) {
		const [status, message] = handleServerError(error);
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
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.get("/api/users/customers/addresses/:id", idValidator, async (req, res) => {
	console.log("API search parts by id accessed");

	const id = req.validatedId;

	const sql = "SELECT * FROM addresses WHERE AddressID = ?";
	try {
		const [addresses] = await promisePool.query(sql, [id]);
		if (!addresses.length) {
			return res.status(404).json({ message: "Address not found" });
		}

		return res.status(200).json(addresses);
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.post("/api/users/customers/addresses/add", authenticateSession, formFieldsValidator(addressSchema), async (req, res) => {
	console.log("API add address accessed");

	const userId = req.user.UserID;
	const jsonFormFields = req.validatedForm;
	const { CustomerID, AddressTypeID, Street, City, State, PostalCode, Country } = jsonFormFields;	
	const allowedFields = ["AddressID", "AddressTypeID", "Street", "City", "State", "PostalCode", "Country"];
	const customerSql = "SELECT * FROM customers WHERE UserID = ?";

	try {
		const match = await bcrypt.compare(jsonFormFields.currentPassword, req.user.Password);
		if (!match) {
			return res.status(403).json({ message: "Current password is incorrect" });
		}

		if (!Street || !City || !PostalCode || !Country) {
			return res.status(400).json({ message: "All required form fields were not provided" });
		}
		const [customer] = await promisePool.query(customerSql, [userId]);
		if (!customer.length) {
			return res.status(401).json({ message: "User is not a customer!" });
		}

		let insertQuery = `INSERT INTO addresses SET `;
		let queryParams = [];

		// More dynamic way of updating content
		for (const key in jsonFormFields) {
			console.log(key);
			if (allowedFields.includes(key)) {
				if (jsonFormFields[key] !== "") {
					insertQuery += key.charAt(0).toUpperCase() + key.slice(1) + " = ?, ";
					queryParams.push(jsonFormFields[key]);
				}
			}
		}

		if (queryParams.length > 0) {
			insertQuery = insertQuery.slice(0, -2);
		}

		insertQuery += ", CustomerID = ?";
		queryParams.push(parseInt(customer[0].CustomerID));

		const [result] = await promisePool.query(insertQuery, queryParams);
		return res.status(200).json({ message: "Added address successfully", id: result.insertId });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});


app.patch("/api/users/customers/addresses/update", authenticateSession, formFieldsValidator(addressSchema), async (req, res) => {
	console.log("API patch customer address accessed");

	const userId = req.user.UserID;
	const jsonFormFields = req.validatedForm;
	const { AddressTypeID, Street, City, State, PostalCode, Country } = jsonFormFields;	
	const allowedFields = ["AddressID", "CustomerID", "AddressTypeID", "Street", "City", "State", "PostalCode", "Country"];
	const customerSql = "SELECT * FROM customers WHERE UserID = ?";

	try {
		const match = await bcrypt.compare(jsonFormFields.currentPassword, req.user.Password);
		if (!match) {
			return res.status(403).json({ message: "Current password is incorrect" });
		}

		const [customer] = await promisePool.query(customerSql, [userId]);
		if (!customer.length) {
			return res.status(401).json({ message: "User is not a customer!" });
		}

		// SQL query to update part data
		// updateQuery allows for multiple fields to be updated simultaneously
		let updateQuery = `UPDATE addresses SET `;
		let queryParams = [];

		// More dynamic way of updating content
		for (const key in jsonFormFields) {
			console.log(key);
			if (allowedFields.includes(key)) {
				if (jsonFormFields.hasOwnProperty(key)) {
					if (jsonFormFields[key] !== "") {
						updateQuery += key.charAt(0).toUpperCase() + key.slice(1) + " = ?, "; // Since the first letters are capitalized in the db
						queryParams.push(jsonFormFields[key]);
					}
				}
			}
		}

		// Remove trailing comma and space
		if (queryParams.length > 0) {
			updateQuery = updateQuery.slice(0, -2);
		}

		updateQuery += " WHERE CustomerID = ? AND AddressTypeID = ?";
		queryParams.push(parseInt(customer[0].CustomerID));
		queryParams.push(parseInt(AddressTypeID));

		const [result] = await promisePool.query(updateQuery, queryParams);
		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Address not found" });
		}

		return res.status(200).json({ message: "Address updated successfully" });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });

	}
});


app.get("/api/text-content", routePagination, tableSearch("content"), async (req, res) => {
	console.log("API content accessed");

	const { items, offset } = req.pagination;
	const searchTerms = req.searchTerms;
	let sql;
	let notOperator = "";
	let sqlParams = [];

	let searchQuery = " WHERE 1=1";
	
	if (searchTerms.inverted) {
		notOperator = searchTerms.strict === true ? "!" : "NOT ";
	}

	const ignoreColumns = ["strict", "inverted"];

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

	sql = `SELECT * FROM content ${searchQuery} LIMIT ? OFFSET ?`;
	sqlParams.push(items, offset); // Push pagination params after search params

	try {
		const [content] = await promisePool.query(sql, sqlParams);

        const contentMap = {};
		for (const row of content) {
			if (!contentMap[row.Site_Identifier]) {
				contentMap[row.Site_Identifier] = {};
			}
			contentMap[row.Site_Identifier][row.Language] = row.Content_Text;
		}

		return res.status(200).json({content: content, contentMap: contentMap});
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.get("/api/text-content/identifiers", async (req, res) => {
	console.log("API content accessed");
	const sql = "SELECT DISTINCT Site_Identifier FROM content";
	const sql2 = "SELECT DISTINCT Language FROM content";

	try {
		const [Site_Identifier] = await promisePool.query(sql);
		const [Language] = await promisePool.query(sql2);
		
		const identifiersMap = Site_Identifier.map(item => item.Site_Identifier);
		const LanguageMap = Language.map(item => item.Language);

		return res.status(200).json({ identifiers: identifiersMap, language: LanguageMap  });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.patch("/api/text-content/delete/:id", idValidator, authenticateSession, async (req, res) => {
	console.log("API delete content accessed");
	
	const id = req.validatedId;
	const sql = `UPDATE content SET Status = 'deleted' WHERE ContentID = ?`;
	try {
		const [content] = await promisePool.query(sql, [id]);
		if (content.affectedRows === 0) {
			return res.status(404).json({ message: "Content not found" });
		}

		return res.status(200).json({ message: `${content} deleted succesfully` });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});

app.patch("/api/text-content/update/:id", authenticateSession, idValidator, formFieldsValidator(contentSchema), async (req, res) => {
	console.log("API patch content accessed");
	const id = req.validatedId;
	const jsonFormFields = req.validatedForm;
	const allowedFieldsSql = `SELECT DISTINCT column_name FROM information_schema.columns WHERE table_name IN ('content') AND table_schema = '${process.env.DB_NAME}';`;

	try {
		if (req.user.RoleID !== 4) {
			return res.status(401).json({ message: "User is not an admin" });
		}
		const [allowedColumns] = await promisePool.query(allowedFieldsSql);
		const allowedFields = allowedColumns.map(item => item.column_name);

		// SQL query to update part data
		// updateQuery allows for multiple fields to be updated simultaneously
		let updateQuery = `UPDATE content SET `;
		let queryParams = [];

		// More dynamic way of updating content
		for (const key in jsonFormFields) {
			console.log(key);
			if (allowedFields.includes(key)) {
				if (jsonFormFields.hasOwnProperty(key)) {
					if (jsonFormFields[key] !== "") {
						updateQuery += key.charAt(0).toUpperCase() + key.slice(1) + " = ?, "; // Since the first letters are capitalized in the db
						queryParams.push(jsonFormFields[key]);
					}
				}
			}
		}

		// Remove trailing comma and space
		if (queryParams.length > 0) {
			updateQuery = updateQuery.slice(0, -2);
		}

		updateQuery += " WHERE ContentID = ?";
		queryParams.push(parseInt(id));

		const [result] = await promisePool.query(updateQuery, queryParams);
		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Item not found" });
		}

		return res.status(200).json({ message: "Content updated successfully" });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });

	}
});

app.patch("/api/text-content/update", authenticateSession, formFieldsValidator(contentSchema), async (req, res) => {
	console.log("API patch content accessed");
	const jsonFormFields = req.validatedForm;
	const allowedFieldsSql = `SELECT DISTINCT column_name FROM information_schema.columns WHERE table_name IN ('content') AND table_schema = '${process.env.DB_NAME}';`;
	const searchKeys = ["Site_Identifier", "Language", "Version"];

	try {
		if (req.user.RoleID !== 4) {
			return res.status(401).json({ message: "User is not an admin" });
		}
		if (jsonFormFields.Site_Identifier === "" || jsonFormFields.Language === "") {
			return res.status(400).json({ message: "All identifier fields are not filled" });
		}

		const [allowedColumns] = await promisePool.query(allowedFieldsSql);
		//const allowedFields = allowedColumns.map(item => item.column_name);
		const allowedFields = ["Main_Tag", "Content_Text", "Content_Type", "Status"];

		// SQL query to update part data
		// updateQuery allows for multiple fields to be updated simultaneously
		let updateQuery = `UPDATE content SET `;
		let queryParams = [];

		// More dynamic way of updating content
		for (const key in jsonFormFields) {
			console.log(key);
			if (allowedFields.includes(key)) {
				if (jsonFormFields.hasOwnProperty(key)) {
					if (jsonFormFields[key] !== "") {
						updateQuery += key.charAt(0).toUpperCase() + key.slice(1) + " = ?, "; // Since the first letters are capitalized in the db
						queryParams.push(jsonFormFields[key]);
					}
				}
			}
		}

		// Remove trailing comma and space
		if (queryParams.length > 0) {
			updateQuery = updateQuery.slice(0, -2);
		}

		updateQuery += " WHERE Site_Identifier = ?";
		queryParams.push(jsonFormFields.Site_Identifier);

		updateQuery += " AND Language = ?";
		queryParams.push(jsonFormFields.Language);

		if (jsonFormFields.Version !== "") {
			updateQuery += " AND Version = ?";
			queryParams.push(jsonFormFields.Version);
		}

		const [result] = await promisePool.query(updateQuery, queryParams);
		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Item not found" });
		}

		return res.status(200).json({ message: "Content updated successfully" });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });

	}
});

/*
// Check this updated patch route
app.patch("/api/text-content/update/:id", authenticateSession, idValidator, formFieldsValidator(contentSchema), async (req, res) => {
	console.log("API patch content accessed");
	const id = req.validatedId;
	const jsonFormFields = req.validatedForm;
	const allowedFieldsSql = `
		SELECT DISTINCT column_name 
		FROM information_schema.columns 
		WHERE table_name = 'content' 
		  AND table_schema = ?
	`;

	try {
		// Fetch allowed fields from the database schema
		const [allowedColumns] = await promisePool.query(allowedFieldsSql, [process.env.DB_NAME]);
		const allowedFields = allowedColumns.map(item => item.column_name);

		// Dynamically construct fields and values for the update query
		let fieldUpdates = [];
		let queryParams = [];

		for (const key in jsonFormFields) {
			if (allowedFields.includes(key) && jsonFormFields[key] !== "") {
				fieldUpdates.push(`${key.charAt(0).toUpperCase() + key.slice(1)} = ?`);
				queryParams.push(jsonFormFields[key]);
			}
		}

		// Ensure at least one field is being updated
		if (fieldUpdates.length === 0) {
			return res.status(400).json({ message: "No valid fields provided for update" });
		}

		// Add condition to update the specific content by ID
		const updateQuery = `
			UPDATE content 
			SET ${fieldUpdates.join(", ")} 
			WHERE ContentID = ?
		`;
		queryParams.push(parseInt(id));

		// Execute the update query
		const [result] = await promisePool.query(updateQuery, queryParams);
		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Item not found or no changes made" });
		}

		return res.status(200).json({ message: "Content updated successfully" });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});
*/
/*
app.post("/api/text-content/add", formFieldsValidator(contentSchema), authenticateSession, async (req, res) => {
	console.log("API add content accessed");

	const userId = req.user.UserID;
	const jsonFormFields = req.validatedForm;
	const { Site_Identifier, Main_Tag, Language, Content_Text, Content_Type } = jsonFormFields;	
	const allowedFields = ["Site_Identifier", "Main_Tag", "Language", "Content_Text", "Content_Type"];

	try {
		if (!Site_Identifier || !Content_Text) {
			return res.status(400).json({ message: "All required form fields were not provided" });
		}

		let fieldKeys = [];
		let valuePlaceholders = [];
		let queryParams = [];

		// Dynamically build fields and values for insertion
		for (const key in jsonFormFields) {
			if (allowedFields.includes(key) && jsonFormFields[key] !== "") {
				fieldKeys.push(key.charAt(0).toUpperCase() + key.slice(1)); // Capitalize the first letter if needed
				valuePlaceholders.push("?");
				queryParams.push(jsonFormFields[key]);
			}
		}

		// Add `Added_By` field
		fieldKeys.push("Added_By");
		valuePlaceholders.push("?");
		queryParams.push(parseInt(userId));

		// Construct final query
		const insertQuery = `
			INSERT INTO content (${fieldKeys.join(", ")})
			VALUES (${valuePlaceholders.join(", ")})
		`;

		const [result] = await promisePool.query(insertQuery, queryParams);
		return res.status(200).json({ message: "Added content successfully", id: result.insertId });
	} catch (error) {
		const [status, message] = handleServerError(error);
		return res.status(status).json({ message: message });
	}
});
*/

// Similar way to update, worse than the other way
app.post("/api/text-content/add", formFieldsValidator(contentSchema), authenticateSession, async (req, res) => {
	console.log("API add content accessed");

	const userId = req.user.UserID;
	const jsonFormFields = req.validatedForm;
	const { Site_Identifier, Main_Tag, Language, Content_Text, Content_Type } = jsonFormFields;	
	const allowedFields = ["Site_Identifier", "Main_Tag", "Language", "Content_Text", "Content_Type"];

	try {
		if (req.user.RoleID !== 4) {
			return res.status(401).json({ message: "User is not an admin" });
		}

		if (!Site_Identifier || !Content_Text) {
			return res.status(400).json({ message: "All required form fields were not provided" });
		}

		let insertQuery = `INSERT INTO content SET `;
		let queryParams = [];

		// More dynamic way of updating content
		for (const key in jsonFormFields) {
			console.log(key);
			if (allowedFields.includes(key)) {
				if (jsonFormFields[key] !== "") {
					insertQuery += key.charAt(0).toUpperCase() + key.slice(1) + " = ?, ";
					queryParams.push(jsonFormFields[key]);
				}
			}
		}

		if (queryParams.length > 0) {
			insertQuery = insertQuery.slice(0, -2);
		}

		insertQuery += ", Added_By = ?";
		queryParams.push(parseInt(userId));

		const [result] = await promisePool.query(insertQuery, queryParams);
		return res.status(200).json({ message: "Added content successfully", id: result.insertId });
	} catch (error) {
		const [status, message] = handleServerError(error);
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
