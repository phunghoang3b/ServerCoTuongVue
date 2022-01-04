const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) =>{
    console.log("Có user kết nối");

    //Server nhận dữ liệu từ client khi người dùng nhập dữ liệu và gửi
    socket.on('socketClientSendDataToServer', function(data){
        console.log("dữ liệu nhận được: " +  data);
        socket.broadcast.emit('socketServerSendDataToClient', data)
    })


})

server.listen(3000,function(){
    console.log("server đang chạy trên 3000...");
})