'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc = [];
var turnReady;
var mySocketId = 'MD';
$('#hangup').hide();

var pcConfig = {
    'iceServers': [{
      'urls': 'stun:stun.l.google.com:19302'
    }]
  };

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  };
  
////////////////////////////////////////////////////QUERY PART////////////////////////////////////////////////////

var queryBox = document.querySelector("#query_box");
//var queryBtn = document.querySelector('#query_btn');

////////////////////////////////////QUERY BUTTON///////////////////

document.getElementById("query_btn").addEventListener("click", function(event){
    event.preventDefault();
       var query = document.getElementById('queryInput').value;
       console.log(query);
       sendQuery(query);
    });

///////////////////////

function receiveQuery (message , socketid , event)
{   
    $("#query_box").prepend('<div class="container">' + '<p>' + socketid + '</p>'+
                        '<p>'+ message +'</p>'+
                        '</div>');
    //event.preventDefault();
}

function sendQuery(msg){
    socket.emit("query" ,msg , room);
    addQuery(msg , mySocketId);
}

function  addQuery(message , socketid){


    $('#query_box').prepend('<div class="container">'+
                        '<p>' + 'Myself :' + '</p>'+
                        '<p>'+message+'</p>'+
                        '</div>');

}
////////////////////////////////////////QUERY PART ENDS/////////////////////////////

    //////////////////////// TAKING USERNAME AND ROOMNAME

var room = 'voice';
var userName = "MD "+ prompt("Enter your name");

///////////////////SOCKET MESSAGES////////////////
var socket = io.connect();

if (room  !=='') {
    socket.emit('create',room);
    console.log(userName + ": Sent request to create room");
}

socket.on('created', function(room , socketid){
    console.log('Created Room '+ room);
    console.log('My socket id =====' + socketid);
    isInitiator = true;
});

socket.on('full',function(room){
    console.log(room +  " is full ");
});

socket.on('ready',function(room){
    console.log('Triggering Channel In ' + room);
    isChannelReady =  true;

    if(isChannelReady && localStream !== undefined){
        maybeStart();
    }

});

socket.on('msgForAdmin' , function(message){
    console.log('got this message from any user ' , message);
})

socket.on('log',function(array){
    console.log.apply(console , array);
});

//////////////////////////////////////////////////////////


function sendMessage(message) {
    console.log(userName + ' sending msg : ',message);
    socket.emit('message' , message)
}

//////////////////////   QUERY COMMAND FROM SOCKET///////////////////////

socket.on('query', function(message , socketid)
{
    receiveQuery(message , socketid);
});

/////////////////////////////////////////////////////////////


socket.on('message' , function(message) {

    console.log(userName + ' received msg : ', message)

    if(message.type === 'answer'){
        pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
    }

});


////////////////////////////////////////VIDEO WORKS/////////////
var localVideo = document.querySelector('#localVideo');

var constraints = {
    audio : true,
    video : {
        width : 1280 ,
        height : 720
    }
};

navigator.mediaDevices.getUserMedia(constraints).then(gotStream)
    .catch(function(err){
        alert('getUserMedia error : '+err.name );
        });

function gotStream(stream){

    console.log(userName + ' : Adding local stream.');
    localStream =  stream;
    localVideo.srcObject = stream;
    sendMessage('got user media');
    startRecording();

    $('#hangup').show();

    console.log("Process of getting local media executed successfully");

}

/////////////////////SEND REQUEST FOR TURN SERVER///////////////
if(location.hostname !== 'localhost') {

    requestTurn(
        'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
    );
}

/////////////////////////////////////////////////////////////////////

function maybeStart(){

    console.log('>>>>>>>>>>>>>>>>>>. maybeStart() ');
    console.log("isStarted = " , isStarted);
    console.log('localStream = ', localStream);
    console.log('isChannelready = ', isChannelReady);
    console.log('>>>>>>>>>>>>>>>creating peer connection');

    createPeerConnection();

    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator = ',isInitiator);
    if(isInitiator){
        doOffer();
    }
}


window.onbeforeunload = function(){
    sendMessage('bye');
};

//////////////////////////////PEER COONECTIONS FUNCTIONS///////////

function createPeerConnection() {
    try{
        pc = new RTCPeerConnection(null);
        pc.onicecandidate = handleIceCandidate;
        console.log('Created RTCPeer Connection');
    }
    catch(err){
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}

function handleIceCandidate(event){
    console.log('icecandidate event : ' , event);
    if(event.candidate){
        sendMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate

        });
    } else {
        console.log('End Of Candidates');
    }
}

function handleCreateOfferError(event){
    console.log('createOffer() error :' , event);
}

function doOffer() {
    console.log(userName + ' sending offer to peer.');
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
    //pc.createAnswer().then( setLocalAndSendMessage, onCreateSessionDescriptionError);
}


function setLocalAndSendMessage(sessionDescription){
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
    console.trace('Failed to create session description: ' + error.toString());
}



////////////////////////for turn servers request//////////////////////
function requestTurn(turnURL) {
    var turnExists = false;
    for (var i in pcConfig.iceServers) {
      if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
        turnExists = true;
        turnReady = true;
        break;
      }
    }
    if (!turnExists) {
      console.log('Getting TURN server from ', turnURL);
      // No TURN server. Get one from computeengineondemand.appspot.com:
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          var turnServer = JSON.parse(xhr.responseText);
          console.log('Got TURN server: ', turnServer);
          pcConfig.iceServers.push({
            'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
            'credential': turnServer.password
          });
          turnReady = true;
        }
      };
      xhr.open('GET', turnURL, true);
      xhr.send();
    }
  }
  ///////////////////////////////////////turn event ends////////////////


/*
  function hangup() {
    console.log('Hanging up.');
    stop();
    stopRecording();
    downloadRecordings();
    sendMessage('bye');
  }
  */

  $('#hangup').click(function() {
        console.log('Hanging up.');
        stop();
        stopRecording();
        downloadRecordings();
        sendMessage('bye');
      });


  function stop() {
    isStarted = false;
   // pc.close();
    pc = null;
  }
  

  /////////////////////////////////////////////   VIDEO RECORDINGS

  const mediaSource = new MediaSource();
  mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
  
  let mediaRecorder;
  let recordedBlobs;
  let sourceBuffer;
  
  const errorMsgElement = document.querySelector('span#errorMsg');


  ///////////////////////////////////////START RECORDING

function startRecording() {
    recordedBlobs = [];
    let options = {mimeType: 'video/webm;codecs=vp9'};
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.error(`${options.mimeType} is not Supported`);
           // errorMsgElement.innerHTML = `${options.mimeType} is not Supported`;
        
            options = {mimeType: 'video/webm;codecs=vp8'};
        
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.error(`${options.mimeType} is not Supported`);
                  //  errorMsgElement.innerHTML = `${options.mimeType} is not Supported`;
                
                    options = {mimeType: 'video/webm'};
                
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        console.error(`${options.mimeType} is not Supported`);
                      //  errorMsgElement.innerHTML = `${options.mimeType} is not Supported`;
                        options = {mimeType: ''};
                
              }

            }

          }

        //---------------assign the suitable media support and then try
          try {
                mediaRecorder = new MediaRecorder(localStream, options);
          } catch (e) {
                console.error('Exception while creating MediaRecorder:', e);
               // errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
                return;
          }
        
        
            console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
          //  recordButton.textContent = 'Stop Recording';
          //  downloadButton.disabled = true;
            mediaRecorder.onstop = (event) => {
                console.log('Recorder stopped: ', event);
          };

          mediaRecorder.ondataavailable = handleDataAvailable;
          mediaRecorder.start(10); // collect 10ms of data
          console.log('MediaRecorder started', mediaRecorder);
        }


        
function stopRecording() {
mediaRecorder.stop();
console.log('Recorded Blobs: ', recordedBlobs);
}


function downloadRecordings(){
    const blob = new Blob(recordedBlobs, {type: 'video/webm'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}


function handleSourceOpen(event) {
  console.log('MediaSource opened');
  sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
  console.log('Source buffer: ', sourceBuffer);
}


function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}



