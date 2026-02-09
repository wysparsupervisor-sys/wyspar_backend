const { query, validationResult } = require("express-validator");
const ProcessWysparerSearch = require("./controllers/wysparer");
const ProcessWhisperSearch = require("./controllers/whisper");
const router = require("express").Router();

 
router.get("/", async (req, res) => {
    const is_subscribed = req.subscription.is_subscribed;
    if (!is_subscribed) return res.status(200).json({ok: false, cause: "nosub"});

    await query("search_type").exists().isIn(["wysparer", "whisper"]).withMessage("").run(req);
    //handle validation result
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ok: false, msg: "Invalid query object"});

    const { search_type } = req.query;

    if(search_type === "wysparer") return ProcessWysparerSearch(req, res);
    if(search_type === "whisper") return ProcessWhisperSearch(req, res);

    return res.status(404).send("NOT FOUND");
});


module.exports = router;