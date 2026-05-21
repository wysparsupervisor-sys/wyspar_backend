const ProcessFeed = require("./controllers/campus-space");
const CampusToday = require("./controllers/campus-today");
const GetNew = require("./controllers/get-new");
const router = require("express").Router();

router.get("/", async (req, res) => {
    try {
        const action = req.query.action;
        
        if(!action) return ProcessFeed(req, res);
        if(action === "time") return CampusToday(req, res);
        if(action === "new") return GetNew(req, res);

        res.status(404).send("NOT FOUND");
    } catch (err) {
        res.status(404).send("NOT FOUND");
    };
});

module.exports = router;