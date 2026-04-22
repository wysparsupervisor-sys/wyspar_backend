require("dotenv").config();
const nodemailer = require("nodemailer");


const MailTransporter = nodemailer.createTransport({
    host: "smtp-pulse.com",
    secure: false,
    port: 587,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


module.exports = MailTransporter;