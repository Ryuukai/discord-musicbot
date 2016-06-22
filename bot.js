var Discord = require('discord.io');
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var youtubedl = require('youtube-dl');
var config = require('./config');
if(!config.token) throw "YOU ARE MISSING THE TOKEN FROM YOUR CONFIG. PLEASE EDIT THE CONFIG FILE";
var bot = new Discord.Client({
    autorun: true,
    token: config.token
});
/* MUSICBOT OBJECTS */
var voice_channel = {};
var ffmpegs = {};
var songQ = {};
var summoners = {};
var votes = {};

var startup;

bot.on('ready', function() {
    console.log("Logged in as: "+bot.username + " - " + bot.id);
    startup = new Date();
    fs.mkdir('songs', 0777, function(err){
      if(err){
        if(err.code == "EEXIST") return;
        else throw err;
      }
    });
    if (config.showDefaultGame) bot.setPresence({game: config.defaultGame.game, type: config.defaultGame.type, url: config.defaultGame.url});
});

bot.on('message', function(user, userID, channelID, message, rawEvent) {
  var serverID = bot.serverFromChannel(channelID);
  try {
    var serverName = bot.servers[serverID].name;
    var channelName = bot.servers[serverID].channels[channelID].name;
  }catch(e){
    //console.log(e);
  }
  console.log("["+serverName+" / #"+channelName+"] "+user+": "+message);
  if(message.substring(0, config.cmdPrefix.length) === config.cmdPrefix){
		var command = message.substring(config.cmdPrefix.length).split(' ');
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
      case "invite":
        if (config.allowInvite) bot.sendMessage({to: channelID, message: "Use this link to invite me to your server "+bot.inviteURL+""});
        break;
      case "help":
        var help = "```\nBot commands:";
        help += "\n"+config.cmdPrefix+"ping - pong! (Also tells the ping in ms)";
        help += "\n"+config.cmdPrefix+"status - Tells you what's the bot's current status";
        if(config.allowInvite) help += "\n"+config.cmdPrefix+"invite - Gives an invite link you can use to invite the bot to your own channel";
        help += "\n"+config.cmdPrefix+"summon - Makes the bot join the voice channel";
        help += "\n"+config.cmdPrefix+"disconnect - Disconnects the bot from the voice channel";
        help += "\n"+config.cmdPrefix+"play [URL / Search term] - Plays a song or adds it to the queue";
        help += "\n"+config.cmdPrefix+"stop - Stops playing and clears the queue";
        help += "\n"+config.cmdPrefix+"skip - Skips the current song and moves on to the next in queue";
        help += "\n"+config.cmdPrefix+"queue - Shows what's in the queue";
        help += "\n"+config.cmdPrefix+"clear - Clears the queue, but keeps the current song playing";
        help += "\n"+config.cmdPrefix+"remove [song id] - Removes that specific song from queue";
        help += "\n"+config.cmdPrefix+"song - Shows what song is currently playing";
        help += "\nPlease note that the music bot downloads the songs before playing. Be patient.\n```";
        help += "\nhttps://github.com/tonkku107/discord-musicbot";
        bot.sendMessage({to: channelID, message: help});
        break;
      /* MUSIC COMMANDS */
      case "summon":
        if (channelID in bot.directMessages) {
          bot.sendMessage({to: channelID, message: ":x: There's no voice channel in DMs"});
        }else{
          if(voice_channel[serverID]){
            return;
          }
          voice_channel_id = bot.servers[serverID].members[userID].voice_channel_id;
          if(voice_channel_id){
            bot.joinVoiceChannel(voice_channel_id, function(){
              summoners[serverID] = userID;
              voice_channel[serverID] = voice_channel_id;
              bot.sendMessage({to: channelID, message: ":white_check_mark: Ready to play!"});
            });
          }else{
            bot.sendMessage({to: channelID, message: ":x: You are not in a voice channel"});
          }
        }
        break;
      case "dc":
      case "disconnect":
      case "leave":
        if (voice_channel[serverID] && summoners[serverID] && bot.channels[voice_channel[serverID]].members && !bot.channels[voice_channel[serverID]].members[summoners[serverID]] && config.limitToSummoner) {
          return dcVoice(serverID, channelID, true);
        }
        if(voice_channel[serverID]){
          if ((config.limitToSummoner && summoners[serverID] && summoners[serverID] == userID || userID == config.ownerID) || !config.limitToSummoner) {
            dcVoice(serverID, channelID, false);
          }else{
            bot.sendMessage({to: channelID, message: ":no_entry_sign: Only person who summoned me can make me leave."});
          }
        }else{
          bot.sendMessage({to: channelID, message: ":x: I am not in a voice channel"});
        }
        break;
      case "play":
      case "add":
        var args = deSplit(command)[1];
        if(args){
          if(voice_channel[serverID]){
            url = resolveURL(args);
            downloadSong(url, channelID, {user: user, userID: userID}, function(file, info){
              if(!songQ[serverID]){
                bot.getAudioContext({channel: voice_channel[serverID], stereo: true}, function(stream){
                  ffmpegs[serverID] = playSong(file, serverID, channelID, stream);
                  bot.sendMessage({to: channelID, message: ":notes: Now Playing: **"+info.title+"**"});
                  if (config.displaySongAsGame) bot.setPresence({game: info.title});
                  songQ[serverID] = {};
                  songQ[serverID].q = [];
                  songQ[serverID].now = info;
                });
              }else{
                songQ[serverID].q.push(info);
                bot.sendMessage({to: channelID, message: ":white_check_mark: `"+info.title+"` Added to queue! Position: #"+songQ[serverID].q.length});
              }
            });
          }
        }else{
          bot.sendMessage({to: channelID, message: ":x: Please specify a song or an URL"});
        }
        break;
      case "stop":
        if (voice_channel[serverID] && summoners[serverID] && bot.channels[voice_channel[serverID]].members && !bot.channels[voice_channel[serverID]].members[summoners[serverID]] && config.limitToSummoner) {
          return dcVoice(serverID, channelID, true);
        }
        if(voice_channel[serverID]){
          if ((config.limitToSummoner && summoners[serverID] && summoners[serverID] == userID || userID == config.ownerID) || !config.limitToSummoner) {
            stopSong(serverID, channelID, true, true);
          }else{
            bot.sendMessage({to: channelID, message: ":no_entry_sign: Only person who added me can stop."});
          }
        }
        break;
      case "skip":
        if(voice_channel[serverID] && bot.servers[serverID].members[userID].voice_channel_id == voice_channel[serverID]){
          var usersAmount = Object.keys(bot.channels[voice_channel[serverID]].members).length;
          if(!(config.limitToSummoner && summoners[serverID] && summoners[serverID] == userID || userID == config.ownerID) && config.voteSkip){
            if(votes[serverID]){
              if(votes[serverID].includes(userID)){
                if(calculateVotes(usersAmount) <= votes[serverID].length){
                  stopSong(serverID, channelID, false);
                  votes[serverID] = [];
                }else{
                  bot.sendMessage({to: channelID, message: ":warning: Your vote is already there, we need " + (calculateVotes(usersAmount) - votes[serverID].length) + " more."});
                }
              }else{
                votes[serverID].push(userID);
                if(calculateVotes(usersAmount) <= votes[serverID].length){
                  stopSong(serverID, channelID, false);
                  votes[serverID] = [];
                }else{
                  bot.sendMessage({to: channelID, message: ":white_check_mark: Your vote has been added, we need " + (calculateVotes(usersAmount) - votes[serverID].length) + " more."});
                }
              }
            }else{
              votes[serverID] = [];
              votes[serverID].push(userID);
              if (calculateVotes(usersAmount) <= votes[serverID].length) {
                stopSong(serverID, channelID, false);
                votes[serverID] = [];
              }else{
                bot.sendMessage({to: channelID, message: ":white_check_mark: Your vote has been added, we need " + (calculateVotes(usersAmount) - votes[serverID].length) + " more."});
              }
            }
          }else{
            stopSong(serverID, channelID, false);
          }
        }
        break;
      case "queue":
      case "playlist":
      case "list":
        if(voice_channel[serverID] && songQ[serverID] && (songQ[serverID].q.length != 0 || songQ[serverID].now != null)){
          if(songQ[serverID].q.length != 0 && songQ[serverID] != null){
            var songcount = songQ[serverID].q.length;
            var origcount = songQ[serverID].q.length;
            if(songcount > config.queueDisplaySize)
              songcount = config.queueDisplaySize;
            var remaining = origcount - songcount;
            if(origcount == 1){
              var queuestring = "Now Playing: **"+songQ[serverID].now.title+"**\n\nThere is just "+origcount+" song in queue:";
            }else{
              var queuestring = "Now Playing: **"+songQ[serverID].now.title+"**\n\nThere are "+origcount+" songs in queue:";
            }
            for (i=1; i < songcount+1; i++){
              queuestring += "\n`"+i+".` "+songQ[serverID].q[i-1].title+" - queued by @**"+songQ[serverID].q[i-1].user.user+"**";
            }
            if(remaining > 0)
              queuestring += "\n+"+remaining+" more";
            bot.sendMessage({to: channelID, message: queuestring});
          }else if(songQ[serverID].now != null){
            bot.sendMessage({to: channelID, message: "Now Playing: **"+songQ[serverID].now.title+"**\n\nQueue is empty."});
          }
        }else{
          bot.sendMessage({to: channelID, message: ":x: There's nothing in the queue."});
        }
        break;
      case "clear":
      case "clearqueue":
        if (voice_channel[serverID] && summoners[serverID] && bot.channels[voice_channel[serverID]].members && !bot.channels[voice_channel[serverID]].members[summoners[serverID]] && config.limitToSummoner) {
          return dcVoice(serverID, channelID, true);
        }
        if(songQ[serverID] && songQ[serverID].q.length != 0){
          if ((config.limitToSummoner && summoners[serverID] && summoners[serverID] == userID || userID == config.ownerID) || !config.limitToSummoner) {
            clearQueue(serverID, channelID, true);
          }else{
            bot.sendMessage({to: channelID, message: ":x: Only person who added me can clear the queue."});
          }
        }
        break;
      case "remove":
        if (voice_channel[serverID] && summoners[serverID] && bot.channels[voice_channel[serverID]].members && !bot.channels[voice_channel[serverID]].members[summoners[serverID]] && config.limitToSummoner) {
          return dcVoice(serverID, channelID, true);
        }
        if ((config.limitToSummoner && summoners[serverID] && summoners[serverID] == userID || userID == config.ownerID) || !config.limitToSummoner) {
          command[1] = parseInt(command[1]);
          if(Number.isInteger(command[1])){
            if(songQ[serverID] && songQ[serverID].q[command[1]-1]){
              var removed = songQ[serverID].q[command[1]-1];
              fs.unlink(removed.filepath);
              songQ[serverID].q.splice(command[1]-1, 1);
              bot.sendMessage({to: channelID, message: ":white_check_mark: Removed `"+removed.title+"` from the queue"});
            }else{
              bot.sendMessage({to: channelID, message: ":x: A song with that index was not found"});
            }
          }else{
            bot.sendMessage({to: channelID, message: ":x: Please specify index number of a song"});
          }
        }else{
          bot.sendMessage({to: channelID, message: ":x: Only person who added me can remove queued songs."});
        }
        break;
      case "song":
      case "currentsong":
      case "current":
      case "now":
        if(songQ[serverID] && songQ[serverID].now){
          bot.sendMessage({to: channelID, message: ":notes: Now Playing: **"+songQ[serverID].now.title+"**"});
        }else{
          bot.sendMessage({to: channelID, message: ":x: Nothing is playing"});
        }
        break;
    }
  }
});

bot.on('disconnect', function(){
  console.log("bot got disconnected, reconnecting in 10 seconds");
  setTimeout(function(){
    bot.connect();
  }, 10000);
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

var sendSelfDestructMessage = function(channelID, message, delay){
  bot.sendMessage({to: channelID, message: message}, function(err, res){
    if(err) return console.log(err);
    var timeout = setTimeout(function(){
      bot.deleteMessage({channel: res.channel_id, messageID: res.id});
    }, delay);
  });
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
    '-af', 'volume='+config.volume,
    '-ac', '2',
    'pipe:1'
  ], {stdio: ['pipe', 'pipe', 'ignore']});

  ffmpeg.stdout.once('readable', function() {
    stream.send(ffmpeg.stdout);
    console.log("Playback started");
  });

  ffmpeg.stdout.once('end', function(){
    console.log("Playback ended");
    fs.unlink(file);
    delete songQ[serverID].now;
    processQueue(serverID, channelID);
  });

  return ffmpeg;
}

var stopSong = function(serverID, channelID, clearQ, announce){
  var ffmpeg = ffmpegs[serverID];
  delete votes[serverID];
  if(clearQ){
    clearQueue(serverID, channelID, false);
    if (announce) bot.sendMessage({to: channelID, message: ":white_check_mark: Queue cleared and song stopped!"});
  }
  if(ffmpeg){
    ffmpeg.kill();
    if (!clearQ) bot.sendMessage({to: channelID, message: ":white_check_mark: Song skipped!"});
  }
}

var clearQueue = function(serverID, channelID, announce){
  if (songQ[serverID]){
    songQ[serverID].q.forEach(function(v){
      fs.unlink(v.filepath);
    });
    songQ[serverID].q = [];
    if(announce) bot.sendMessage({to: channelID, message: ":white_check_mark: Queue cleared!"});
  }
}

var dcVoice = function(serverID, channelID, becauseLeave){
  stopSong(serverID, channelID, true);
  bot.leaveVoiceChannel(bot.servers[serverID].members[bot.id].voice_channel_id, function(){
    delete voice_channel[serverID];
    if(songQ[serverID] && songQ[serverID].now) fs.unlink(songQ[serverID].now.filepath);
    delete songQ[serverID];
    delete votes[serverID];
    delete summoners[serverID];
    if(becauseLeave) bot.sendMessage({to: channelID, message: ":no_entry_sign: Left from voice channel because summoner has left."});
    else bot.sendMessage({to: channelID, message: ":white_check_mark: Disconnected"});
  });
}

var resolveURL = function(args){
  var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
  if(regexp.test(args)){
    return args;
  }else{
    return "ytsearch:"+args;
  }
}

var downloadSong = function(url, channelID, user, callback){
  function _download(url){
    var filename = generateUUID() + ".mp3";
    var songpath = path.join(__dirname + '/songs/', filename);
    var downloaded = 0;
    var video = youtubedl(url, ['-f', 'bestaudio/best'], {cwd: __dirname});
    var songInfo;
    bot.simulateTyping(channelID);
    video.on('info', function(info){
      console.log('Download started');
      console.log('filename: ' + info._filename);
      console.log('size: ' + info.size);
      sendSelfDestructMessage(channelID, ":arrow_down: Downloading `"+info.title+"`... ", 3500);
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
      bot.sendMessage({to: channelID, message: "```"+err.toString().substring(spot)+"```"});
    });

    video.pipe(fs.createWriteStream(songpath));
    video.on('end', function(){
      console.log("Download Complete!");
      songInfo.filepath = songpath;
      songInfo.user = user;
      downloaded = 1;
      callback(songpath, songInfo);
    });

    video.on('next', _download);
  }
  _download(url);
}

var processQueue = function(serverID, channelID){
  if(songQ[serverID].q.length != 0){
    var next = songQ[serverID].q[0];
    songQ[serverID].q.splice(0, 1);
    songQ[serverID].now = next;
    var file = next.filepath;
    bot.getAudioContext({channel: voice_channel[serverID], stereo: true}, function(stream){
      ffmpegs[serverID] = playSong(file, serverID, channelID, stream);
      bot.sendMessage({to: channelID, message: ":notes: Now Playing: **"+next.title+"**"});
      if (config.displaySongAsGame) bot.setPresence({game: next.title});
    });
  }else{
    delete songQ[serverID];
    if (config.displaySongAsGame && !config.showDefaultGame) bot.setPresence({game: null});
    if (config.showDefaultGame) bot.setPresence({game: config.defaultGame.game, type: config.defaultGame.type, url: config.defaultGame.url});
  }
}

var calculateVotes = function (users) {
    if (users == 1 || users == 2) {
        return 0
    } else if (users == 3 || users == 4) {
        return 2
    } else if (users > 7) {
        return 5
    } else if (users > 4) {
        return 3
    } else {
        return 6
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
