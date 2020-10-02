const path = require('path'); 
const express = require('express');
const app = new express();
const http = require("http").Server(app);
var io = require("socket.io")(http);
var adminSocketId = null;

var port = process.env.port || 3000;

app.use(express.static(__dirname));

app.get('/', (req,res)=> {
    res.redirect('index.html');
});

app.get('/admin', (req,res)=>{
  res.redirect('index-admin.html')
});

io.sockets.on('connection', function(socket){
    
// convenience function to log server messages on the client

function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  ///check no. of clients in room

function getNumClients(room){

  var clientsInRoom = io.sockets.adapter.rooms[room];
  var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

  return numClients;
}

function checkRoomExistence(room){
///////////write code to check wether a room exists or not
 return false;
 //default putted to false
};

  socket.on('query' , function(message , room){
    socket.broadcast.emit('query' , message , socket.id);
  });


  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

    socket.on('msgForAdmin' , function(message){
      console.log('got a msg foR ADMIN');
      console.log("admin id" , adminSocketId);
      io.to(adminSocketId).emit('msgForAdmin' , message);
      console.log("directed msg to admin")
    })
///////////////room  creation request from admin

  socket.on('create',function(room) {
/*
    if(checkRoomExistence){
      /////check is same room name already exists
      socket.emit('Room already exists')
    }
    else{
      */
    socket.join(room);
    adminSocketId = socket.id;
    log('Client ID ' + socket.id + ' created room ' + room);
    console.log("created room " + room);
    socket.emit('created', room, socket.id);
    console.log("sent 'created' message ")
    socket.broadcast.emit('adminSocketId',adminSocketId);
    //}

  });

///////////////////////msg for joining with room and name by clients 
  socket.on('join', function(room , userName) {
    log(userName + ' sent request to join room ' + room);

    var numClients = getNumClients(room);

    log('Room ' + room + ' presently has ' + numClients + ' client(s)');

    /////////////////////////////check room size/////////////////////
    if (numClients <=5 ) {
      log(userName + ' with Client ID ' + socket.id + ' wants to join ' + room);
     // io.sockets.in(room).emit('join ', room);
      socket.join(room);
      socket.emit('joined', room, socket.id , adminSocketId);
      io.sockets.in(room).emit('ready',room);
    } else { // max six clients
      socket.in(room).emit('full', room);
    }
  });

  ///////////////////////////join fuction ends//////////////

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

});


http.listen(port,function(){
    console.log("listening to port" + port);
});