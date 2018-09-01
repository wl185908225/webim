  $(function(){

    //定义变量
    var nickName;
    var $appChatContent = $('.app-chat-content');
    var $elTemplate = $('#el_template');
    var $elInputMsg = $('#el_input_msg');
    var $elBtnSend = $('#el_btn_send');

    var client = io.connect('http://localhost:8000', {
      reconnectionAttempts: 1000,    //重连次数
      reconnection: true,         //是否重连
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 2000,              //超时时间
      autoConnect: true           //自动连接
    });

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

    $elBtnSend.on('click', function() {
      var value = $elInputMsg.val();
      if (value) {
        console.log('send msg to server');
        sendMsg(value);
      }
    });

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

    //数据
    client.on('client.newMsg', function(msgObj ) {
      if (msgObj.type === 'image') {
        msgObj.data = '<img src="' + msgObj.data + '" alt="image" >';
      }
      writeMsg('user', msgObj.data, msgObj.nickName, msgObj.clientId===client.id);
      $elInputMsg.val('');
      $appChatContent[0].scrollTop =  $appChatContent[0].scrollHeight;
    });

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

