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

//Kết nối CSDL
var db = require('mysql') // Khởi tạo CSDL

var dbConnection = db.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'hexachess'
})

//Kết nối mysql
dbConnection.connect(function(err){
    if(err) throw err;

    console.log("Đã kết nối với DTB");
})

io.on('connection', (socket) =>{
    console.log("Có user kết nối");

    //Chức năng Chat
    //Server nhận dữ liệu từ client khi người dùng nhập dữ liệu và gửi
    socket.on('socketClientSendDataToServer', function(data){
        console.log("dữ liệu nhận được: " +  data);
        socket.broadcast.emit('socketServerSendDataToClient', data)
    })

    //Chức năng tạo phòng
    socket.on("socketClientCreateNewRoom", function(data){
        console.log("Client gửi dữ liệu tạo phòng với chủ phòng có tên :" + data); 

        //Tạo tên phòng ngẫu nhiên từ 1000 -> 9999
        var vNumberRoom = Math.floor(Math.random()*(9999-1000+1)+1000);
        var vRoomName = "Room" + vNumberRoom;
        console.log("Tên vừa được tạo: "+ vRoomName);

        //Thực hiện câu truy vấn
        var vqueryCheckRoomNameExists = "SELECT * FROM `room` WHERE roomname = '"+vRoomName+"'"; // Tạo truy vấn kiểm tra có dữ liệu trả về với tên đó không

        dbConnection.query(vqueryCheckRoomNameExists, function(err, result){ // Thực hiện truy vấn check phòng 
            if(result.length == 0){
                var vqueryInsertNewRoom = "INSERT INTO `room`(`roomname`, `host`, `guest`, `count`) VALUES ('"+vRoomName+"','"+data+"','',1)"; // Tạo truy vấn thêm phòng mới

                dbConnection.query(vqueryInsertNewRoom, function (err){ // Thực hiện truy vấn thêm phòng mới
                    if(err) throw err
                    console.log("Đã thêm phòng thành công");

                    socket.join(vRoomName); // Vào phòng vRoomName

                    var objectDataNewRoomServerSendClient = 
                        {
                            NewRoomName : vRoomName,
                            isCheckChange : true
                        }

                    socket.emit("socketServerSendChangePageToBoard", objectDataNewRoomServerSendClient);
                })
            }else{
                console.log("Đã trùng phòng");
            }
        })

    });

    //Chức năng lấy danh sách phòng từ CSDL
    socket.on("socketClientSendRequestListRoom", function(Data){
        if(Data){
            console.log(Data)
            var vqueryGetListRoom = "SELECT * FROM `room`"; //Tạo câu truy vấn để lấy dữ liệu từ CSDL

            dbConnection.query(vqueryGetListRoom, function(err, result){ //Thực hiện câu truy vấn để lấy dữ liệu
                // console.log(result); //Thực hiện kiểm tra xem có bao nhiêu phòng
                
                socket.emit("socketServerSendRequestListRoom", result); // Gửi lại dữ liệu phòng cho client
            });

        }
    })


    //Chức năng đánh cờ
    //Server nhận dữ liệu từ client khi người dùng di chuyển quân cờ
    socket.on('socketClientSendDataQuanCoToServer', function(data){
        console.log("dữ liệu nhận được: " +  data);
        socket.broadcast.emit('socketClientSendDataQuanCoToServer', data)
    })


})

server.listen(3000,function(){
    console.log("server đang chạy trên 3000...");
})