process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException:', (err) => {
    console.error('Uncaught Exception:', err);
});

let maintenance = true;

const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { log } = require('console');
// Middleware to parse POST bodies

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Session setup (must be before routes that use sessions)
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Global maintenance mode middleware
app.use((req, res, next) => {
    if (maintenance) {
        // Allow essential static files and status page
        if (
            req.originalUrl === '/status' ||
            req.originalUrl.startsWith('/css/style.css') ||
            req.originalUrl.startsWith('/js/errors.js') ||
            req.originalUrl.startsWith('/js/topnav.js')
        ) {
            return next();
        }
        const errorPage = path.join(__dirname, "public", "errors", "50x.html");
        if (fs.existsSync(errorPage)) {
            return res.status(503).sendFile(errorPage);
        } else {
            return res.status(503).send('<h1>Server is down for maintenance</h1>');
        }
    }
    next();
});

app.use((err, req, res, next) => {
    console.log(chalk.default.red("Global error handler:", err));
    if (!res.headersSent) {
        res.status(500).send("<h1>Internal Server Error</h1>");
    }
});

// Session setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Error pages
let error404html = `<!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <title>404 Page Not Found</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body>
                <h1>Page Not Found</h1>
                <p>Sorry, but the requested page was not found.</p>
            </body>
        </html>`;

let error403html = ``;

let error50x = ``;

app.use((req, res, next) => {
    res.on('finish', () => {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        console.log(chalk.default.greenBright(`Code ${res.statusCode}, ${ip} requesting ${req.originalUrl}`));
    });
    next();
});

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, 'public')));


// Serve files from the 'public' directory if they exist
app.get('/', (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    res.status(200).sendFile(path.join(__dirname, "public", "index.html"));

    console.log(chalk.default.yellow(`Successful connection with ${ip}, requesting ${req.originalUrl}`));
});

// Get Users
let users = {};
try {
    users = JSON.parse(fs.readFileSync(path.join(__dirname, 'auth.json'), 'utf-8'));
} catch (e) {
    console.error("auth.json is either missing or invalid. Authentication will not be required. " + e);
}

const ERROR403 = path.join(__dirname, "public", "errors", "403.html");
let error403Html = '<h1>403 Forbidden</h1>';
try {
    error403Html = fs.readFileSync(ERROR403, 'utf-8');
} catch (e) {
    console.error("Could not read 403.html: " + e);
}

// Login form (GET)
app.get('/login', (req, res) => {
    if (maintenance == false) {
        const error = req.query.error ? '<p style="color:red">Invalid credentials</p>' : '';
        const loggedIn = req.session && req.session.authenticated;
        const logoutLink = loggedIn ? '<p><a href="/private/logout">Logout</a></p>' : '';
        res.send(`
            <html><body>
            <h2>Login</h2>
            ${error}
            ${logoutLink}
            <form method="POST" action="/login">
                <input name="username" placeholder="Username" required><br>
                <input name="password" type="password" placeholder="Password" required><br>
                <button type="submit">Login</button>
            </form>
            </body></html>
        `);
    } else {
        res.redirect(301, '/');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    if (maintenance == false) {
        req.session.destroy(() => {
            res.redirect('/login');
        });
    } else {
        res.redirect('/');
    }
});

// Login form (POST)
app.post('/login', (req, res) => {
    if (maintenance == false) {
        const { username, password } = req.body;
        console.log('DEBUG: Submitted username:', username);
        console.log('DEBUG: Submitted password:', password);
        console.log('DEBUG: Expected password for', username, ':', users[username]);
        if (users[username] && users[username] === password) {
            req.session.authenticated = true;
            req.session.username = username;
            console.log('DEBUG: Successful login attempt for', username);
            return res.redirect(req.originalUrl);
        }
        res.redirect('/private/login?error=1');
        console.debug(chalk.default.red('DEBUG: Failed login attempt for', username, 'requesting', req.originalUrl));
    } else {
        res.redirect('/')
    }
});

// Middleware to protect /private
app.use('/private', (req, res, next) => {
    if (req.session && req.session.authenticated) {
        console.log('DEBUG: Authenticated session for', req.session.username, 'requesting', req.originalUrl);
        return next();
    }
    console.log(chalk.default.yellowBright(`DEBUG: Not authenticated, redirecting to /private/login for ${req.originalUrl}`));
    res.redirect('/private/login');
});

// Serve private static files with debug and .html extension fallback
app.use('/private', (req, res, next) => {
    console.log(chalk.default.yellowBright(`DEBUG: Static file middleware for ${req.originalUrl}`));
    next();
}, express.static(path.join(__dirname, 'public/private'), { extensions: ['html'] }));

// Define ports to try
const ports = [
    3000,
    8080,
    9999,
    8888,
    7777,
    6666,
    5555,
    4444,
    3333,
    2222,
    1111,
    12357,
    5726,
    4574,
    456456,
    456,
    47675,
    4677,
    5789
];
console.log(chalk.default.blue("Starting server..."));

function tryListen(ports, idx = 0) {
    if (idx >= ports.length) {
        console.error(chalk.default.red("All ports failed. Server could not start."));
        return;
    }
    app.listen(ports[idx], (err) => {
        if (err) {
            console.log(chalk.default.red(`Error starting server on port ${ports[idx]}: ${err}`));
            tryListen(ports, idx + 1);
        } else {
            console.log(chalk.default.green(`Server listening on localhost:${ports[idx]}`));
        }
    });
}



// Minimal robust final 404 handler (must be last)
app.use((req, res) => {
    const errorPage = path.join(__dirname, "public", "errors", "404.html");
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (fs.existsSync(errorPage)) {
        res.status(404).sendFile(errorPage);
    } else {
        res.status(404).send(error404html || '<h1>404 Page Not Found</h1>');
    }
    console.log(chalk.default.yellow(`Error 404 when IP ${ip} requests ${req.originalUrl}`));
});

tryListen(ports);
