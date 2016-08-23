var express = require('express');
var ejs = require('ejs');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var http = require('http');
var socketio = require('socket.io');
var xss = require('xss');

var app = express();
var port = 3000;
var server = http.createServer(app);
var io = socketio(server);

var onlineUsers = {};
var onlineCount = 0;

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('.html', ejs.__express);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  if (!req.cookies.user) {
    res.redirect('/login');
  } else {
    res.render('index.html');
  }
});

app.get('/login', function (req, res) {
  res.render('login.html');
});

app.post('/login', function (req, res) {
  if (onlineUsers.hasOwnProperty(req.body.username)) {
    res.redirect('/login');
  } else {
    res.cookie('user', req.body.username, { maxAge: 1000 * 60 * 60 * 24 * 10 });
    res.redirect('/');
  }
});

io.binaryType = 'arraybuffer';
io.on('connection', function (socket) {
  socket.on('login', function (obj) {
    socket.name = obj.username;
    onlineUsers[obj.username] = obj.username;
    onlineCount += 1;
    io.emit('login', {
      onlineUsers: onlineUsers,
      onlineCount: onlineCount,
      user: obj
    });
    console.log(obj.username + '进入了聊天室');
  });
  socket.on('disconnect', function () {
    if (onlineUsers.hasOwnProperty(socket.name)) {
      var obj = {
        username: onlineUsers[socket.name]
      };
      delete onlineUsers[socket.name];
      onlineCount -= 1;
      io.emit('logout', {
        onlineUsers: onlineUsers,
        onlineCount: onlineCount,
        user: obj
      });
      console.log(obj.username + '离开了聊天室');
    }
  });
  socket.on('message', function (obj) {
    if (obj.type === 'text') {
      obj.message = xss(obj.message.replace('\n', '<br />'));
    }
    if (obj.to === 'all') {
      io.emit('message', obj);
      console.log(obj.username + ' 发言了');
    } else {
      var sockets = io.sockets.sockets;
      for(var key in sockets) {
        if (sockets[key].name === obj.to || sockets[key].name === obj.username) {
          sockets[key].emit('message', obj);
          console.log(obj.username + ' 对 ' + obj.to + ' 发送私密消息');
        }
      }
    }
  });
});

server.listen(app.get('port'), function () {
  console.log('listening on port:' + port);
});
