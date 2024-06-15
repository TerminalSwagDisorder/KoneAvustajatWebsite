// Never run this in actual production

const crypto = require("crypto");
const fs = require("fs");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const newSecret = crypto.randomBytes(64).toString("hex");
const secret = `SESSION_SECRET=${newSecret}`;
const db_host = "DB_HOST=localhost";
const db_name = "DB_NAME=koneavustajat_db";

rl.question("Enter DB username: ", (db_user) => {
    rl.question("Enter DB password: ", (db_password) => {
        const env_data = `${secret}\n${db_host}\nDB_USER=${db_user}\nDB_PASSWORD=${db_password}\n${db_name}\n`;

        fs.writeFile("./.env", env_data, err => {
            if (err) {
                console.error("Error generating env file: ", err);
            } else {
                console.log("Env file successfully generated");
            }
            rl.close();
        });
    });
});
