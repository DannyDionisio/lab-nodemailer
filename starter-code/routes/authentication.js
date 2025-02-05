const nodemailer = require('nodemailer');
const {
  Router
} = require('express');

const router = new Router();

const User = require('./../models/user');
const bcryptjs = require('bcryptjs');


//will generated a confirmation code
const generateId = length => {
  const characters =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += characters[Math.floor(Math.random() * characters.length)];
  }
};

router.get('/', (req, res, next) => {
  res.render('index');
});

router.get('/sign-up', (req, res, next) => {
  res.render('sign-up');
});

router.post('/sign-up', (req, res, next) => {
  const confirmationCode = generateId(10)

  const {
    name,
    email,
    password
  } = req.body;
  bcryptjs
    .hash(password, 10)
    .then(hash => {
      return User.create({
        name,
        email,
        passwordHash: hash,
        confirmationCode
      });
    })
    .then(user => {
      // Enviar email
      const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD
        }
      });

      transporter.sendMail({
          from: `IH Test <${process.env.EMAIL}>`,
          to: email,
          subject: 'Confirmation email',
          html: `
          <p><a href="http://localhost:3000/auth/confirm/${confirmationCode}">Confirm</a></p>
        `
        })
        .then(response => {
          req.session.user = user._id;
          res.redirect('/');
        })
        .catch(error => {
          console.log(error);
          res.sendStatus(500)
        });

    })
    .catch(error => {
      next(error);
    });
});

router.get('/sign-in', (req, res, next) => {
  res.render('sign-in');
});

router.post('/sign-in', (req, res, next) => {
  let userId;
  const {
    email,
    password
  } = req.body;
  User.findOne({
      email
    })
    .then(user => {
      if (!user) {
        return Promise.reject(new Error("There's no user with that email."));
      } else {
        userId = user._id;
        return bcryptjs.compare(password, user.passwordHash);
      }
    })
    .then(result => {
      if (result) {
        req.session.user = userId;
        res.redirect('/');
      } else {
        return Promise.reject(new Error('Wrong password.'));
      }
    })
    .catch(error => {
      next(error);
    });
});

router.post('/sign-out', (req, res, next) => {
  req.session.destroy();
  res.redirect('/');
});

const routeGuard = require('./../middleware/route-guard');

router.get('/private', routeGuard, (req, res, next) => {
  res.render('private');
});


module.exports = router;