  $(function(){

    //定义变量
    var nickName;
    var $appChatContent = $('.app-chat-content');                     //聊天信息容器
    var $elTemplate = $('#el_template');                              //消息模板
    var $elInputMsg = $('#el_input_msg');                             //发送信息输入框
    var $elBtnSend = $('#el_btn_send');                               //发送信息按钮
    var $elBtnSendfile = $('#el_btn_sendfile');                       //发送文件弹窗按钮
    var $elBtnFileSend = $('#el_btn_file_send');                      //发送文件按钮
    var $elBtnFileCancel = $('#el_btn_file_cancel');                  //取消文件按钮
    var $elFileUploadElements = $('.app-file-container, .backup');    //文件弹窗按钮
    var elFile = document.getElementById('el_file');                  //文件输入框
    var $elNickname = $('#el_nickname');                              //当前用户昵称
    var $elTableUserlist = $('#el_table_userlist');                   //在线用户列表


    var client = io.connect('http://localhost:8000', {
      reconnectionAttempts: 1000,    //重连次数
      reconnection: true,         //是否重连
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 2000,              //超时时间
      autoConnect: true           //自动连接
    });

    //连接新的命名空间
    // var clientForNewNsp = io.connect('http://localhost:8000/nsp1');
    // clientForNewNsp.on('connect', function() {
    //   console.log('clientForNewNsp connect server succed');
    // });


    //工具方法
    function writeMsg(type, msg ,title, isSelf) {
      title = title || (type === 'system' ? '系统消息' : 'User');
      var template = $("#el_template").html().replace('${title}', title)
                                             .replace('${bgClass}', type === 'system' ? 'label-danger' : 'label-info')
                                             .replace(/\${pullRight}/g, isSelf ? 'pull-right' : '')
                                             .replace('${textRight}', isSelf ? 'text-right' : '')
                                             .replace('${info-icon}', type === 'system' ? 'glyphicon-info-sign' : 'glyphicon-user')
                                             .replace('${time}', '00:00:00')
                                             .replace('${msg}', msg);
      $appChatContent.append(template);
    }

    function sendMsg(msg, type) {
      var msgObj = {
        type: type || 'text',
        data: msg,
        clientId: client.id
      };
      client.emit('server.newMsg', msgObj);
    }

    //发送消息
    $elBtnSend.on('click', function() {
      var value = $elInputMsg.val();
      if (value) {
        console.log('send msg to server');
        sendMsg(value);
      }
    });

    //显示文件选择弹窗
    $elBtnSendfile.on('click', function() {
      console.log('elBtnSendfile click');
      $elFileUploadElements.show();
    });

    //取消文件弹窗
    $elBtnFileCancel.on('click', function() {
      elFile.value = '';   //清空选择文件
      $elFileUploadElements.hide();
    });

    //选择文件后发送
    $elBtnFileSend.on('click', function() {
      console.log('elBtnFileSend click');
      var files = elFile.files;
      if (files.length === 0) {
        return window.alert('Must select a file.');
      }
      var file = files[0];
      //发送文件
      client.emit('server.sendfile', {
        clientId: client.id,
        file: file,
        fileName: file.name
      });
      elFile.value = '';
      $elFileUploadElements.hide();
    });

    //黏贴图片
    $(document).on('paste', function(e) {
      var originalEvent = e.originalEvent;
      var items;
      if (originalEvent.clipboardData && originalEvent.clipboardData.items) {
        items = originalEvent.clipboardData.items;
      }
      if (items) {
          for(var i = 0, len = items.length; i < len; i++) {
            var item = items[i];
            if (item.kind === 'file') {
              var pasteFile = item.getAsFile();

              //限制图片大小
              if (pasteFile.size > 1024 * 1024) {
                return;
              }
              var reader = new FileReader();
              reader.onload = function(event) {
                var imgBase64Str  = reader.result;
                sendMsg(imgBase64Str, 'image');
              };
              //读取数据
              reader.readAsDataURL(pasteFile);
            }
          }
      }
    });


    //输入昵称
    do {
      nickName = prompt('请输入您的昵称');
    } while(!nickName);
    $elNickname.text(nickName);

    //通知服务器上线
    client.emit('server.online', nickName);

    //上线
    client.on('client.online', function(nickName) {
      writeMsg('system', '[' + nickName + ']上线了');
    });

    //下线
    client.on('client.offline', function(nickName) {
      writeMsg('system', '[' + nickName + ']下线了');
    });

    //
    client.on('client.joinroom', function(msgObj) {
       writeMsg('user', '我加入了房间' + msgObj.roomId, msgObj.nickName);
    });

    //数据
    client.on('client.newMsg', function(msgObj ) {
      if (msgObj.type === 'image') {
        msgObj.data = '<img src="' + msgObj.data + '" alt="image" >';
      }
      writeMsg('user', msgObj.data, msgObj.nickName, msgObj.clientId===client.id);
      $elInputMsg.val('');
      $appChatContent[0].scrollTop =  $appChatContent[0].scrollHeight;
    });

    //监听拉取在线列表
    client.on('client.onlinelist', function(userList) {
      $elTableUserlist.find('tr').not(':eq(0)').remove();
      userList.forEach(function(user) {
        var $tr =  '<tr>' + 
                      '<td>' + user +
                      '</td>' + 
                    '</tr>';
            $elTableUserlist.append($tr);
      });
    });

    //监听文件返回
    client.on('client.file', function(fileMsgObj) {
      var content = '<a href="./files/' + fileMsgObj.data + '">文件：' + fileMsgObj.data + '</a>';
      writeMsg('user', content, fileMsgObj.data, client.id === fileMsgObj.clientId);
    });

    //发送请求服务器在线列表
    var intervalId = setInterval(function() {
      client.emit('server.getOnlinelist');
      if(0) {
        clearInterval(intervalId);
      }
    }, 2 * 1000);
    

    client.on('connect', function() {
      console.log('connect');
    });

    client.on('disconnect', function() {
      console.log('disconnect');
    });

    client.on('reconnect', function() {
      console.log('reconnect');
    });

    client.on('reconnect_attempt', function(count) {
      console.log('reconnect_attempt', count);
    });

    client.on('reconnecting', function(count) {
      console.log('reconnecting', count);
    });

    client.on('reconnect_error', function(err) {
      console.log('reconnect_error', err);
    });

    client.on('error', function(err) {
      console.log(err);
    });
  });

