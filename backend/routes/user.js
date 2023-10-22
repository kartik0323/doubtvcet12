const express = require('express')
const router = express.Router();
var fetchuser = require('../middleware/fetchuser');
const User = require('../models/User');

// Route 1 : Get the user data from id : GET "/api/user/id/:id". Login required
router.get('/id/:id', fetchuser, async(req, res)=> {
    try {
        const user = await User.findById(req.params.id);
        res.json(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error")
    }
});

// Route 2 : Get the user data from username : GET "/api/user/username/:username". Login Required
router.get("/username/:username", fetchuser, async(req, res)=> {
    try {
        const user = await User.findOne({
            username : req.params.username
        });
        res.json(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error")
    }
})
// Route to fetch user's dashboard
router.get('/dashboard', fetchuser, async (req, res) => {
    try {
        // Fetch questions from the users they follow or are interested in
        const user = req.user.id;
        const followedQuestions = await Questions.find({
            $or: [
                { user: { $in: user.following } },  // Questions from users they follow
                { tags: { $in: user.tags } },  // Questions with tags they are interested in
            ]
        }).sort({ timestamp: -1 }).limit(10);

        // Collect the question IDs from the followed questions
        const questionIds = followedQuestions.map((question) => question._id);

        // Fetch answers for these questions
        const answers = await Answers.find({ question: { $in: questionIds } })
            .populate('user', 'username')  // Populate user details for each answer

        res.json({ questions: followedQuestions, answers });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});


// Route 3 : Update the user settings : PUT "/api/user/settings". Login Required
router.put('/settings', fetchuser, async(req, res)=> {
    try {
        const {first, last, dp, city} = req.body;

        const newUser = {};
        if(first) {
            newUser.first = first
        }
        if(last) {
            newUser.last =last
        }
        if(dp) {
            newUser.dp = dp
        }
        if(city) {
            newUser.city = city
        }

        // var user = await User.findById(req.user.id);
        const response = await User.findByIdAndUpdate(req.user.id, {$set: newUser}, {new: true})
        res.json(response);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
})
module.exports = router;