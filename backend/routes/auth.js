const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Token = require("../models/Token");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const fetchuser = require("../middleware/fetchuser");
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const validator = require('validator');

const JWT_SECRET = process.env.JWT_SECRET;

// Function to check if the email is from the "vcet.edu.in" domain
function isVCETEmail(email) {
  const domain = 'vcet.edu.in';
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }
  const emailDomain = parts[1];
  return emailDomain === domain;
}

router.post(
  "/register",
  [
    body("email", "Enter a valid email").custom((value) => {
      if (!isVCETEmail(value) || !validator.isEmail(value)) {
        throw new Error("Invalid or non-VCET email address");
      }
      return true;
    }),
    body("username", "Username must be between 4-20 characters long").isLength({ min: 4, max: 20 }),
    body("password", "Password must be 5-20 characters long").isLength({ min: 5 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, firstname, lastname, city } = req.body;

      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ error: "A user with this email already exists." });
      }

      let existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ error: "This username is already taken." });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPass = await bcrypt.hash(password, salt);

      user = new User({
        username,
        email,
        password: hashedPass,
        first: firstname,
        last: lastname,
        city,
        QuestionsPosted: 0,
        AnswersAccepted: 0,
      });

      await user.save();

      const token = new Token({
        _userId: user._id,
        token: crypto.randomBytes(16).toString("hex"),
      });

      await token.save();

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_ID,
          pass: process.env.GMAIL_GENPWD,
        },
      });

      const mailOptions = {
        from: process.env.GMAIL_ID,
        to: user.email,
        subject: 'Account Verification Link',
        text: `Hello ${username},\n\nPlease verify your account by clicking the link: \nhttps:\/\/doubtvcet.me\/confirmation/${user.email}/${token.token}\n\nThank You!\n`,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({ success: true, message: 'A verification email has been sent to ' + user.email + '. It will expire after one day. If you had not received the verification email, click on "resend token".' });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// ROUTE 2: Login a User using: POST "/api/auth/login". No login required
router.post(
  "/login",
  [
    body("username", "Username cannot be empty").exists(),
    body("password", "Password cannot be empty").exists(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;
      let user = await User.findOne({ username });

      if (!user) {
        return res.status(400).json({ error: "Enter the valid Username/Password" });
      }

      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res.status(400).json({ error: "Enter the valid Username/Password" });
      }

      if (!user.verified) {
        return res.status(401).json({ error: "Email is not verified, please click on resend" });
      }

      const data = {
        user: {
          id: user.id,
        },
      };

      const authtoken = jwt.sign(data, JWT_SECRET);
      res.json({
        success: true,
        authtoken,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// Route 3: Get logged-in user details using: POST "/api/auth/getuser". Login required
router.post("/getuser", fetchuser, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
