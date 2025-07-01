const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');

const SECRET = 'SECr3t';

app.use(bodyParser.json());
app.use(cors({origin:'*'}));


const conversationSchema = new mongoose.Schema({
    prompt:{type:String , required:true},
    response:{type:String,required:true},
    timestamp: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});
const Conversation = mongoose.model('Conversation', conversationSchema);


const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    conversations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }]
});
const User = mongoose.model('User', userSchema);


const authenticateJwt = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, SECRET);
            const user = await User.findById(decoded._id);
            if (!user) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        } catch (error) {
            console.error(error);
            return res.sendStatus(403);
        }
    } else {
        res.sendStatus(401);
    }
};




mongoose.connect('mongodb+srv://anujjagtap2004:hKFxCEiAcTwu9ckS@cluster0.vwkaqkl.mongodb.net/')


app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    User.findOne({ username })
        .then(user => {
            if (user) {
                res.status(403).json({ message: "User Already Exists" });
            } else {
                const newUser = new User({ username, password });
                newUser.save()
                    .then((savedUser) => {
                        const token = jwt.sign({ _id: savedUser._id, username, role: "admin" }, SECRET, { expiresIn: '1h' });
                        res.status(200).json({ message: 'Signup Successful', token });
                    })
                    .catch(err => console.error(err));
            }
        })
        .catch(err => console.error(err));
});



app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            const token = jwt.sign({ _id: user._id, username, role: "user" }, SECRET, { expiresIn: '1h' });
            res.status(200).json({ message: 'Login Successful', token });
        } else {
            res.status(403).json({ message: 'Invalid Username Or Password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});



app.post('/conversation/add', authenticateJwt, async (req, res) => {
    const { prompt,response } = req.body;
    try {
        const newConversation = new Conversation({
            prompt,
            response,
            user: req.user._id 
        });
        await newConversation.save();

        // Update the user's conversations array
        req.user.conversations.push(newConversation._id);
        await req.user.save();

        res.status(200).json({ message: 'Conversation Added Successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to add conversation' });
    }
});



app.get('/conversations', authenticateJwt, async (req, res) => {
    try {
        const conversations = await Conversation.find({ user: req.user._id }); // Use ObjectId here
        res.json(conversations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch conversations' });
    }
});






app.listen(3000, () => console.log(`Server Running On Port 3000`));