'use strict';

var path = require('path');
var http = require('http');
var SocketIo = require('socket.io');
var express = require('express');

var app = express();
app.use(express.static(path.join(__dirname, './public')));
var server = http.createServer(app);

var io = new SocketIo(server, {
  pingTimeout: 1000 * 10,                 //default 1000 * 60, 超时时间
  pingInterval: 1000 * 2,                 //default 1000 * 2.5,ping的频率
  transports: ['websocket', 'polling'],   //传输方式
  allowUpgrade: true,                     //default true,传输方式是否允许升级
  httpCompression: true,                  //default true,使用加密
  path: '/socket.io',                            //提供客户端js的路径
  serverClient: false                     //是否提供客户端js(socket.io-client)
});


//用户认证
io.set('authorization', (handshakeData, accept) => {
  if(handshakeData.headers.cookie) {
    handshakeData.headers.userId = Date.now();
    accept(null, true);
  } else {
    accept('Error', false);
  }
});


//var usersMap = new Map();
io.on('connection', (socket) => {
  console.log(socket.handshake.headers.userId);
  console.log(socket.id);

  //客户端上线
  socket.on('server.online', (nickName) => {
    socket.nickName = nickName;
    console.log('from client data: ' + nickName);
    io.emit('client.online', nickName);
  });

  //客户端下线
  socket.on('disconnect', () => {
    console.log('client ' + socket.nickName + 'offlines');
    socket.broadcast.emit('client.offline', socket.nickName);
  });

  //通知所有客户端
  //io.emit('online', socket.id); 
  //io.sockets.emit('online', socket.id);

  //除自己以外所以客户端
  //socket.broadcast.emit('online', socket.id); 

  //遍历通知所有客户端，如果出自己添加if判断
  // usersMap.set(socket.id, socket);
  // for(let client of usersMap.values()) {
  //   if(client.id !== socket.id) {
  //     client.emit('online', 'welcome');
  //   }
  // }
});

server.listen(8000, (err) => {
  if(err) {
    return console.error(err);
  }
  console.log('server started in port 8000');
});