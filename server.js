import express from 'express';
import { verify, sign } from 'jsonwebtoken';
import { json } from 'body-parser';
import { Schema, model, connect } from 'mongoose';
const app = express();
import cors from 'cors';

const SECRET = 'SECr3t';

app.use(json());
app.use(cors({origin:'*'}));


const conversationSchema = new Schema({
    prompt:{type:String , required:true},
    response:{type:String,required:true},
    timestamp: { type: Date, default: Date.now },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
});
const Conversation = model('Conversation', conversationSchema);


const userSchema = new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    conversations: [{ type: Schema.Types.ObjectId, ref: 'Conversation' }]
});
const User = model('User', userSchema);


const authenticateJwt = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = verify(token, SECRET);
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

connect('mongodb+srv://anujjagtap2004:hKFxCEiAcTwu9ckS@cluster0.vwkaqkl.mongodb.net/')


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
                        const token = sign({ _id: savedUser._id, username, role: "admin" }, SECRET, { expiresIn: '1h' });
                        res.status(201).json({ message: 'User Created Successfully', token });
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
            const token = sign({ _id: user._id, username, role: "user" }, SECRET, { expiresIn: '1h' });
            res.json({ message: 'Logged In Successfully', token });
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
            user: req.user._id // Use ObjectId here
        });
        await newConversation.save();

        // Update the user's conversations array
        req.user.conversations.push(newConversation._id);
        await req.user.save();

        res.json({ message: 'Conversation added successfully' });
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
