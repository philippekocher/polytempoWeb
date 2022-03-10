const socket = io.connect(window.location.host);

let timeSyncRequestIndex = 0;
let timeSyncRequestTimestamp = 0;
let lastRT = 0;
let maxRT = 0;
let lastMasterID = '';
let networkState = 0; // 0=no,1=pending,2=ok
let timeDiffToMaster = 0;
let timeDiffHistory = [];
let timeDiffHistoryWritePosition = -1;

socket.on("master", master => {
	networkState = master.id == '' || lastMasterID == '' ? 0 : master.id != lastMasterID ? 1 : 2;
								 
	updateNetworkGUI(master);
	
	if(master.id != lastMasterID) {
		lastRT = maxRT = 0;
		timeDiffToMaster = 0;
		timeDiffHistory = [];
		timeDiffHistoryWritePosition = -1;
	}
	
	socket.emit("timeSyncRequest", {
		"id": socket.id,
		"scoreName": client.score,
		"peerName": settings.data.instanceName,
		"index": ++timeSyncRequestIndex,
		"lastRT": lastRT
	});
	timeSyncRequestTimestamp = Date.now();
});

socket.on("timeSyncReply", data => { 
// 	console.log(data);
	if(data.Index == timeSyncRequestIndex) {
		lastMasterID = data.Id;
	 	maxRT = data.MaxRT;
	 	lastRT = Date.now() - timeSyncRequestTimestamp;
	 	let newTimeDiffToMaster = data.Timestamp - Date.now() - (lastRT * 0.5);
	 	
    timeDiffHistory[(++timeDiffHistoryWritePosition) % 11] = newTimeDiffToMaster;
    let tempBuffer = Array.from(timeDiffHistory);
    tempBuffer.sort();

		timeDiffToMaster = tempBuffer[Math.floor(tempBuffer.length * 0.5)];
	}
});

socket.on("event", event => {
	if(event.defer) event.timeTag += event.defer * 1000.0;
	executeEvent(event);
});

socket.on('disconnect', () => {  
	networkState = 0;
	updateNetworkGUI();
});

function updateNetworkGUI(master) {
	let html, networkInfo = '', masterInfo = '';
	if(networkState == 0)
		networkInfo = '<div class="networkstate" id="no">No master detected</div>';
	else if(networkState == 1)
		networkInfo = '<div class="networkstate" id="pending">Synchronising...</div>';
	else { 
		networkInfo = '<div class="networkstate" id="yes">Sync, MRT: '+maxRT+'ms</div>';
		masterInfo = '<br><p><b>Master:</b></p>';
		masterInfo += '<p>' + master.score + ' (' + master.name + ')</p>';
	}
		
	html = networkInfo;
	html += '<br><p><b>Local:</b><p>';
	html += '<p>' + client.score + ' ('+(settings.data.instanceName || '-')+')</p>';
	html += masterInfo;

	$('#network').innerHTML = html;
}

function sendEvent(event) {
	if(networkState == 2) {
		delete event.timeTag;
		socket.emit("event", event);	
	} else {
		executeEvent(event);
	}
}