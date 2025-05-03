let myVideo = document.getElementById('my-video');
let friendVideo = document.getElementById('friend-video');
let myIdInput = document.getElementById('my-id');
let friendIdInput = document.getElementById('friend-id');
let callBtn = document.getElementById('call-btn');
let endBtn = document.getElementById('end-btn');
let muteBtn = document.getElementById('mute-btn');
let videoBtn = document.getElementById('video-btn');
let screenBtn = document.getElementById('screen-btn');
let copyBtn = document.getElementById('copy-btn');
let statusDiv = document.getElementById('status');
let modeBtn = document.getElementById('mode-btn');
let timerSpan = document.getElementById('timer');
let chatForm = document.getElementById('chat-form');
let chatInput = document.getElementById('chat-input');
let chatBox = document.getElementById('chat-box');

let localStream;
let currentCall;
let isMuted = false;
let isVideoOn = true;
let isScreenSharing = false;
let timer = 0;
let timerInterval;
let conn;

const peer = new Peer();

peer.on('open', id => {
  myIdInput.value = id;
  showStatus('Share your ID with a friend!');
});

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
  localStream = stream;
  myVideo.srcObject = stream;
});

callBtn.onclick = () => {
  let friendId = friendIdInput.value;
  if (!friendId) return;
  currentCall = peer.call(friendId, localStream);
  conn = peer.connect(friendId);
  setupCall();
  setupConn();
  showStatus('Calling...');
};

peer.on('call', call => {
  call.answer(localStream);
  currentCall = call;
  showStatus('Incoming call...');
  setupCall();
});

function setupCall() {
  currentCall.on('stream', remoteStream => {
    friendVideo.srcObject = remoteStream;
    showStatus('Connected!');
    startTimer();
  });
  currentCall.on('close', () => {
    friendVideo.srcObject = null;
    showStatus('Call ended.');
    stopTimer();
  });
}

endBtn.onclick = () => {
  if (currentCall) currentCall.close();
  if (conn) conn.close();
  friendVideo.srcObject = null;
  stopTimer();
  showStatus('Call ended.');
};

muteBtn.onclick = () => {
  isMuted = !isMuted;
  if (localStream) localStream.getAudioTracks()[0].enabled = !isMuted;
  muteBtn.textContent = isMuted ? '🔇' : '🎤';
};

videoBtn.onclick = () => {
  isVideoOn = !isVideoOn;
  if (localStream) localStream.getVideoTracks()[0].enabled = isVideoOn;
  videoBtn.textContent = isVideoOn ? '📹' : '🙈';
};

screenBtn.onclick = async () => {
  if (!isScreenSharing) {
    try {
      let screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      let videoTrack = screenStream.getVideoTracks()[0];
      if (currentCall) {
        let sender = currentCall.peerConnection.getSenders().find(s => s.track.kind === 'video');
        sender.replaceTrack(videoTrack);
      }
      myVideo.srcObject = screenStream;
      videoTrack.onended = () => {
        if (currentCall) {
          let sender = currentCall.peerConnection.getSenders().find(s => s.track.kind === 'video');
          sender.replaceTrack(localStream.getVideoTracks()[0]);
        }
        myVideo.srcObject = localStream;
        isScreenSharing = false;
        screenBtn.textContent = '🖥️';
      };
      isScreenSharing = true;
      screenBtn.textContent = '🎦';
    } catch (e) {
      showStatus('Screen share cancelled.');
    }
  }
};

copyBtn.onclick = () => {
  myIdInput.select();
  document.execCommand('copy');
  showStatus('ID copied!');
};

function showStatus(msg) {
  statusDiv.textContent = msg;
  statusDiv.style.color = '#00e0d3';
  setTimeout(() => { statusDiv.textContent = ''; }, 3500);
}

modeBtn.onclick = () => {
  document.body.classList.toggle('light');
  modeBtn.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
};

function startTimer() {
  timer = 0;
  timerSpan.textContent = '00:00';
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer++;
    let min = Math.floor(timer / 60).toString().padStart(2, '0');
    let sec = (timer % 60).toString().padStart(2, '0');
    timerSpan.textContent = `${min}:${sec}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerSpan.textContent = '00:00';
}

peer.on('connection', c => {
  conn = c;
  setupConn();
});

function setupConn() {
  if (!conn) return;
  conn.on('data', data => {
    addChat('them', data);
  });
}

chatForm.onsubmit = e => {
  e.preventDefault();
  let msg = chatInput.value.trim();
  if (!msg || !conn) return;
  conn.send(msg);
  addChat('me', msg);
  chatInput.value = '';
};

function addChat(who, msg) {
  let div = document.createElement('div');
  div.className = who;
  div.textContent = (who === 'me' ? 'Me: ' : 'Friend: ') + msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
