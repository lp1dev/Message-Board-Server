const express = require('express')
const app = express()
const messages = require('./messages.json')
const bodyParser = require('body-parser')
const jwt = require('jwt-simple')
const SocketServer = require('ws').Server;
//
const port = process.env.PORT || 8090
const secret = 'notSoSecretButKindaSecretAnyway'
const users = []

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
})

app.use(bodyParser.json({limit: '50mb'}))

function checkUser(req) {
    const authorization = req.headers['authorization']
    if (authorization && authorization.length && authorization.split(' ').length == 2) {
        try{
            const [type, token] = authorization.split(' ')
            const decoded = jwt.decode(token, secret)
	    const filtered = users.filter(user => user.login === decoded.login)
	    console.log('filtered', filtered)
	    if (filtered.length === 1) {
		return filtered[0]
	    }
            return null
        }
        catch(Exception){
            console.log(exception)
            return null
        }
    }
    console.log('checkUser :: No valid token provided')
    return null
}

app.post('/users', (req, res) => {
    const body = req.body
    if (!body.login || !body.password) {
        const error = {'error': 'Missing password or login'};
        res.status(400).send(error)
    }
    let isFound = false;
    for (let i = 0; i < users.length; i++) {
        if (users[i].login == body.login) {
            res.status(400).send({error: 'This user already exists'})
            isFound = true;
        }
    }
    if (!isFound) {
	if (!req.body.avatar) {
	    req.body.avatar = 'https://www.drupal.org/files/issues/default-avatar.png'
	}
        users.push(req.body)
        res.send({message: 'user created', id: users.length - 1})
    }
})

app.get('/users', (req, res) => {
    console.log(req.headers)
    const user = checkUser(req)
    if (user) {
        res.send({login: user.login, avatar: user.avatar})
	return
    }
    res.status(401).send({error: 'You must provide an Authorization header'})
})

app.post('/login',  (req, res) => {
    const body = req.body
    console.log('request body', body)
    console.log('users', users)
    
    if (!body.login || !body.password) {
        const error = {'error': 'Missing password or login'};
        res.status(400).send(error)
	return
    }
    for (let i = 0; i < users.length; i++) {
        if (users[i].login === body.login) {
	    console.log('found user', users[i])
	    console.log('users are', users)
            if (users[i].password !== body.password) {
                res.status(401).send({'error': 'Invalid password'})
            }
            else {
                const token = jwt.encode({login: users[i].login, password: users[i].password}, secret);
                res.send({'token': 'basic '+token})
		return
            }
        }
    }
    res.status(401).send({'error': 'Invalid login'})
    
})

app.get('/messages', (req, res) => {
    console.log(req.headers)
    res.send(messages)
})

app.post('/messages', (req, res) => {

    console.log(req.body)
    let message = req.body
    const user = checkUser(req)
    if (user) {
        message.author = {login: user.login, avatar: user.avatar};
        message.id = messages.length
        messages.unshift(message)
        res.send(messages)
        wss.clients.forEach((client) => {
            client.send(JSON.stringify({message: "Someone posted a new message!", extra: message}))
        })
    }
    else {
        res.status(400).send({error: 'You need to login to post a new message'})
    }
})

app.get('/messages/:id', (req, res) => {
    console.log('req.params.id', req.params.id);
    const id = req.params.id
    if (id >= 0 && id < messages.length) {
        res.send(messages[id])
    }
    else {
        res.status(404).send({error: 'Unknown message'})
    }
})

app.get('/notify', (req, res) => {
    wss.clients.forEach((client) => {
        client.send(new Date().toTimeString());
    });
    res.send('done')
})

app.get('/', (req, res) => {
    const output = `GET /messages : <b>get all of the messages</b><br/>
                    POST /messages : params: {content, type, date, image?} : <b>Add a new message</b><br/>
                    GET /messages/{id} : <b>get a specific message</b><br/>
		    GET /users : <b>get the logged user's information</b><br/>
                    POST /users : params: {login, password, avatar} : <b>Add an user</b><br/>
                    POST /login : params: {login, password} : <b>Get an access token</b><br/>`
    res.send(output)
})

const server = app.listen(port, () => console.log('MessageBoard server listening on port ' + port))

const wss = new SocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});
