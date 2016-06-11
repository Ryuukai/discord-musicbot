var Discord = require('discord.io');
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var youtubedl = require('youtube-dl');
var bot = new Discord.Client({
    autorun: true,
    token: ""
});
/* MUSICBOT OBJECTS */
var voice_channel = {};
var ffmpegs = {};
var songQ = {};

var startup;

var commandchar = "!"; //Change to your preferred character/string

bot.on('ready', function() {
    console.log("Logged in as: "+bot.username + " - (" + bot.id + ")");
    startup = new Date();
});

bot.on('message', function(user, userID, channelID, message, rawEvent) {
  var serverID = bot.serverFromChannel(channelID);
  console.log(user+" ("+userID+"): "+message);
  if(message.substring(0, commandchar.length) === commandchar){
		var command = message.substring(commandchar.length).split(' ');
    switch(command[0].toLowerCase()){
      case "ping":
        var ping = new Date();
        bot.sendMessage({to: channelID, message: "Pong!"}, function(err, res){
          if(res){
            var pong = new Date() - ping;
            bot.editMessage({channel: res.channel_id, messageID: res.id, message: "Pong! `"+pong+"ms`"});
          }
        });
        break;
      case "status":
        var servers = Object.keys(bot.servers).length;
        var voice = Object.keys(voice_channel).length || 0;
        if(servers == 1){
          var first = "server";
        }else{
          var first = "servers";
        }
        if(voice == 1){
          var second = "voice channel";
        }else{
          var second = "voice channels";
        }
        var now = new Date();
        var uptime = getTimeInBetween(now, startup);
        console.log(uptime);
        bot.sendMessage({to: channelID, message: "I am connected to:\n**"+servers+"** "+first+"\n**"+voice+"** "+second+"\n\nI have been online for **"+uptime.days+" day(s) "+uptime.hours+" hour(s) "+uptime.minutes+" minute(s) "+uptime.seconds+" second(s)**"});
        break;
      /* ENABLE IF YOU WANT
      case "invite":
        bot.sendMessage({to: channelID, message: "Use this link to invite me to your server "+bot.inviteURL+""});
        break;
      */
      case "help":
        var help = "```\nBot commands:";
        help += "\n"+commandchar+"ping - pong! (Also tells the ping in ms)";
        help += "\n"+commandchar+"status - Tells you what's the bot's current status";
        /* help += "\n"+commandchar+"invite - Gives an invite link you can use to invite the bot to your own channel";*/
        help += "\n"+commandchar+"summon - Makes the bot join the voice channel";
        help += "\n"+commandchar+"dc - Disconnects the bot from the voice channel";
        help += "\n"+commandchar+"play [URL / Search term] - Plays a song or adds it to the queue";
        help += "\n"+commandchar+"stop - Stops playing and clears the queue";
        help += "\n"+commandchar+"skip - Skips the current song and moves on to the next in queue";
        help += "\n"+commandchar+"queue - Shows what's in the queue";
        help += "\n"+commandchar+"clearqueue - Clears the queue, but keeps the current song playing";
        help += "\n"+commandchar+"remove [song id] - Removes that specific song from queue";
        help += "\n"+commandchar+"song - Shows what song is currently playing";
        help += "\nPlease note that the music bot downloads the songs before playing. Be patient.\n```";
        help += "\nhttps://github.com/tonkku107/discord-musicbot";
        bot.sendMessage({to: channelID, message: help});
        break;
      /* MUSIC COMMANDS */
      case "summon":
        if (channelID in bot.directMessages) {
          bot.sendMessage({to: channelID, message: "There's no voice channel in DMs"});
        }else{
          voice_channel_id = bot.servers[serverID].members[userID].voice_channel_id;
          if(voice_channel_id){
            bot.joinVoiceChannel(voice_channel_id, function(){
              voice_channel[serverID] = voice_channel_id;
            });
          }else{
            bot.sendMessage({to: channelID, message: "You are not in a voice channel"});
          }
        }
        break;
      case "dc":
        if(voice_channel[serverID]){
          bot.leaveVoiceChannel(bot.servers[serverID].members[bot.id].voice_channel_id, function(){
            voice_channel[serverID] = null;
            stopSong(serverID, channelID, true);
            bot.sendMessage({to: channelID, message: "Disconnected from voice channel"});
          });
        }else{
          bot.sendMessage({to: channelID, message: "I am not in a voice channel"});
        }
        break;
      case "play":
        var args = deSplit(command)[1];
        if(args){
          if(voice_channel[serverID]){
            url = resolveURL(args);
            downloadSong(url, channelID, {user: user, userID: userID}, function(file, info){
              if(!songQ[serverID]){
                bot.getAudioContext({channel: voice_channel[serverID], stereo: true}, function(stream){
                  ffmpegs[serverID] = playSong(file, serverID, channelID, stream);
                  bot.sendMessage({to: channelID, message: "Now Playing: **"+info.title+"**"});
                  songQ[serverID] = {};
                  songQ[serverID].q = [];
                  songQ[serverID].now = info;
                });
              }else{
                songQ[serverID].q.push(info);
                bot.sendMessage({to: channelID, message: "`"+info.title+"` Added to queue! Position: "+songQ[serverID].q.length});
              }
            });
          }
        }else{
          bot.sendMessage({to: channelID, message: "You didn't specify any song"});
        }
        break;
      case "stop":
        if(voice_channel[serverID]){
          if (voice_channel[serverID]) stopSong(serverID, channelID, true);
        }
        break;
      case "skip":
        if(voice_channel[serverID]){
          if (voice_channel[serverID]) stopSong(serverID, channelID, false);
        }
        break;
      case "queue":
      case "playlist":
        if(voice_channel[serverID] && (songQ[serverID].q.length != 0 || songQ[serverID].now != null)){
          if(songQ[serverID].q.length != 0 && songQ[serverID] != null){
            var songcount = songQ[serverID].q.length;
            var origcount = songQ[serverID].q.length;
            if(songcount > 10)
              songcount = 10;
            var remaining = origcount - songcount;
            var queuestring = "Now Playing: **"+songQ[serverID].now.title+"**\n\nThere are "+origcount+" song(s) in queue:";
            for (i=1; i < songcount+1; i++){
              queuestring += "\n`"+i+".` "+songQ[serverID].q[i-1].title+" - queued by "+songQ[serverID].q[i-1].user.user;
            }
            if(remaining > 0)
              queuestring += "\n+"+remaining+" more";
            bot.sendMessage({to: channelID, message: queuestring});
          }else if(songQ[serverID].now != null){
            bot.sendMessage({to: channelID, message: "Now Playing: **"+songQ[serverID].now.title+"**\nNothing else in queue."});
          }
        }else{
          bot.sendMessage({to: channelID, message: "There's nothing in the queue."});
        }
        break;
      case "clearqueue":
        if(songQ[serverID] && songQ[serverID].q.length != 0){
          clearQueue(serverID, channelID, true);
        }
        break;
      case "remove":
        command[1] = parseInt(command[1]);
        if(Number.isInteger(command[1])){
          if(songQ[serverID] && songQ[serverID].q[command[1]-1]){
            var removed = songQ[serverID].q[command[1]-1];
            fs.unlink(removed.filepath);
            songQ[serverID].q.splice(command[1]-1, 1);
            bot.sendMessage({to: channelID, message: "Removed `"+removed.title+"` from the queue"});
          }else{
            bot.sendMessage({to: channelID, message: "A song with that index was not found"});
          }
        }else{
          bot.sendMessage({to: channelID, message: "Invalid argument or none given. Expecting index number"});
        }
        break;
      case "song":
        if(songQ[serverID] && songQ[serverID].now){
          bot.sendMessage({to: channelID, message: "Now Playing: **"+songQ[serverID].now.title+"**"});
        }else{
          bot.sendMessage({to: channelID, message: "Nothing is playing"});
        }
        break;
    }
  }
});

/* COMMAND FUNCTIONS */
var deSplit = function(cmd){
	if (typeof cmd[2] != 'undefined'){
			for(var i = 2; i < cmd.length; i++){
				cmd[1] = cmd[1] + ' ' + cmd[i];
			}
		}
	return cmd;
}

function generateUUID() {
    var d = new Date().getTime();

    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};

function getTimeInBetween(now, starttime){
  var t = Date.parse(now) - Date.parse(starttime);
  var seconds = Math.floor( (t/1000) % 60 );
  var minutes = Math.floor( (t/1000/60) % 60 );
  var hours = Math.floor( (t/(1000*60*60)) % 24 );
  var days = Math.floor( t/(1000*60*60*24) );
  return {
    'total': t,
    'days': days,
    'hours': hours,
    'minutes': minutes,
    'seconds': seconds
  };
}

/* MUSIC FUNCTIONS */
var playSong = function(file, serverID, channelID, stream){
  var ffmpeg = spawn('ffmpeg' , [
    '-i', file,
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1'
  ], {stdio: ['pipe', 'pipe', 'ignore']});

  ffmpeg.stdout.once('readable', function() {
    stream.send(ffmpeg.stdout);
    console.log("Playback started");
  });

  ffmpeg.stdout.once('end', function(){
    console.log("Playback ended");
    songQ[serverID].now = null;
    fs.unlink(file);
    processQueue(serverID, channelID);
  });

  return ffmpeg;
}

var stopSong = function(serverID, channelID, clearQ){
  var ffmpeg = ffmpegs[serverID];
  if(clearQ){
    clearQueue(serverID, channelID, false);
      bot.sendMessage({to: channelID, message: "Queue cleared and song stopped!"});
  }
  if(ffmpeg){
    ffmpeg.kill();
    if (!clearQ) bot.sendMessage({to: channelID, message: "Song skipped!"});
  }
}

var clearQueue = function(serverID, channelID, announce){
  if (songQ[serverID]){
    songQ[serverID].q.forEach(function(v){
      fs.unlink(v.filepath);
    });
    songQ[serverID].q = [];
    if(announce) bot.sendMessage({to: channelID, message: "Queue cleared!"});
  }
}

var resolveURL = function(args){
  var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
  if(regexp.test(args)){
    return args;
  }else{
    return "ytsearch:"+args;
  }
}

var downloadSong = function(url, channelID, user, callback, directFile){
  var filename = generateUUID() + ".mp3";
  var songpath = path.join(__dirname + '/songs/', filename);
  var downloaded = 0;
  if(directFile){
    var video = youtubedl(url, [], {cwd: __dirname});
  }else{
    var video = youtubedl(url, ['-f', 'bestaudio'], {cwd: __dirname});
  }
  var songInfo;
  bot.simulateTyping(channelID);
  video.on('info', function(info){
    console.log('Download started');
    console.log('filename: ' + info._filename);
    console.log('size: ' + info.size);
    bot.sendMessage({to: channelID, message: "Downloading `"+info.title+"`... "});
    var simulateDownload = function(firstTime){
      var typingTime = 2000;
      if(firstTime) typingTime = 5;
      bot.simulateTyping(channelID, function(err, res){
        var timeout = setTimeout(function(){
          if(!downloaded){
            simulateDownload();
          }
        }, typingTime);
      });
    }
    simulateDownload(true);
    songInfo = info;
  });

  video.on('error', function(err){
    console.log(err);
    fs.unlink(songpath);
    var spot = err.toString().indexOf("ERROR: ");
    console.log("ERRRORTESTLOOKATME " + err.toString().substring(spot));
    if(err.toString().substring(spot).includes("ERROR: requested format not available")){
      downloadSong(url, channelID, user, callback, true);
    }else{
      bot.sendMessage({to: channelID, message: "```"+err.toString().substring(spot)+"```"});
    }
  });
  video.pipe(fs.createWriteStream(songpath));
  video.on('end', function(){
    console.log("Download Complete!");
    songInfo.filepath = songpath;
    songInfo.user = user;
    downloaded = 1;
    callback(songpath, songInfo);
  });
}

var processQueue = function(serverID, channelID){
  if(songQ[serverID].q.length != 0){
    var next = songQ[serverID].q[0];
    songQ[serverID].q.splice(0, 1);
    songQ[serverID].now = next;
    var file = next.filepath;
    bot.getAudioContext({channel: voice_channel[serverID], stereo: true}, function(stream){
      ffmpegs[serverID] = playSong(file, serverID, channelID, stream);
      bot.sendMessage({to: channelID, message: "Now Playing: **"+next.title+"**"});
    });
  }else{
    songQ[serverID] = null;
  }
}

/* EXIT HANDLING */
process.stdin.resume();

function disconnect(err){
  if (err){
    console.log(err);
    console.log(err.stack);
  }
  bot.disconnect();
  process.exit();
}
process.on('exit', disconnect);
process.on('SIGINT', disconnect);
process.on('uncaughtException', disconnect);
