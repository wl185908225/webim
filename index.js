'use strict';

var path = require('path');
var fs = require('fs');
var uuid = require('node-uuid');
var http = require('http');
var SocketIo = require('socket.io');
var express = require('express');

var roomMap = {
  'aa1': 'roomA',
  'aa2': 'roomA',
  'bb1': 'roomB',
  'bb2': 'roomB'
};

var getRoom = (userId) => {
  return roomMap[userId] || 'default-room';
};

var isRoom = (roomId) => {
  return Object.values(roomMap).indexOf(roomId) >= 0;
};

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

var getUserlist = (usersMap) => {
  var userList = [];
  for(let client of usersMap.values()) {
    userList.push(client.nickName);
  }
  return userList;
};

var usersMap = new Map();
io.on('connection', (socket) => {
  console.log(socket.handshake.headers.userId);
  console.log(socket.id);
  //保存连接的客户端
  usersMap.set(socket.id, socket);

  //客户端上线
  socket.on('server.online', (nickName) => {
    socket.nickName = nickName;
    console.log('from client data: ' + nickName);

    //设置昵称的时候，加入房间
    var roomId = getRoom(nickName);
    socket.join(roomId);
    console.log(`${nickName}加入了房间${roomId}`);
    console.log(socket.adapter.rooms);
    io.emit('client.online', nickName);

    //发送一个加入房间的通知
    socket.emit('client.joinroom', {
      nickName: nickName,
      roomId: roomId
    });
  });

  //客户端新消息
  socket.on('server.newMsg', (msgObj) => {
    msgObj.time = Date.now();
    msgObj.nickName = socket.nickName;
    if(msgObj.type === 'text') {
      //发送文字，是否前缀是指定房间发送内容
      var splitPoint = msgObj.data.indexOf(':');
      if(splitPoint > 0) {
        var roomId = msgObj.data.substring(0, splitPoint);
        if(isRoom(roomId)) {
          var msg = msgObj.data.substring(splitPoint + 1);
          msgObj.data = msg;
          io.to(roomId).emit('client.newMsg', msgObj);
          return;
        }
      }
    }
    console.log('from client data: ' + msgObj.data);
    io.emit('client.newMsg', msgObj);
  });

  //客户端在线用户列表
  socket.on('server.getOnlinelist', () => {
    socket.emit('client.onlinelist', getUserlist(usersMap));
  });

  //文件
  socket.on('server.sendfile', (fileMsgObj) => {
    var stat = fs.existsSync(path.join(__dirname,'./public/files'));
    if(!stat) {
      fs.mkdirSync(path.join(__dirname,'./public/files'));
    }
    var index1 = fileMsgObj.fileName.lastIndexOf(".");
    var index2 = fileMsgObj.fileName.length;
    var newFileName = uuid.v4() + fileMsgObj.fileName.substring(index1, index2);
    var filePath =  path.resolve(__dirname, `./public/files/${newFileName}`);
    fs.writeFileSync(filePath, fileMsgObj.file, 'binary');
    io.emit('client.file', {
      nickName: socket.nickName,
      now: Date.now(),
      data: newFileName,
      clientId: fileMsgObj.clientId
    });
    console.log(getUserlist(usersMap));
  });

  //客户端下线
  socket.on('disconnect', () => {
    usersMap.delete(socket.id);
    console.log('client ' + socket.nickName + 'offline');
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

//创建命名空间,具有隔离性，不会影响io的
// var newNsp = io.of('/nsp1');
// newNsp.on('connect', (socket) => {
//   console.log('newNsp client connected');

//   // 客户端连接io会收到，newNsp不会收到
//   //io.emit('ioCeived', 'ioCeived123');

//   // 客户端连接newNsp会收到，io不会收到
//   //socket.emit('newNspCeived', 'newNspCeived123');
// });

server.listen(8000, (err) => {
  if(err) {
    return console.error(err);
  }
  console.log('server started in port 8000');
});