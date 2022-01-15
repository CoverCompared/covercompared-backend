const dotenv = require("dotenv");
dotenv.config();
const { connect } = require('./../connect');

let seeder = async () => {
    await connect();

    const users = require("./users");

    console.log("User Seeding.");
    await users();

    console.log("DATABASE SEED SUCCESSFULLY.");
    process.exit();
}


seeder();
