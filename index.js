process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    logger.error(`Uncaught Exception: ${err}`);
});

let maintenance = false; // Set to true to enable maintenance mode

const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const winston = require('winston');

let status;
if (maintenance) {
    status = {
        server: 'maintenance',
        checked: new Date().toLocaleString(),
    };
} else {
    status = {
        server: 'online',
        checked: new Date().toLocaleString(),
    };
}

// winston setup
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

const logFileName = `logs/server-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
const logger = winston.createLogger({
    level: maintenance ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
    ),
    transports: [
        new winston.transports.File({ filename: logFileName })
    ]
});

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Session setup (must be before routes that use sessions)
app.use(session({
    secret: 'CustomServer',
    resave: true,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 1000 * 1000
    }
}));

// Global logging middleware (must be defined before other routes)
app.use((req, res, next) => {
    res.on('finish', () => {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        console.log(chalk.default.greenBright(`Code ${res.statusCode}, ${ip} requesting ${req.originalUrl}`));
        logger.info(`Code ${res.statusCode}, ${ip} requesting ${req.originalUrl}`);
    });
    next();
});

// Global maintenance mode middleware
app.use((req, res, next) => {
    if (maintenance) {
        // Allow essential static files and status page
        if (
            req.originalUrl === '/status' ||
            req.originalUrl.startsWith('/css/') ||
            req.originalUrl.startsWith('/js/') ||
            req.originalUrl.startsWith('/favicon/')
        ) {
            return next();
        }
        return res.redirect(302, '/status');
    }
    next();
});

// Root handler
app.get('/', (req, res) => {
    const loggedIn = req.session.authenticated;
    const username = req.session.username;
    if (loggedIn && username) {
        res.status(200).send(`
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Home</title>
                    <link rel="stylesheet" href="/css/style.css">

                    <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
                    <link rel="icon" sizes="16x16" type="image/png" href="/favicon/favicon-16x16.png">
                    <link rel="icon" sizes="32x32" type="image/png" href="/favicon/favicon-32x32.png">
                    <link rel="manifest" href="/favicon/site.webmanifest">

                    <script src="/js/topnav.js"></script>
                    <script src="https://kit.fontawesome.com/f403ebf253.js" crossorigin="anonymous"></script>
                </head>
                <body>
                    <div class="topnav">
                        <a href="/">Home</a>
                        <a href="/news">News</a>
                        <a href="/contact">Contact</a>
                        <a href="/about">About us</a>
                        <p>Hello ${username}</a>
                        <a href="/logout">Logout</a>
                        <a href="javascript:void(0);" class="icon" onClick="topnav()">
                            <i class="fa-solid fa-bars"></i>
                        </a>
                    </div>
                    <h1>Welcome to my site!!</h1>
                </body>
            </html>
        `);
    } else {
        res.status(200).send(`
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Home</title>
                    <link rel="stylesheet" href="/css/style.css">

                    <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
                    <link rel="icon" sizes="16x16" type="image/png" href="/favicon/favicon-16x16.png">
                    <link rel="icon" sizes="32x32" type="image/png" href="/favicon/favicon-32x32.png">
                    <link rel="manifest" href="/favicon/site.webmanifest">

                    <script src="/js/topnav.js"></script>
                    <script src="https://kit.fontawesome.com/f403ebf253.js" crossorigin="anonymous"></script>
                </head>
                <body>
                    <div class="topnav">
                        <a href="/">Home</a>
                        <a href="/news">News</a>
                        <a href="/contact">Contact</a>
                        <a href="/about">About us</a>
                        <a href="/login">Login</a>
                        <a href="/signup">Signup</a>
                        <a href="javascript:void(0);" class="icon" onClick="topnav()">
                            <i class="fa-solid fa-bars"></i>
                        </a>
                    </div>
                    <h1>Welcome to my site!!</h1>
                </body>
            </html>
        `);
    }
});

// Status route
app.get('/status', (req, res) => {
    res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Server Status</title>
            <style>
                body { font-family: Arial, sans-serif; background: #f5f5f5; }
                .container { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            max-width: 400px; margin: 40px auto; padding: 32px 24px; text-align: center; }
                .status-online { color: #27ae60; font-weight: bold; font-size: 1.3em; }
                .timestamp { color: #888; font-size: 0.95em; margin-top: 12px; }
                footer { text-align: center; color: #555; margin: 24px 0 0 0; font-size: 0.95em; }
            </style>
            <link rel="stylesheet" href="/css/style.css" type="text/css">
            <!-- favicon -->
            <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png">
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
            <link rel="manifest" href="/favicon/site.webmanifest">
            <!-- end favicon -->
            <!-- scripts -->
            <script src="/js/topnav.js"></script>
            <script src="https://kit.fontawesome.com/f403ebf253.js" crossorigin="anonymous"></script>
        </head>
        <body>
            <navigation>
                <div class="topnav">
                    <a href="/" class="active">Home</a>
                    <a href="/news">News</a>
                    <a href="/contact">Contact</a>
                    <a href="/about">About us</a>
                    <a href="javascript:void(0);" class="icon" onclick="topnav()">
                        <i class="fa-solid fa-bars"></i>
                    </a>
                </div>
            </navigation>
            <content>
                <div class="container">
                    <h1>Server Status</h1>
                    <div class="status-online">${status.server}</div>
                    <div class="timestamp">Last checked: ${status.checked}</div>
                </div>
            </content>
            <footer>
                &copy; 2025 Lucas Fry | MIT License
            </footer>
        </body>
        </html>`
    );
});

// Error routes
app.get('/errors/404.html', (req, res) => {
    res.status(403).sendFile(path.join(__dirname, 'public', 'errors', '403.html'));
});

app.get('/errors/403.html', (req, res) => {
    res.status(403).sendFile(path.join(__dirname, 'public', 'errors', '403.html'));
});

app.get('/errors/500', (req, res) => {
    res.status(403).sendFile(path.join(__dirname, 'public', 'errors', '403.html'));
});

app.get('/template', (req, res) => {
    if (req.session.authenticated == false) {
        res.redirect(302, '/login');
    } else {
        res.status(200).sendFile(path.join(__dirname, 'public', 'template.html'));
    }
});

app.get('/login', (req, res) => {
    if (maintenance == false) {
        const error = req.query.error ? '<p style="color:red">Invalid credentials</p>' : '';
        const loggedIn = req.session && req.session.authenticated;
        if (!loggedIn) {
            res.send(`
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>Login</title>
                        <link rel="stylesheet" href="/css/style.css">

                        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
                        <link rel="icon" sizes="16x16" type="image/png" href="/favicon/favicon-16x16.png">
                        <link rel="icon" sizes="32x32" type="image/png" href="/favicon/favicon-32x32.png">
                        <link rel="manifest" href="/site.webmanifest">

                        <script src="/js/topnav.js"></script>
                        <script src="https://kit.fontawesome.com/f403ebf253.js" crossorigin="anonymous"></script>
                    </head>
                    <body>
                        <div class="topnav">
                            <a href="/">Home</a>
                            <a href="/news">News</a>
                            <a href="/contact">Contact</a>
                            <a href="/about">About us</a>
                            <a href="/login">Login</a>
                            <a href="/signup">Signup</a>
                            <a href="javascript:void(0);" class="icon" onClick="topnav()">
                                <i class="fa-solid fa-bars"></i>
                            </a>
                        </div>
                        ${error}
                        <form method="POST" action="/login">
                            <input name="username" placeholder="Username" required><br>
                            <input name="password" type="password" placeholder="Password" required><br>
                            <button type="submit">
                        </form>
                    </body>
                </html>
            `);
        } else {
            res.redirect(302, '/');
        }
    } else {
        res.redirect(301, '/');
    }
});

app.post('/login', (req, res) => {
    if (maintenance == false) {
        const { username, password } = req.body;
        console.log('DEBUG: Submitted username:', username);
        logger.info(`DEBUG: Submitted username: ${username}`);
        console.log('DEBUG: Submitted password:', password);
        logger.info(`DEBUG: Submitted password: ${password}`);
        console.log('DEBUG: Expected password for', username, ':', users[username]);
        logger.info(`DEBUG: Expected password for ${username}: ${users[username]}`);
        if (users[username] && users[username] === password) {
            req.session.authenticated = true;
            req.session.username = username;
            console.log('DEBUG: Successful login attempt for', username);
            logger.info(`DEBUG: Successful login attempt for ${username}`);
            return res.redirect('/');
        }
        res.redirect('/private/login?error=1');
        console.debug(chalk.default.red('DEBUG: Failed login attempt for', username, 'requesting', req.originalUrl));
        logger.warn(`DEBUG: Failed login attempt for ${username} requesting ${req.originalUrl}`);
    } else {
        res.redirect(301, '/');
    }
});

app.get('/logout', (req, res) => {
    if (maintenence == false) {
        req.session.destroy(() => {
            res.redirect('/login');
        });
    } else {
        res.redirect(301, '/');
    }
});

// Route for all static files in /public (recommended approach)
app.use(express.static(path.join(__dirname, 'public')));

// redirect route
app.get('/index', (req, res) => {
    res.redirect(301, '/');
});

// template route
app.get('/template', (req, res) => {
    res.status(403).sendFile(path.join(__dirname, 'public', 'errors', '403.html'));
});

app.get('/signup', (req, res) => {
    const error = req.query.error ? '<p style="color:red">All fields are required, or that username already exists</p>' : '';
    const loggedIn = req.session && req.session.authenticated;
    if (!maintenance) {
        if (!loggedIn) {
            res.status(200).send(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>Signup</title>
                        <link rel="stylesheet" href="/css/style.css" type="text/css">

                        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
                        <link rel="icon" sizes="16x16" type="image/png" href="/favicon/favicon-16x16.png">
                        <link rel="icon" sizes="32x32" type="image/png" href="/favicon/favicon-32x32.png">
                        <link rel="manifest" href="/favicon/site.webmanifest">

                        <script src="/js/topnav.js"></script>
                        <script src="https://kit.fontawesome.com/f403ebf253.js" crossorigin="anonymous"></script>
                    </head>
                    <body>
                        <div class="topnav">
                            <a href="/">Home</a>
                            <a href="/news">News</a>
                            <a href="/contact">Contact</a>
                            <a href="/about">About us</a>
                            <a href="/login">Login</a>
                            <a href="/signup">Signup</a>
                            <a href="javascript:void(0);" class="icon" onClick="topnav()">
                                <i class="fa-solid fa-bars"></i>
                            </a>
                        </div>
                        ${error}
                        <form method="POST" action="/signup">
                            <input name="username" placeholder="Username" required><br>
                            <input name="password" type="password" placeHolder="Password" required><br>
                            <button type="submit">Signup</button>
                        </form>
                    </body>
                </html>
            `);
        } else {
            res.redirect('/');
        }
    } else {
        res.redirect(302, '/');
    }
});

app.post('/signup', (req, res) => {
    const { username, password, name, email } = req.body;
    if (!username || !password) {
        return res.redirect(302, '/signup?error=1');
    }
    // Check if user exists
    let usersData = {};
    try {
        usersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'auth.json'), 'utf-8'));
    } catch (e) {}
    if (usersData[username]) {
        return res.redirect(302, '/signup?error=1');
    }
    // Add user
    usersData[username] = password;
    fs.writeFileSync(path.join(__dirname, 'auth.json'), JSON.stringify(usersData, null, 2), 'utf-8');
    res.redirect(302, '/');
});

// 404 Not Found Middleware (must be last)
app.use((req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    res.status(404).sendFile(path.join(__dirname, 'public', 'errors', '404.html'));
    logger.warn(`Code 404, ${ip} requesting non-existent ${req.originalUrl}`);
    console.log(chalk.default.yellowBright(`Code 404, ${ip} requesting non-existent ${req.originalUrl}`));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(chalk.default.red("Global error handler:", err));
    logger.error(`Global error handler: ${err}`);
    if (!res.headersSent) {
        res.status(500).sendFile(path.join(__dirname, 'public', 'errors', '50x.html'));
    }
});

let users = {};
try {
    users = JSON.parse(fs.readFileSync(path.join(__dirname, 'auth.json'), 'utf-8'));
} catch (e) {
    fs.writeFileSync(path.join(__dirname, 'auth.json'), '{}');
    users = {};
    logger.warn('auth.json not found, created an empty one.');
}

console.log(chalk.default.blue('Starting Server...'));

// Start the server
const ports = [
    3000,
    8080,
    1111,
    2222,
    3333,
    4444,
    5555,
    6666,
    7777,
    8888,
    9999,
    1234,
    5678
];

function tryListen(ports, idx = 0) {
    if (idx >= ports.length) {
    console.error(chalk.default.red("All ports failed. Server could not start."));
    logger.error("All ports failed. Server could not start.");
        return;
    }
    app.listen(ports[idx], (err) => {
        if (err) {
            console.log(chalk.default.red(`Error starting server on port ${ports[idx]}: ${err}`));
            logger.error(`Error starting server on port ${ports[idx]}: ${err}`);
            tryListen(ports, idx + 1);
        } else {
            console.log(chalk.default.green(`Server listening on localhost:${ports[idx]}`));
            logger.info(`Server listening on localhost:${ports[idx]}`);
        }
    });
}

tryListen(ports);
