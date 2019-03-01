const path = require('path'); 
const express = require('express');
const app = new express();
const http = require("http").Server(app);
var io = require("socket.io")(http);
const SocketIOFile = require('socket.io-file');

var clientIndex = 0;

var adminSocketId = null;

var port = process.env.port || 3000;

app.use(express.static(__dirname));

app.get('/', (req,res)=> {
    res.redirect('client.html');
});

app.get('/admin', (req,res)=>{
  res.redirect('admin.html')
});

app.get('/socket.io-file-client.js', (req, res, next) => {
	return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
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

  socket.on('query' , function(msg , room){
    socket.broadcast.emit('query' ,{
      user : socket.nickname,
      message : msg
    });
  });                                                                                                                                                                                                 +


  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

    socket.on('msgForAdmin' , function(message){
      //console.log('got a msg foR ADMIN');
      //console.log("admin id" , adminSocketId);
      io.to(adminSocketId).emit('msgForAdmin' , message);
      console.log("directed msg to admin")
    })
///////////////room  creation request from admin

  socket.on('create',function(room , username) {

    socket.join(room);
    socket.nickname = username;
    //console.log("ADMIN's nickname = " + socket.nickname );
    adminSocketId = socket.id;
    log('Client ID ' + socket.id + ' created room ' + room);
    socket.emit('created', room, socket.id);
    
    socket.broadcast.emit('adminSocketId',adminSocketId);

  });

///////////////////////msg for joining with room and name by clients 
  socket.on('join', function(room , userName) {
    log(userName + ' sent request to join room ' + room);
    console.log('userName = ' + userName);
    //Check room size
    var numClients = getNumClients(room);

    if (numClients <=20 ) {
      socket.join(room);
     // socket.count = clientIndex++;
      //console.log('username after joining = ' +  userName);
      socket.nickname = userName;
      //console.log(socket.nickname + ' has index  = '+socket.count);
      //console.log('nickname = '+ socket.nickname);
      socket.emit('joined', room, socket.id , adminSocketId);
      socket.broadcast.emit('newClient' , userName);               //for showing online users
      io.sockets.in(room).emit('ready',room);
    } else {
      socket.in(room).emit('full', room);
    }
  });
  ///////////////////////join fuction ends//////////////

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
    socket.broadcast.emit('clientOffline' , socket.nickname);
    console.log(socket.nickname + ' left ============');
    
  });

  socket.on('iAmLeaving' , function(){
    socket.broadcast.emit('clientOffline' , socket.nickname);
    console.log(socket.nickname + ' left ============');
  })

  /////////////////////////////////////////////////////////////////====================================////////file upload

        var count = 0;
	var uploader = new SocketIOFile(socket, {
		// uploadDir: {			// multiple directories
		// 	music: 'data/music',
		// 	document: 'data/document'
		// },
		uploadDir: 'data',							// simple directory
	
		chunkSize: 10240,							
		transmissionDelay: 0,						// delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay)
		overwrite: false, 							

	});
	uploader.on('start', (fileInfo) => {
		console.log('Start uploading');
		console.log(fileInfo);
	});
	uploader.on('stream', (fileInfo) => {
		//console.log(`${fileInfo.wrote} / ${fileInfo.size} byte(s)`);
	});
	uploader.on('complete', (fileInfo) => {
		console.log('Upload Complete.');
                console.log(fileInfo);
                link = "http://localhost:3000/"+fileInfo.uploadDir;
                //socket.broadcast.emit('fileLink',link);
                socket.broadcast.emit('query' , {
                  user : socket.nickname,
                  message : link
                });
                console.log(fileInfo.uploadDir);
  });
  
	uploader.on('error', (err) => {
		console.log('Error!', err);
  });
  
	uploader.on('abort', (fileInfo) => {
		console.log('Aborted: ', fileInfo);
	});
////////////////////////////////////////////////////////////////////////
});


http.listen(port,function(){
    console.log("listening to port" + port);
});