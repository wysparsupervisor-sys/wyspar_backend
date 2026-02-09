const { body } = require("express-validator");
const ProcessArticlePost = require("./controllers/article");
const ProcessStatementPost = require("./controllers/statement");
const schools = require("../../../../../lib/data/schools");
const POST_TYPES = require("../../../../../lib/data/post-types");
const POST_CATEGORIES = require("../../../../../lib/data/post-categories");
const GetLocationClass = require("../../../../../lib/utils/location-status");
const router = require("express").Router();


router.post("/", async (req, res) => {
    const { payload } = req.query;
    if(!payload) return res.send("Forbiden!");

    //check if user is subdcribed
    const is_subscribed = req.subscription.is_subscribed;
    if (!is_subscribed) return res.status(200).json({ok: false, cause:"notsub"})

    //valiadate coordinates, category, & types at the route level cause it's used  across all
    await body("type").exists().isString().isIn(POST_TYPES).withMessage("").run(req);
    await body("category").exists().isString().isIn(POST_CATEGORIES).withMessage("").run(req);
    if(req.body.coords) {
        await body("coords.school").exists().isString().isIn(schools).withMessage("").run(req);
        await body("coords.lat").exists().isNumeric().withMessage("").run(req);
        await body("coords.long").exists().isNumeric().withMessage("").run(req);
        await body("coords.accuracy").exists().isNumeric().withMessage("").run(req);

        const { lat, long, accuracy, school } = req.body.coordss;
        req.user.location_status = GetLocationClass(parseFloat(lat), parseFloat(long), parseFloat(accuracy), school);
    } else {
        //if no coords set as unrliabl
        req.user.location_status = "unreliable";
    }; 


    if(payload === "article") return ProcessArticlePost(req, res);
    if(payload === "statement") return ProcessStatementPost(req, res);

    res.status(405).send("NOT FOUND");
});


module.exports = router;