let {Server} = require("socket.io");
let roomMap = {};
let messageBox = {};

function initialize(server) {
    const io = new Server(server, {
        path: '/mySocket'
    });

    io.on("connection", (socket) => {
        const handshake = socket.handshake;
        const token = handshake.auth.token;

        if (token === 'data-receiver') {
            // 收集连接的接收者
            if (!roomMap[token]) {
                roomMap[token] = []
            }
            roomMap[token].push(socket.id)
        } else {
            // 收集连接的其他人（汇报者）
            roomMap[token] = socket.id;
        }

        // 发送与当前客户端有关的数据
        if (messageBox[token]) {
            io.to(socket.id).emit('message', messageBox[token])
        }

        // 接受由客户端传来的信息
        socket.on('message', (data) => {
            if (data.from === 'uploader') {
                // 向接收者们传递汇报者的数据
                const receivers = roomMap['data-receiver'];
                messageBox['data-receiver'] = {code:200,data:data.data}
                if (receivers && receivers.length) {
                    io.to(receivers).emit('message', data.data)
                }
            }
        })

        // 断开连接
        socket.on('disconnect', (reason) => {
            // 删除断开的客户端
            if (token === 'data-receiver') {
                roomMap[token] = roomMap[token].filter(r => r !== socket.id);
            } else {
                delete roomMap[token];
                messageBox[token] = null;
                messageBox['data-receiver'] = {code:500};
                const receivers = roomMap['data-receiver'];
                // 通知所有接收者断开了
                if (receivers && receivers.length) {
                    io.to(receivers).emit('message', messageBox['data-receiver']);
                }
            }
        })
    });
}

module.exports = {
    mount: initialize
}
