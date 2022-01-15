const express = require("express");
const http = require("http");
const {Server, RemoteSocket} = require("socket.io");

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
let roomNameInGame ="";
io.on('connection', (socket) =>{
    console.log("Có user kết nối");

    //Chức năng Chat
    //Server nhận dữ liệu từ client khi người dùng nhập dữ liệu và gửi
    socket.on('socketClientSendDataToServer', function(data){
        console.log("dữ liệu nhận được: " +  data);
        socket.broadcast.emit('socketServerSendDataToClient', data)
    })

    //HOST

    //Chức năng tạo phòng cho Host
    socket.on("socketClientCreateNewRoom", function(data){

        //Truy vấn lấy tên người hiện tại đăng nhập trang web
        var vqueryGetNameLogin = "SELECT username FROM `account` WHERE id = '"+data+"'";
        var vstrUsernameLogin = "";

        dbConnection.query(vqueryGetNameLogin, function(err, result){
            vstrUsernameLogin = result[0].username;
            console.log(vstrUsernameLogin);
        })

        console.log("Client gửi dữ liệu tạo phòng với chủ phòng có tên :" + data); 

        //Tạo tên phòng ngẫu nhiên từ 1000 -> 9999
        var vNumberRoom = Math.floor(Math.random()*(9999-1000+1)+1000);
        var vRoomName = "Room" + vNumberRoom;
        console.log("Tên vừa được tạo: "+ vRoomName);
        roomNameInGame = vRoomName

        //Thực hiện câu truy vấn
        var vqueryCheckRoomNameExists = "SELECT * FROM `room` WHERE roomname = '"+vRoomName+"'"; // Tạo truy vấn kiểm tra có dữ liệu trả về với tên đó không

        dbConnection.query(vqueryCheckRoomNameExists, function(err, result){ // Thực hiện truy vấn check phòng 
            if(result.length == 0){
                var vqueryInsertNewRoom = "INSERT INTO `room`(`roomname`, `host`, `guest`, `count`) VALUES ('"+vRoomName+"','"+vstrUsernameLogin+"','',1)"; // Tạo truy vấn thêm phòng mới

                dbConnection.query(vqueryInsertNewRoom, function (err){ // Thực hiện truy vấn thêm phòng mới
                    if(err) throw err
                    console.log("Đã thêm phòng thành công");
                    //Gửi dữ liệu phòng khi tạo phòng cho người chơi khác
                    socket.broadcast.emit("socketServerSendNewRoom", vRoomName);
                    //Gửi dữ liệu phòng cho kênh chat tổng
                    var objectDataLinkInviteServerSendClient = 
                        {
                            text: vRoomName,
                            user: vstrUsernameLogin,
                            link: true
                        }
                    socket.broadcast.emit('socketServerSendDataToClient', objectDataLinkInviteServerSendClient);

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


    //Lấy tên chủ phòng
    var vstrHostRoom;
    
    //Chức năng liên quan vào phòng
    //Lấy danh sách thông tin người chơi khi HOST vào phòng
    socket.on("socketClientHostSendRequestInformationPlayer", function(data){ // data là tên phòng

        //Socket tham gia phòng
        socket.join(data); //Host tham gia



        var vqueryGetInforPlayerInRoom = "SELECT * FROM `room` WHERE roomname = '"+data+ "'"; //Tạo câu truy vấn lấy thông tin người chơi

        dbConnection.query(vqueryGetInforPlayerInRoom, function (err, result){
            if(result.length > 0){
                console.log("Thông tin phòng " + data + " có host: " + result[0].host + " và guest: "+ result[0].guest)
                vstrHostRoom = result[0].host;
                socket.emit("socketServerSendRequestInformationPlayer", result);
            }
        })
    })

    var room ="";

    socket.on("socketSendRoomName", function(result){
        console.log("Tên phòng" + result);
        room = result
    })

    //Chức năng đánh cờ
    //Server nhận dữ liệu từ client khi người dùng di chuyển quân cờ
    socket.on('socketClientSendDataQuanCoToServer', function(data){
        console.log("dữ liệu nhận được: " +  data);
        console.log("phòng nhận được: " +  room);
        socket.broadcast.to(room).emit('socketClientSendDataQuanCoToServer', data)
    })

    //Kiểm tra socket client HOST dis
    socket.on("disconnect", () => {
        if(vstrHostRoom != null){
            var vqueryDeleteRoomWhenHostOut = "DELETE FROM `room` WHERE host = '"+ vstrHostRoom + "'";

            dbConnection.query(vqueryDeleteRoomWhenHostOut, function(err, result){
                console.log("Host out và xóa phòng");
            })
            var isLeaRoom = true
            socket.to(roomNameInGame).emit("socketServerSendLeaveRoom", isLeaRoom)
        }
    });

    //GUEST

    let objDataInfoPlayerInRoom = {
        host: "", 
        guest: ""
    }


    //Nhận dữ liệu khi guest vào phòng
    socket.on("socketClientGuestSendDataWhenJoinRoom", function(data){
        console.log("Guest vào phòng: " + data)

        socket.join(data.RoomName);
        roomNameInGame = data.RoomName

        //Ghi dữ liệu vào database khi guest vào phòng

        //Lấy username của guest
        var vqueryGetUsernameGuest = "SELECT username FROM `account` WHERE id = '" + data.GuestIdInDb + "'"

        

        dbConnection.query(vqueryGetUsernameGuest, function(err, result){
            //Ghi dữ liệu username vào phòng và chỉnh sửa số lượng người trong phòng
            var vqueryUpdatGuestAndCount = "UPDATE `room` SET `guest`='"+ result[0].username +"',`count`='2' WHERE roomname = '"+data.RoomName+"'"
            dbConnection.query(vqueryUpdatGuestAndCount, function(err, result){
                console.log("Đã thay đổi thông tin phòng khi Guest vào")
            })

            //Lấy dữ liệu của hai người chơi
            var vqueryGetInforPlayerInRoomWhenGuestJoin = "SELECT host, guest FROM `room` WHERE roomname = '"+data.RoomName+"'"

            dbConnection.query(vqueryGetInforPlayerInRoomWhenGuestJoin, function(err, result){
                console.log(result[0].host + " " + result[0].guest);
                io.to(data.RoomName).emit("IoSendDataInfoPlayer", result);
            })
        })

        socket.on("disconnect", function(){
            var isLeaRoom = true
            socket.to(roomNameInGame).emit("socketServerSendLeaveRoom", isLeaRoom)
        })
    })


    //Chức năng chat trong phòng
    //nhận dữ liệu từ client
    socket.on("socketSendChatToServer",function(data){
        console.log("Nội dung chat từ phòng: " + data.RoomNameHost+ " có nội dung là: "+ data.MessageChat)
        socket.to(data.RoomNameHost).emit("socketServerSendChatToRoom", data.MessageChat)  
    })

    //Nhận dữ liệu out phòng
    socket.on("socketClientSendLeaveRoom", function(data){
        console.log("Có người out phòng: " + data)
        socket.to(roomNameInGame).emit("socketServerSendLeaveRoom", data)
    })
    

})

server.listen(3000,function(){
    console.log("server đang chạy trên 3000...");
})