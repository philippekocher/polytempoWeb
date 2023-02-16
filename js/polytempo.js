const serverPort = 47521;
const documentDirectory = "files/";
let root = "", scoreFile;

let keycode = 0;
let networkMode = false;

const client = {name: "Untitled", id: ''};

function $(x) { return document.querySelector(x) }
function $$(x) { return document.querySelectorAll(x) }

document.addEventListener("DOMContentLoaded", (event) => {
	let vars = {};
	window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
	vars[key] = value;
	});

	if(location.port == serverPort) {
		let script = document.createElement('script');
		script.type="application/javascript";
		script. src="socket.io/socket.io.js";
		script.addEventListener("load", () => { 
			script = document.createElement('script');
			script.type="application/javascript";
			script. src="js/polytempoSync.js";
			script.addEventListener("load", () => {
				networkMode = true;
				$("#network").style.display = 'block';
			});
			document.body.appendChild(script);
		});
		document.body.appendChild(script);
	}

	visualMetronomeCanvas  = document.createElement('canvas');
	visualMetronomeCanvas.setAttribute('id','visualMetronomeCanvas');
	document.body.append(visualMetronomeCanvas);
	visualMetronomeContext = visualMetronomeCanvas.getContext('2d', { alpha: true });

	regionCanvas  = document.createElement('canvas');
	regionCanvas.setAttribute('id','regionCanvas');
	document.body.append(regionCanvas);
	
  regionContext = regionCanvas.getContext('2d', { alpha: false });
	regionContext.imageSmoothingEnabled = false;

	window.onresize = resizeContent;

	// load score
	loadPtScore(vars['score']);

	// audio
	initAudio();

	// menubar
	$(".mask").addEventListener("click", resetMenu);
	$(".menubar").addEventListener("click", resetMenu);
	$("#filelist").addEventListener("click", e => { showFileList(e) });
	$("#settings").addEventListener("click", e => { showSettings(e) });
	initSettings();
	
	// buttons
	$("#start").addEventListener("click", () => { handleUserInput("startStop"); $('#start').blur() });
	$("#rtl").addEventListener("click", () => { handleUserInput("rtl"); $('#rtl').blur() });
	$("#rtb").addEventListener("click", () => { handleUserInput("rtb"); $('#rtb').blur() });

	//input
	$("#timebox").addEventListener("click", (e) => { $("#timebox").setSelectionRange(0, $("#timebox").value.length) });
	$("#timebox").addEventListener("change", (e) => { handleUserInput("timeboxChange", $("#timebox").value); $("#timebox").blur() });
	$("#markerbox").addEventListener("click", (e) => { $("#markerbox").setSelectionRange(0, $("#markerbox").value.length) });
	$("#markerbox").addEventListener("change", (e) => { handleUserInput("markerboxChange",$("#markerbox").value);  $("#markerbox").blur() });
	$("#tempofactorbox").addEventListener("click", (e) => { $("#tempofactorbox").setSelectionRange(0, $("#tempofactorbox").value.length) });
	$("#tempofactorbox").addEventListener("change", (e) => { handleUserInput("tempofactorboxChange", $("#tempofactorbox").value); $("#tempofactorbox").blur() });

	// keyboard
	window.addEventListener("keydown", (e) => {
		if(keycode == 0 && document.activeElement == document.body)
		{
			keycode = e.which;
			if     (keycode == 32) handleUserInput("startStop"); // space bar
			else if(keycode == 13) handleUserInput("rtl"); // enter
			else if(keycode == 96 || keycode == 48) handleUserInput("rtb"); // 0 on keyboard and numpad
			else if(keycode == 27) resetMenu(); // esc
		}
	});
	window.addEventListener("keyup", (e) => {
		keycode = 0;
	});
});

function resizeContent() {
	let w = window.innerWidth - $(".auxiliary").offsetWidth;
	let h = window.innerHeight;

	if(w < h) visualMetroLength = w;
	else	    visualMetroLength = h;

 	visualMetronomeCanvas.setAttribute("width", visualMetroLength);
 	visualMetronomeCanvas.setAttribute("height", visualMetroLength);
 	
 	let inset = visualMetronomeCanvas.style.display == "none" ? 0 : parseInt(settings.data.visualMetroSize);
 	
	regionCanvas.style.left = inset+'px';
	regionCanvas.style.top = (inset + 31)+'px';
	regionCanvas.style.width = (w - inset)+'px';
	regionCanvas.style.height = (h - inset - 31)+'px';
	// force the browser to a higher resolution by using an over-sized canvas
	regionCanvas.width = (w - inset) * 2;
	regionCanvas.height = (h - inset - 31) * 2;

	visualMetronomeContext.fillRect(0, 0, inset, inset);

	for(const key in regionEvents) {
		let event = regionEvents[key];
		if(event.type == "image") image(event);
		else text(event);
	};
}

/* ----------------------------------------------------------------------
	menubar
	------------------------------------------------------------------------*/

function resetMenu() {
	$(".filelist").style.display = "none";
	$(".settings").style.display = "none";
	$(".mask").style.height = "";
}

function showFileList(event) {
	resetMenu();
	event.stopPropagation();
	$(".filelist .group").innerHTML = 'no data...<br><br>';
	fetch(documentDirectory+'fileList.json')
	.then(response => {
		return response.json();
	}).then(json => {
		let html = '';
		json.forEach(item => { html += '<p><a href="?score='+item+'">'+item+'</a></p>' });
		$(".filelist .group").innerHTML = html;
	}).catch(err => { console.log("Error loading fileList.json file")	});
	$(".filelist").style.display = "block";
	$(".mask").style.height = "100%";
}

function showSettings() {
	resetMenu();
	event.stopPropagation();
	$(".settings").style.display = "block";
	$(".mask").style.height = "100%";
}

function initSettings() {
	settings.load()
	$$(".settings input").forEach(i => { settingsCheckboxCallback(i, true) });
	$$(".settings input").forEach(i => i.addEventListener("input", (e) => { settingsCheckboxCallback(i, false) }));
}

function settingsCheckboxCallback(input, readCookie) {
	let id = input.id, val = input.type == 'checkbox' ? input.checked : input.value;
	
	if(readCookie && settings.data[id] != undefined) {
		val = settings.data[id];
		input.type == 'checkbox' ? input.checked = val : input.value = val;
	} else {
		settings.data[id] = val;
		settings.save();
	}
	
	switch(id) {
		case "showVisualMetro":
			visualMetronomeCanvas.style.display = val ? "block" : "none";
			resizeContent();
			break;
		case "visualMetroSize":
			resizeContent();
			break;
		case "showAuxView":
			$(".auxiliary").style.display = val ? "flex" : "none";
			resizeContent();
			break;
	}	
}

const settings = {
    data: {},
    load: function () {
        let cookieArray  = document.cookie.split(';');
        //console.log(unescape(document.cookie));
        for(const cookie of cookieArray) {
        	let pair = cookie.split("=");
        	if(pair[0] == "settings") {
        		this.data = JSON.parse(unescape(pair[1]));
        	}
        }
    },
    save: function () {
		const d = new Date();
  		d.setTime(d.getTime() + (365*24*60*60*1000)); // cookie expires in one year
       	document.cookie = "settings="+escape(JSON.stringify(this.data))+";expires="+d.toUTCString();
    }
}

/* ----------------------------------------------------------------------
	transport
	------------------------------------------------------------------------*/

let isRunning = false;
let startTime = 0;
let locator;
let timeSetTime = 0;
let currentMarker = '';
let currentScoreTime= 0;
let createEvent = (type, value) => ({type: type, value: value, timeTag: getTime()});

function handleUserInput(type, value) {
	let scoreTime;

	if(type == "timeboxChange") {
		stop();
		let time = parseTime(value)
		if(time != NaN) {
			locator = time;
			networkMode ? scoreTime = time : setTime(time);
		} else {
			$("#timebox").value = formatTime(currentScoreTime);
		}
	}

	else if(type == "markerboxChange") {
		stop();
		let markerTime = getTimeForMarker(value);
		if(markerTime != undefined) {
			currentMarker = value;
			locator = markerTime;
			networkMode ? scoreTime = markerTime : setTime(markerTime);
		} else {
			$("#markerbox").value = currentMarker;
		}
	}

	else if	(type == "rtl") {
		stop();
		networkMode ? scoreTime = locator : setTime(locator);
	}

	else if(type == "rtb") {
		stop();
		let rtbTime = getFirstEventTime();
		locator = rtbTime;
		networkMode ? scoreTime = rtbTime : setTime(rtbTime);
	}

	else if(type == "startStop") {
		if(isRunning) {
			if(networkMode) {
				scoreTime = lastDownbeatTime;
				sendEvent(createEvent('stop'));
			} else {
				stop();
			}
		} else {
			networkMode ? sendEvent(createEvent("start")) : start();
		}
	}

	else if(type == "tempofactorboxChange") {
		let newFactor = parseFloat(value);
		if(!isNaN(newFactor) && newFactor > 0.0)
		{
			networkMode ? sendEvent(createEvent("tempoFactor", newFactor)) : tempoFactor = newFactor;
		}
		else $("#tempofactorbox").value = tempoFactor;
	}

	if(networkMode && typeof scoreTime !== 'undefined') {
		sendEvent(createEvent("gotoTime", scoreTime * 0.001));
	}
}

function start() {
	startTime = Date.now() - timeSetTime;
	isRunning = true;
	run();
}

function returnToBeginning () {
	locator = getFirstEventTime();
	setTime(locator);
}

function stop() {
	isRunning = false;
	if(!networkMode) setTime(lastDownbeatTime);
}

function getFirstEventTime() {
	return ptScoreDefault[0] ? ptScoreDefault[0].time : 0;
}

function setTime(time) {
	if(networkMode) stop();
	timeSetTime = time;
	jumpToTime(time);
}

function getTimeForMarker(value) {
	let time;
	ptScoreDefault.forEach((event) => {
		if(event.type == "marker" && event.value == value) {
			time = event.time;
		}
	});
	return time;
}

function jumpToTime(time) {
	$("#timebox").value = formatTime(time);
	currentScoreTime = time;
	lastDownbeatTime = time;

	let eventsBeforeStart = [];
	let regionsBeforeStart = {};
	let nextDownBeat;
	let lastMarker;

	//find next downbeat or next cue
	for(let i=0; i<ptScoreDefault.length; i++) {
		let event = ptScoreDefault[i];
		if(event.time >= time && event.type === "beat" && (event.pattern < 20 || event.cue))
		{
			nextDownBeat = event;

			//find the first event with the same time as the next downbeat
			let j=i;
			while (j > 0 && ptScoreDefault[--j].time === event.time) i=j;
			eventIndex = i;

			break;
		}
	}

	//collect all events to be executed before start.
	for(let i=0; i<ptScoreDefault.length; i++) {
		let event = ptScoreDefault[i];
		if(nextDownBeat && event.time > nextDownBeat.time) break;

		if(event.type === "image" || event.type === "text") regionsBeforeStart[event.regionID] = event;
		else if(event.type === "marker") lastMarker = event;
		else if(event.type === "beat") continue;
		else eventsBeforeStart.push(event);
	}

	//execute all collected events
	if(lastMarker) eventsBeforeStart.push(lastMarker);
	for(const key in regionsBeforeStart) {
		eventsBeforeStart.push(regionsBeforeStart[key])
	}	
	eventsBeforeStart.forEach((event) => { executeEvent (event); });
}

/* ----------------------------------------------------------------------
	animation
	------------------------------------------------------------------------*/

let currentBeatEvent;
let isAnimatingMetro = false;
let	visualMetronomeCanvas, visualMetronomeContext;
let	regionCanvas, regionContext;
let visualMetroLength;
let lastDownbeatTime;
let tempoFactor = 1.0;

function run() {
	let time = (Date.now() - startTime) * tempoFactor;
	let event = ptScoreDefault[eventIndex];

	while(isRunning && event && time >= event.time) {	
		if(event.type === "beat") {
			if(event.pattern < 20) lastDownbeatTime = event.time; // store last downbeat
			event.durationFactor = tempoFactor;
		}			
		event.timeTag = getTime();
		executeEvent(event);
		event = ptScoreDefault[++eventIndex];
	}

	if(currentBeatEvent) animate();

	// update time box
 	if(isRunning) {
		$("#timebox").value = formatTime(time);
		currentScoreTime = time;
 	}

 	if(isRunning || currentBeatEvent) requestNextFrame(run);
}

let requestNextFrame = function(callback) {
	return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
	function(callback) {
	  window.setTimeout(callback, 1000 / 60); // 60 frames per second
	};
}();

function animate() {
	let time = getTime();
	let pos, rectpos, pattern = currentBeatEvent.pattern;
	let x=0,y=0,w=h=settings.data.visualMetroSize;

	if(time > currentBeatEvent.timeTag + (currentBeatEvent.duration * 1000 / currentBeatEvent.durationFactor)) {
		isAnimatingMetro = false;
	}	else {
		isAnimatingMetro = true;
		pos = (time  - currentBeatEvent.timeTag) / (currentBeatEvent.duration * 1000 / currentBeatEvent.durationFactor);
		
		if(pos > 1.0 || pos < 0.0) pos = 0.5;
    if (pattern < 3 || pattern == 10 || pattern == 20) pos *= 0.5;
    if (pattern < 3) pos += 0.5;
    rectpos = 50 + Math.pow(Math.abs((pos * 2 - 1)), 2) * (visualMetroLength-50);

		if(pattern == 11 || pattern == 1 ||
			(pattern == 10 && pos <= 0.5) ||
			(pattern == 12 && pos <= 0.5) ||
			(pattern == 21 && pos >= 0.5))
		{
			h = rectpos;
		}
		else if(pattern == 22 || pattern == 2 ||
					 (pattern == 20 && pos <= 0.5) ||
					 (pattern == 21 && pos <= 0.5) ||
					 (pattern == 12 && pos >= 0.5))
		{
			w = rectpos;
		}
	}

	// drawRectangle
	visualMetronomeContext.clearRect(0, 0, visualMetronomeCanvas.clientWidth, visualMetronomeCanvas.clientHeight);
	if(!currentBeatEvent.cue || pos > 0.5 && (pattern == 11 || pattern == 21))
		visualMetronomeContext.fillStyle = 'black';
	else
		visualMetronomeContext.fillStyle = 'red';

	visualMetronomeContext.fillRect(0, 0, w, h);

	if(!isAnimatingMetro) currentBeatEvent = undefined;
}

/* ----------------------------------------------------------------------
	audio
	------------------------------------------------------------------------*/

let osc, gainNode, audioContext;

function initAudio() {
 	try	{
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
 		unlockAudioContext();

		gainNode = audioContext.createGain();
		gainNode.connect(audioContext.destination);
		gainNode.gain.value = 0;

		osc = audioContext.createOscillator();
		osc.connect(gainNode);
		osc.start();
	}	catch(e) {
		alert('Web Audio API is not supported in this browser');
	}
}

function unlockAudioContext() {
  const events = ['touchstart','touchend', 'mousedown','keydown'];
  events.forEach(e => window.addEventListener(e, unlock, false));
  function unlock() { 
  	if(audioContext.state === 'suspended') {
  		doUnlock();
  		clean();
		}
	}
  function clean() { 
  	events.forEach(e => window.removeEventListener(e, unlock));
  }
}

function audioClick(event) {
	const freq = event.cue ? 1480 : event.pattern < 20 ? 2637 : 1976;
	osc.frequency.value = freq;
	gainNode.gain.value = 0;
 	gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.001);
 	gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);	
}

function doUnlock() {
    // Unlock WebAudio: create and play a short silent buffer
    const silentBuffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = silentBuffer;
    source.connect(audioContext.destination);
    source.start();

    // Unlock HTML5 Audio: load a data URL of short silence and play it
    // (This will allow to play audio when the mute toggle is on)
    const silenceDataURL = "data:audio/mp3;base64,//MkxAAHiAICWABElBeKPL/RANb2w+yiT1g/gTok//lP/W/l3h8QO/OCdCqCW2Cw//MkxAQHkAIWUAhEmAQXWUOFW2dxPu//9mr60ElY5sseQ+xxesmHKtZr7bsqqX2L//MkxAgFwAYiQAhEAC2hq22d3///9FTV6tA36JdgBJoOGgc+7qvqej5Zu7/7uI9l//MkxBQHAAYi8AhEAO193vt9KGOq+6qcT7hhfN5FTInmwk8RkqKImTM55pRQHQSq//MkxBsGkgoIAABHhTACIJLf99nVI///yuW1uBqWfEu7CgNPWGpUadBmZ////4sL//MkxCMHMAH9iABEmAsKioqKigsLCwtVTEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVV//MkxCkECAUYCAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
    const element = document.createElement("audio");
    element.controls = false;
    element.preload = "auto";
    element.loop = false;
    element.src = silenceDataURL;
    element.play();
}

/* ----------------------------------------------------------------------
	events
	------------------------------------------------------------------------*/

function executeEvent(event) {
	if((event.timeTag - getTime()) > 10) {
		window.setTimeout(function() { executeEvent(event) }, event.timeTag - getTime());
	} else {
		if(event.type == "beat") {
			if(settings.data.activateAudio) audioClick(event);
			if(settings.data.showVisualMetro) {
				currentBeatEvent = event;
				if(!event.durationFactor) event.durationFactor = 1;
				if(!isRunning) run(); // needs animation
			}
		}
		
		else if(event.type == "marker") {
			let len = event.value.toString().length;
			$("#markerbox").value = event.value;
			$("#markerbox").style.fontSize = len > 3 ? (7 / Math.pow(len,0.9))+'em' : '2.8em';
			currentMarker = event.value;
		}
		
		else if(event.type == "image") {image(event); regionEvents[event.regionID] = event;}
		
		else if(event.type == "text") {text(event); regionEvents[event.regionID] = event;}
		
		else if(event.type == "tempoFactor") {
			tempoFactor = event.value; $("#tempofactorbox").value = Math.round(event.value*10000)/10000;
		}
		
		else if(event.type == "loadImage") loadImage(event);
		
		else if(event.type == "addRegion") regions[event.regionID] = event;
		
		else if(event.type == "addSection") addSection(event);
		
		else if(event.type == "settings") client.score = event.name

		else if(event.type == "start") start();
		
		else if(event.type == "stop") stop();
		
		else if(event.type == "gotoTime") setTime(event.value * 1000);
	}
}

/* ----------------------------------------------------------------------
	images
	------------------------------------------------------------------------*/

const images = {};
const sections = {};
const regions = {};

function addSection(event) {
	const img = images[event.imageID];
	const section = event.rect;
	
	if(!img) return;

	if(!img.complete) {
		// retry in 500 ms
		window.setTimeout(function() { addSection(event); }, 500);
	} else {
		section[0] = section[0]*img.width;
		section[1] = section[1]*img.height;
		section[2] = section[2]*img.width;
		section[3] = section[3]*img.height;

		event.rect = section;

		sections[event.sectionID] = event;		
	}
}

function loadImage(event) {
	const img = new Image();
	img.src = documentDirectory+root+event.url;
	images[event.imageID] = img;
}

function getRegion(regionID) {
	if(!regions[regionID]) return;
	const region = regions[regionID].rect;
	const dimensions = [];
	dimensions[0] = region[0] * regionCanvas.width;
	dimensions[1] = region[1] * regionCanvas.height;
	dimensions[2] = region[2] * regionCanvas.width;
	dimensions[3] = region[3] * regionCanvas.height;
	return dimensions;
}

function image(event) {
	const region = getRegion(event.regionID);
	if(region == null) return;

	// erase previous content
	regionContext.fillStyle = "white";
	regionContext.fillRect(region[0], region[1], region[2], region[3]);
	
	let image;
	let section = [0,0,1,1];

	const sectionEvent = sections[event.sectionID];
	if(sectionEvent) {
		image = images[sectionEvent.imageID];
		section = sectionEvent.rect;
	} else {
		image = images[event.imageID];
		if(event.rect) section = event.rect;
		if(image) {
			section[0] = section[0] * image.width;
			section[1] = section[1] * image.height;
			section[2] = section[2] * image.width;
			section[3] = section[3] * image.height;
		}
	};
	
	if(!image) return;
	
	const sectionRatio = section[2] / section[3];
	const regionRatio  = region[2] / region[3];
	let dx, dy;

	if(sectionRatio <= regionRatio)	{
			dy = region[3];
			dx = region[3] * sectionRatio;
	} else {
			dx = region[2];
			dy = region[2] / sectionRatio;
	}

	// draw new content
	regionContext.drawImage(image,
													section[0],
													section[1],
													section[2],
													section[3],
													region[0],
													region[1],
													dx,
													dy);
}

function text(event) {
	const region = getRegion(event.regionID);
	regionContext.fillStyle="white";
	regionContext.fillRect(region[0], region[1], region[2], region[3]);
	if(!event.value) return;

	regionContext.fillStyle = '#000000'
	regionContext.textBaseline = 'hanging';
	regionContext.font = (region[3]) + 'px serif';
	regionContext.fillText(event.value,region[0],region[1],region[2]);
}

/* ----------------------------------------------------------------------
	score
	------------------------------------------------------------------------*/

let ptScoreInit;
const ptScoreDefault = [];
let eventIndex;
const regionEvents = {};


function loadPtScore(url) {
	if(!url) return;

	scoreFile = url.slice(url.lastIndexOf('/')+1);
	root = url.slice(0, url.lastIndexOf('/')+1);

	fetch(documentDirectory+root+scoreFile)
		.then(response => {
			return response.json();
		}).then(json => {
    	// Handle data
			ptScoreInit = json.init;
			executePtScoreInit();

			for(const item of Object.values(json)[1]) {
				parsedEvent = parseEvent(item);
				if(parsedEvent)	ptScoreDefault.push(parsedEvent);
			}

			ptScoreDefault.sort((e1,e2) => {
				if(e1.time > e2.time) return 1;
				if(e1.time < e2.time) return -1;
				return 0;
			});

			waitForImages();
			resizeContent();
	}).catch(error => {
		// Handle error
		alert("Error loading score file: "+root+scoreFile+"\n"+error);
		window.location.assign('./');
	});
}

function parseEvent(item) {
	let event, eventType;

	eventType = Object.keys(item)[0];
	event = item[eventType];

	if(typeof(event) !== 'object') return null;

	event.type = eventType;
 	if(event.time)  event.time = event.time * 1000.0;
	if(event.defer) event.time += event.defer * 1000.0;
 	return event;
}

function executePtScoreInit() {
	ptScoreInit.forEach(function (item) {
	 	executeEvent(parseEvent(item));
	});
}

function waitForImages() {
	for(const key in images) {
		if(!images[key].complete)
		{
			// retry in 500 ms
			window.setTimeout(function() { waitForImages(); }, 500);
			return;
		}
	}

 	returnToBeginning();
}

/* ----------------------------------------------------------------------
	utilities
	------------------------------------------------------------------------*/

function getTime()
{
	if(!networkMode) return Date.now();
	else return Date.now() + timeDiffToMaster;
}

function parseTime(input)
{
	const tokens = input.split(':');
	let result;

	tokens.forEach((token) => {
		if(typeof token !== 'number')
			return false;
	});

	if(tokens.length === 2) result = Number(tokens[0])*60 + Number(tokens[1]);
	else if(tokens.length === 3) result = Number(tokens[0])*3600 + Number(tokens[1])*60 + Number(tokens[2]);
	else result = Number(input);
	result *= 1000;
	return result;
}

function formatTime(time) {
  const pad = (n, z = 2) => ('00' + n).slice(-z);
  const ms = Math.abs(parseInt(time));
  const sign = time < 0 ? '–' : '';
  return sign + pad(ms/3.6e6|0) + ':' + pad((ms%3.6e6)/6e4|0) + ':' + pad((ms%6e4)/1000|0) + '.' + pad(ms%1000,3);
}
