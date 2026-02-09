const Mixpanel = require("mixpanel");
const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);


const TrackEvent = (event_name, props = { }) => {
    try {
        mixpanel.track(event_name, props, err => {
            if (err) console.error("Mixpanel track failed:", err);
        });
    } catch (err) {
        console.error("Unexpected Mixpanel error:", err);
    };
};


module.exports = { TrackEvent };