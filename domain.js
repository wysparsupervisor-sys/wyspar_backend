const HOST = "10.77.42.66";  //reasons explained in an equivalent file on frontend folder
const isProduction = process.env.NODE_ENV === "production";

const FRONTEND_URL = isProduction ? "https://www.wyspar.com" : `http://${HOST}:3000`;
const MEDIA_PUT_URL = isProduction ? process.env.MEDIA_PUT_URL : `http://${HOST}:8333`;

module.exports = { FRONTEND_URL, MEDIA_PUT_URL }  