const express = require('express');

const { authMiddleware } = require('../middleware.js');
const router = express.Router();
const zod = require('zod');
const { User, Account } = require('../db.js');
const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config.js');

//SIGNUP
const signupBody = zod.object({
    username: zod.string().email(),
    firstName: zod.string(),
    lastName: zod.string(),
    password: zod.string()
})

router.post("/signup", async (req,res) => {
    const { success } = signupBody.safeParse(req.body);
    if(!success){
        return res.status(411).json({
            msg:"Incorrect inputs"
        })
    }

    const existingUser = await User.findOne({
        username: req.body.username
    })

    if(existingUser){
        return res.status(411).json({
            msg: "Email already taken"
        })
    }

    const user = await User.create({
        username: req.body.username,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName
    })

    const userId = user._id;

    await Account.create({
        userId,
        balance: 1 + Math.random() * 1000000 
    })

    const token = jwt.sign({
        userId
    },JWT_SECRET);

    res.json({
        msg: "User created successful",
        token: token
    })
})

//SIGNIN
const signinBody = zod.object({
    username: zod.string().email(),
    password: zod.string()
})

router.post("/signin", async (req,res) => {
    const { success } = signinBody.safeParse(req.body);
    if(!success){
        return res.status(411).json({
            msg: "Incorrect inputs"
        })
    }

    const user = await User.findOne({
        username: req.body.username,
        password: req.body.password
    })

    if(user){
        const token = jwt.sign({
            userId: user._id
        },JWT_SECRET)

        res.json({
            token
        })
        return ; 
    }
    
    res.status(411).json({
        msg: "Error while logging in"
    })
})

//UPDATE INFO 
const updateBody = zod.object({
    password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional()
})

router.put("/", authMiddleware, async (req,res) => {
    const { success } = updateBody.safeParse(req.body)
    if(!success){
        res.status(411).json({
            msg: "Incorrect inputs"
        })
    }

    await User.updateOne({_id: req.userId}, req.body);
    res.json({
        msg: "Updated successfully"
    })
})

//FILTER LOGIC
router.get("/bulk", authMiddleware, async (req,res) => {
    const filter = req.query.filter || "";
    const users = await User.find({
        $or: [{
            firstName: {
                "$regex": filter,
                "$options": "i"
            }
        }, {
            lastName: {
                "$regex": filter,
                "$options": "i"
            }
        }]
    });

    res.json({
        user: users.map(user => ({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            _id: user._id
        }))
    })
})

router.get("/", authMiddleware, async (req,res) => {
    try {
        const user = await User.findById(req.userId).select('-password'); // Excluding password from the response
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ msg: "Server error" });
    }
})

module.exports = router ;