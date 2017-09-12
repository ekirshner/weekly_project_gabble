const express = require('express');
const mustache = require('mustache-express');
const bodyparser = require('body-parser');
let session = require('express-session');
const Sequelize = require('sequelize');

const server = express();

//Set up body-parser
server.use(bodyparser.urlencoded({ extended: false }));

//Set up Mustache
server.engine('mustache', mustache());
server.set('views', './views');
server.set('view engine', 'mustache');

//CSS
server.use(express.static('public'));

//Set up Sessions
server.use(session({
    secret: 'secret string',
    resave: false,
    saveUninitialized: true
}));

//Set up Databases and Schemas
const db = new Sequelize('gabbledb', 'Erica', '', {
    dialect: 'postgres',
});
//////////////////////////  USER SCHEMA ///////////////////////////
const User = db.define('user', {
    username: Sequelize.STRING,
    password: Sequelize.STRING,
    display_name: Sequelize.STRING,
});

// User.sync().then(function () {
//     console.log('user model synched!')

//     User.create({
//         username: 'erica',
//         password: 'cake',
//         display_name: 'Master' 
//     });
//     console.log('login saved')
// });

//////////////////////////  MESSAGES SCHEMA ///////////////////////////
const Message = db.define('message', {
    text: Sequelize.STRING,
});

Message.belongsTo(User, { as: 'user' });

// Message.sync().then(function () {
//     console.log('message model synched!');

// Message.create({
//     text: 'Great job on your project!',
//     userId: 1,
// });


//////////////////////////  LIKES SCHEMA ///////////////////////////
const Like = db.define('like', {
    message_id: Sequelize.INTEGER,
    user_id: Sequelize.INTEGER,
});

Like.belongsTo(Message);
Like.belongsTo(User);

// Like.sync().then(function () {
// });

//     Like.create({
//         message_id: 1,
//         user_id: 1,
//     });
//     console.log('like saved')
// });

// Message.belongsTo(User, {as: 'author'})

///////////////////////////////////////////////////////////////////

//Set up Home Page
server.get('/', function (req, res) {
    
    if (req.session.person !== undefined) {
       
        Message.findAll({
            order: [['createdAt', 'DESC']],
            include: [{ as: 'user', model: User }]

        }).then(function (results) {
            const promises = [];

            for (let i = 0; i < results.length; i++) {
                if (req.session.person.username === results[i].user.username) {
                    results[i].deletable = true;
                } else {
                    results[i].deletable = false;
                }

                const promise = Like.find({
                    where: {
                        userId: req.session.person.id,
                        messageId: results[i].id
                    }
                }).then(function (data) {
                    if(data !== null) {
                        results[i].likable = false;
                    } else {                       
                        results[i].likable = true;
                    };
                });

                promises.push(promise);
            }

            Promise.all(promises).then(function () {
                res.render('home', {
                    messages: results,
                });
            });
        });
    } else {
        res.redirect('/login');
    };
});


//Verification using Sessions
server.post('/loginVerification', function (req, res) {
    let user = null;
    let username = req.body.username;
    let password = req.body.password;

    User.findOne({ where: { username, password } })
        .then(function (results) {
            if (results) {
                user = results;
            };
        })
        .then(function () {
            if (user !== null) {
                req.session.person = user;
                res.redirect('/');

            } else {
                res.redirect('/registration');
            };
        });
});

//Set up Login Page
server.get('/login', function (req, res) {
    res.render('login');
});

//Logout Functionality
server.post('/signout', function (req, res) {
    req.session.destroy()
    res.redirect('/login');
});

//Set up Registration Page
server.get('/registration', function (req, res) {
    res.render('registration');
});

//Add new user from Registration Page
server.post('/addUser', function (req, res) {
    User.create({
        username: req.body.username,
        password: req.body.password,
        display_name: req.body.display
    });
    res.redirect('/login');
});

//Add New Gab
server.post('/add', function (req, res) {
    Message.create({
        text: req.body.gabbox,
        userId: req.session.person.id,
    });
    res.redirect('/');
});

//Add Likes
server.post('/newLike/:id', function (req, res) {
    const id = req.params.id;

    Message.findById(id).then(function (result) {
        Like.create().then(function (like) {
            like.setMessage(result);
            User.findById(req.session.person.id).then(function (user) {
                like.setUser(user);
            });
        }).then(function () {
             res.redirect('/');
        });
    });
});

//Delete Message
server.post('/deleteMessage/:id', function (req, res) {
    const id = req.params.id;

    Message.destroy({
        where: {
            id: id
        }
    }).then(function () {
        res.redirect('/');
    });
});;

//Set up Likes Page
server.get('/likes/:id', function (req, res) {
    let id = parseInt(req.params.id);
    Like.findAll({
        where: { messageId: id },
        include: [{ as: 'user', model: User }, { as: 'message', model: Message }]
    }).then(function (result) {
        res.render('likes', {
            text: result[0].message.text,
            display_name: result[0].user.display_name,
            createdAt: result[0].message.createdAt,
            pants: result
        });
    });
});

//Server
server.listen(3000, function () {
    console.log('welcome!')
});
