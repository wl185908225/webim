  $(function(){

    //定义变量
    var nickName;
    var $appChatContent = $('.app-chat-content');
    var $elTemplate = $('#el_template');

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
                                             .replace('${pullRight}', isSelf ? 'pull-right' : '')
                                             .replace('${info-icon}', type === 'system' ? 'glyphicon-info-sign' : 'glyphicon-user')
                                             .replace('${time}', '00:00:00')
                                             .replace('${msg}', msg);
      $appChatContent.append(template);
    }


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

