process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException:', (err) => {
    console.error('Uncaught Exception:', err);
});

let maintenance = false; // Set to true to enable maintenance mode

const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { log } = require('console');

// See if the path is /status, and if it is, send a status code of 200 and send the status.html file as a file response
app.use('/status', (req, res) => {
    res.statusCode(200).sendFile(path.join(__dirname, 'public', 'status.html'))
});

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Session setup (must be before routes that use sessions)
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Endpoint to get current logged-in username
app.get('/me', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Global maintenance mode middleware
app.use((req, res, next) => {
    if (maintenance) {
        // Allow essential static files and status page
        if (
            req.originalUrl === '/status' ||
            req.originalUrl.startsWith('/css/') ||
            req.originalUrl.startsWith('/js/')
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
// --- User Profile CRUD API ---
const profilesPath = path.join(__dirname, 'profiles.json');

function readProfiles() {
    try {
        return JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
    } catch (e) {
        return [];
    }
}

function writeProfiles(profiles) {
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2), 'utf-8');
}

// Get all profiles
app.get('/profiles', (req, res) => {
    res.json(readProfiles());
});

// Get a single profile by id
app.get('/profiles/:id', (req, res) => {
    const profiles = readProfiles();
    const profile = profiles.find(p => p.id === req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
});


// Create a new profile (only for logged-in user, or via signup)
app.post('/profiles', express.json(), (req, res) => {
    if (!req.session || !req.session.authenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const profiles = readProfiles();
    const { name, email, bio } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
    // Only allow one profile per user
    if (profiles.some(p => p.owner === req.session.username)) {
        return res.status(400).json({ error: 'Profile already exists for this user' });
    }
    const id = Date.now().toString();
    const newProfile = { id, name, email, bio: bio || '', owner: req.session.username };
    profiles.push(newProfile);
    writeProfiles(profiles);
    res.status(201).json(newProfile);
});

// Update a profile (only owner can edit)
app.put('/profiles/:id', express.json(), (req, res) => {
    if (!req.session || !req.session.authenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const profiles = readProfiles();
    const idx = profiles.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Profile not found' });
    if (profiles[idx].owner !== req.session.username) {
        return res.status(403).json({ error: 'Forbidden: not your profile' });
    }
    const { name, email, bio } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
    profiles[idx] = { ...profiles[idx], name, email, bio: bio || '' };
    writeProfiles(profiles);
    res.json(profiles[idx]);
});

// Delete a profile (only owner can delete)
app.delete('/profiles/:id', (req, res) => {
    if (!req.session || !req.session.authenticated) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    let profiles = readProfiles();
    const idx = profiles.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Profile not found' });
    if (profiles[idx].owner !== req.session.username) {
        return res.status(403).json({ error: 'Forbidden: not your profile' });
    }
    const deleted = profiles.splice(idx, 1)[0];
    writeProfiles(profiles);
    res.json(deleted);
});
// Signup route: create user and default profile
app.post('/signup', express.json(), (req, res) => {
    const { username, password, name, email } = req.body;
    if (!username || !password || !name || !email) {
        return res.status(400).json({ error: 'All fields required' });
    }
    // Check if user exists
    let usersData = {};
    try {
        usersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'auth.json'), 'utf-8'));
    } catch (e) {}
    if (usersData[username]) {
        return res.status(400).json({ error: 'User already exists' });
    }
    // Add user
    usersData[username] = password;
    fs.writeFileSync(path.join(__dirname, 'auth.json'), JSON.stringify(usersData, null, 2), 'utf-8');
    // Add default profile, but only if one does not already exist for this user
    const profiles = readProfiles();
    if (profiles.some(p => p.owner === username)) {
        return res.status(400).json({ error: 'Profile already exists for this user' });
    }
    const id = Date.now().toString();
    const newProfile = { id, name, email, bio: '', owner: username };
    profiles.push(newProfile);
    writeProfiles(profiles);
    res.status(201).json({ message: 'Signup successful', username });
});
// --- End User Profile CRUD API ---

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
