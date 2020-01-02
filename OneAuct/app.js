const   express = require('express'),
        exhbs = require('express-handlebars'),
        morgan = require('morgan'),
        numeral = require('numeral'),
        hbs_sections = require('express-handlebars-sections'),
        session = require('express-session');

        app = express();

const momment = require('moment');
require('express-async-errors');

//app.use(morgan('dev')); 
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    // cookie: {
    //     secure: true
    // }
  }))
    
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static('public'));

app.set('view engine', 'hbs');
app.engine('hbs', exhbs({
    defaultLayout: 'main.hbs',
    extname: '.hbs',
    helpers: {
        format: val => numeral(val).format('0,0') + ' đ',
        section: hbs_sections(),
        mask: user => {
            let i = 0;
            const mask = 4;
            let maskUser = '';
            for(let c of user){
                if(i < mask) {
                    maskUser += '*';
                } else {
                    maskUser += c;
                }
                i++;
            }
            return maskUser;
        },
        date: val => momment(val).format('DD-MM-YYYY'),
    },

}));

require('./middlewares/locals.mdw')(app);
require('./middlewares/routes.mdw')(app);

//Error handler
// app.use((err,req,res,next) => {
//     console.log(err.stack);
//     res.status(500).send('View error on console');
// });

app.use((req, res, next) => {
	next(createError(404));
})
app.use((err, req, res, next) => {
	var status = err.status || 500;
	var errorView = 'error';
	if (status === 404)
		errorView = '404';
	var msg = err.message;
	var error = err;
	res.status(status).render(errorView, {
		layout: false,
		msg,
		error
	})
})

app.listen(3000, () => {
    console.log("Server is running ...");
});