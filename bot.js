const Discordie = require('discordie');
const client = new Discordie({autoReconnect: true});
const config = require("./config");
if(!config.token) throw "MISSING TOKEN FROM CONFIG";
client.connect({token: config.token});
const fs = require('fs');
const request = require('request');
const path = require('path');
const youtubedl = require('youtube-dl');
const m3u8 = require('m3u8');
const stream = require('stream');

var startup;
var inviteURL;
var permissions = "0";
var music = {
  summoners: {},
  votes: {},
  songQ: {},
  streams: {}
}
var downloaders = [];

client.Dispatcher.on("GATEWAY_READY", e => {
  console.log(`Connected as: ${client.User.username} - ${client.User.id}`);
  startup = new Date();
  if(config.showDefaultGame) client.User.setGame(config.defaultGame);

  loadDownloaders();

  client.User.getApplication().then(app => {
    inviteURL = "https://discordapp.com/oauth2/authorize?client_id="+app.id+"&scope=bot&permissions="+permissions;
    console.log("Invite URL:" + inviteURL);
  }).catch(e => {
    console.log(e);
    inviteURL = "https://discordapp.com/oauth2/authorize?client_id="+client.User.id+"&scope=bot&permissions="+permissions;
    console.log("Invite URL:" + inviteURL);
  });

  fs.mkdir('songs', 0777, function(err){
    if(err){
      if(err.code == "EEXIST") return;
      else throw err;
    }
  });
});

client.Dispatcher.on("MESSAGE_CREATE", e => {
  if(e.message.isPrivate){
    console.log(`[DM] ${e.message.author.username}: ${e.message.content}`);
  }else{
    console.log(`[${e.message.guild.name} / #${e.message.channel.name}] ${e.message.author.username}: ${e.message.content}`);
  }

  if((config.cmdPrefix != "" && e.message.content.substring(0, config.cmdPrefix.length) === config.cmdPrefix) || (e.message.content.substring(0, 2) == "<@" && e.message.content.substring(0, 22).replace(/\D/g, "") == client.User.id) && e.message.author.id != client.User.id && !e.message.author.bot){
    if (config.cmdPrefix != "" && e.message.content.substring(0, config.cmdPrefix.length) === config.cmdPrefix) var command = e.message.content.substring(config.cmdPrefix.length).split(' ');
    else var command = e.message.content.substring(e.message.content.indexOf('>')+2).split(' ');

    try{
      switch(command[0].toLowerCase()){
        case "ping":
          const ping = new Date();
          e.message.channel.sendMessage("Pong!").then(msg => {
            const pong = new Date() - ping;
            msg.edit(`Pong! \`${pong}ms\``);
          });
          break;
        case "status":
          const servers = client.Guilds.length || 0;
          const voice = client.VoiceConnections.length || 0;

          const now = new Date();
          const uptime = getTimeInBetween(now, other.startup);
          e.message.channel.sendMessage("", false, {
            color: null, //change if you feel like it
            author: {name: client.User.username, icon_url: client.User.avatarURL, url: other.inviteURL},
            title: "Bot status",
            fields:[
              {name:"I am connected to", value:`**${servers}** ${servers == 1 ? "server" : "servers"}\n**${voice}** ${voice == 1 ? "voice channel" : "voice channels"}`},
              {name: "I have been online for", value:`${uptime.days}d ${uptime.hours}h ${uptime.minutes}m ${uptime.seconds}s`},
            ],
            timestamp: now,
          });
          break;
        case "invite":
          if (config.allowInvite) e.message.channel.sendMessage("Use this link to invite me to your server: \n"+inviteURL);
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
          e.message.channel.sendMessage(help);
          break;
        case "summon":
        case "join":
          if(client.User.getVoiceChannel(e.message.guild)) return;
          const channel = e.message.author.getVoiceChannel(e.message.guild);
          if(channel){
            channel.join(false, false).then(info => {
              music.summoners[e.message.guild.id] = e.message.author.id;
              e.message.channel.sendMessage("✅ Ready to play");
            }, err => {
              e.message.channel.sendMessage(`❌ Error \`${err.response.body.message}\``);
            });
          }else{
            e.message.channel.sendMessage("❌ You are not in a voice channel");
          }
          break;
        case "disconnect":
        case "dc":
        case "leave":
          if(!client.User.getVoiceChannel(e.message.guild)) return e.message.channel.sendMessage("❌ I am not in a voice channel");
          if((config.limitToSummoner && (!client.User.getVoiceChannel(e.message.guild).members.find(obj => obj.id == music.summoners[e.message.guild.id]) || e.message.author.id == music.summoners[e.message.guild.id] || e.message.author.id == config.ownerID)) || !config.limitToSummoner) {
            dcVoice(client.User.getVoiceChannel(e.message.guild), e);
          }else{
            e.message.channel.sendMessage("🚫 Only the person who added me can make me leave");
          }
          break;
        case "play":
        case "add":
          var args = command.splice(1).join(' ');
          if(args) {
            if(!client.User.getVoiceChannel(e.message.guild)){
              const channel = e.message.author.getVoiceChannel(e.message.guild);
              if(channel){
                channel.join(false, false).then(info => {
                  music.summoners[e.message.guild.id] = e.message.author.id;
                }, err => {
                  e.message.channel.sendMessage(`❌ Error \`${err.response.body.message}\``);
                });
              }else{
                return e.message.channel.sendMessage("❌ You are not in a voice channel");
              }
            }
            url = resolveURL(args);
            downloadSong(url, e.message.author, e.message.channel, info => {
              if(!music.songQ[e.message.guild.id]){
                if(info.protocol != "m3u8"){
                  music.streams[e.message.guild.id] = playSong(info.filepath, e.message.channel, client, config);
                  e.message.channel.sendMessage(`🎶 Now Playing: **${info.title}**`);
                }
                else{
                  music.streams[e.message.guild.id] = playSong(info.url, e.message.channel, client, config);
                  e.message.channel.sendMessage(`🎶 Now Playing: **${info.title}** \`[STREAM]\``);
                }
                music.songQ[e.message.guild.id] = {};
                music.songQ[e.message.guild.id].q = [];
                music.songQ[e.message.guild.id].now = info;
              }else{
                if(info.protocol == "m3u8") return e.message.channel.sendMessage("❌ Streams must be added to an empty queue");
                music.songQ[e.message.guild.id].q.push(info);
                e.message.channel.sendMessage(`✅ \`${info.title}\` Added to queue! Position: #${music.songQ[e.message.guild.id].q.length}`);
              }
            });
          }else{
            e.message.channel.sendMessage("❌ Please specify a song or an URL");
          }
          break;
        case "stop":
          if(client.User.getVoiceChannel(e.message.guild) && (config.limitToSummoner && (!client.User.getVoiceChannel(e.message.guild).members.find(obj => obj.id == music.summoners[e.message.guild.id]) || e.message.author.id == music.summoners[e.message.guild.id] || e.message.author.id == config.ownerID)) || !config.limitToSummoner) {
            stopSong(e.message.channel, true, true);
          }else{
            if(client.User.getVoiceChannel(e.message.guild)) e.message.channel.sendMessage("🚫 Only person who added me can stop.");
          }
          break;
        case "skip":
          if(client.User.getVoiceChannel(e.message.guild)){
            if((config.limitToSummoner && (e.message.author.id == music.summoners[e.message.guild.id] || e.message.author.id == config.ownerID)) || !config.voteSkip) {
              stopSong(e.message.channel, false, false);
            }else{
              var usersAmount = client.User.getVoiceChannel(e.message.guild).members.length;
              if(music.votes[e.message.guild.id]){
                var votes = music.votes[e.message.guild.id]
                if(music.votes[e.message.guild.id].includes(e.message.author.id)){
                  if(calculateVotes(usersAmount) <= votes.length){
                    stopSong(e.message.channel, false, false);
                  }else{
                    e.message.channel.sendMessage(`⚠ Your vote is already there, we need ${calculateVotes(usersAmount) - votes.length} more.`);
                  }
                }else{
                  votes.push(e.message.author.id);
                  if(calculateVotes(usersAmount) <= votes.length){
                    stopSong(e.message.channel, false, false);
                  }else{
                    e.message.channel.sendMessage(`✅ Your vote has been added, we need ${calculateVotes(usersAmount) - votes.length} more.`);
                  }
                }
              }else{
                music.votes[e.message.guild.id] = [];
                music.votes[e.message.guild.id].push(e.message.author.id);
                var votes = music.votes[e.message.guild.id];
                if(calculateVotes(usersAmount) <= votes.length){
                  stopSong(e.message.channel, false, false);
                }else{
                  e.message.channel.sendMessage(`✅ Your vote has been added, we need ${calculateVotes(usersAmount) - votes.length} more.`);
                }
              }
            }
          }
          break;
        case "queue":
        case "playlist":
        case "list":
          if(client.User.getVoiceChannel(e.message.guild)){
            if(music.songQ[e.message.guild.id] && music.songQ[e.message.guild.id].q.length != 0){
              var songcount = music.songQ[e.message.guild.id].q.length;
              var origcount = music.songQ[e.message.guild.id].q.length;
              if(songcount > config.queueDisplaySize)
                songcount = config.queueDisplaySize;
              var remaining = origcount - songcount;
              if(music.songQ[e.message.guild.id].now.protocol != "m3u8"){
                var queuestring = "Now Playing: **"+music.songQ[e.message.guild.id].now.title+"**";
              }else{
                var queuestring = "Now Playing: **"+music.songQ[e.message.guild.id].now.title+"** `[STREAM]`";
              }
              if(origcount == 1){
                queuestring += "\n\nThere is just "+origcount+" song in queue:";
              }else{
                queuestring += "\n\nThere are "+origcount+" songs in queue:";
              }
              for (i=1; i < songcount+1; i++){
                queuestring += "\n`"+i+".` "+music.songQ[e.message.guild.id].q[i-1].title+" - queued by @**"+music.songQ[e.message.guild.id].q[i-1].user.username+"**";
              }
              if(remaining > 0)
                queuestring += "\n+"+remaining+" more";
              e.message.channel.sendMessage(queuestring);
            }else if(music.songQ[e.message.guild.id] && music.songQ[e.message.guild.id].now){
              if(music.songQ[e.message.guild.id].now.protocol != "m3u8") e.message.channel.sendMessage(`Now Playing: **${music.songQ[e.message.guild.id].now.title}**\n\nQueue is empty.`);
              else e.message.channel.sendMessage(`Now Playing: **${music.songQ[e.message.guild.id].now.title} \`[STREAM]\`**\n\nQueue is empty.`);
            }else{
              e.message.channel.sendMessage("❌ There's nothing in the queue.");
            }
          }
          break;
        case "clear":
        case "clearqueue":
          if(client.User.getVoiceChannel(e.message.guild) && (config.limitToSummoner && (!client.User.getVoiceChannel(e.message.guild).members.find(obj => obj.id == music.summoners[e.message.guild.id]) || e.message.author.id == music.summoners[e.message.guild.id] || e.message.author.id == config.ownerID)) || !config.limitToSummoner) {
            clearQueue(e.message.channel, true);
          }else{
            if(client.User.getVoiceChannel(e.message.guild)) e.message.channel.sendMessage("❌ Only person who added me can clear the queue.");
          }
          break;
        case "remove":
          if(client.User.getVoiceChannel(e.message.guild) && (config.limitToSummoner && (!client.User.getVoiceChannel(e.message.guild).members.find(obj => obj.id == music.summoners[e.message.guild.id]) || e.message.author.id == music.summoners[e.message.guild.id] || e.message.author.id == config.ownerID)) || !config.limitToSummoner) {
            if(parseInt(command[1])){
              if(music.songQ[e.message.guild.id] && music.songQ[e.message.guild.id].q[command[1]-1]){
                var removed = music.songQ[e.message.guild.id].q[command[1]-1];
                fs.unlink(removed.filepath, (err) => {if(err)console.log(err);});
                music.songQ[e.message.guild.id].q.splice(command[1]-1, 1);
                e.message.channel.sendMessage(`✅ Removed \`${removed.title}\` from the queue`);
              }else{
                e.message.channel.sendMessage("❌ A song with that position was not found");
              }
            }else{
              e.message.channel.sendMessage("❌ Please specify position number of a song");
            }
          }else{
            e.message.channel.sendMessage("❌ Only person who added me can remove queued songs.");
          }
          break;
          case "song":
          case "currentsong":
          case "current":
          case "now":
            if(music.songQ[e.message.guild.id] && music.songQ[e.message.guild.id].now){
              if(music.songQ[e.message.guild.id].now.protocol != "m3u8") e.message.channel.sendMessage(`🎶 Now Playing: **${music.songQ[e.message.guild.id].now.title}**`);
              else e.message.channel.sendMessage(`🎶 Now Playing: **${music.songQ[e.message.guild.id].now.title}** \`[STREAM]\``);
            }else{
              e.message.channel.sendMessage("❌ Nothing is playing");
            }
            break;
      }
    } catch(err){
      console.log(err);
      try {e.message.channel.sendMessage("❌ An error ocurred");}catch(err2){/*lol*/};
    }
  }
});

client.Dispatcher.on("DISCONNECTED", e => {
  console.log(`Disconnected. ${e.error}`);
  if(e.autoReconnect) console.log(`Reconnecting in ${e.delay}`);
});

client.Dispatcher.on("VOICE_DISCONNECTED", event => {
  if(event.voiceConnection.guild.id && music.songQ[event.voiceConnection.guild.id]){
    function reconnect(channel) {
      channel.join().catch(err => setTimeout(reconnect(channel), 5000));
    }

    const channel = event.voiceConnection.channel;
    if (!channel) return;
    if (event.endpointAwait) {
      event.endpointAwait.catch(err => {
        setTimeout(() => reconnect(channel), 5000);
      });
      return;
    }
    setTimeout(() => reconnect(channel), 5000);
  }
});

const loadDownloaders = () => {
  fs.readdir('downloaders', (err, files) => {
    files.forEach((file, index) => {
      if(file.endsWith('.js')){
        downloaders.push(require(`./downloaders/${file}`));
        console.log(`[Music Downloader] ${file} loaded`);
      }
    });
  });
};

const sendSelfDestructMessage = (channel, message, delay) => {
  channel.sendMessage(message).then(msg => {
    setTimeout(() => {
      msg.delete();
    }, delay);
  });
};

const stopSong = (channel, clearQ, announce) => {
  delete music.votes[channel.guild.id];
  if(clearQ){
    clearQueue(channel, false);
    if(announce) channel.sendMessage("✅ Queue cleared and song stopped!");
  }
  if(music.streams[channel.guild.id]){
    music.streams[channel.guild.id].encoder.stop();
    if(!clearQ) channel.sendMessage("✅ Song skipped!");
  }
};

const clearQueue = (channel, announce) => {
  if(music.songQ[channel.guild.id]){
    music.songQ[channel.guild.id].q.forEach(v => {
      fs.unlink(v.filepath, (err) => {if(err)console.log(err);});
    });
    music.songQ[channel.guild.id].q = [];
    if(announce) channel.sendMessage("✅ Queue cleared!");
  }
};

const dcVoice = (channel, e) => {
  stopSong(channel, true);
  channel.leave();
  if(music.songQ[channel.guild.id] && music.songQ[channel.guild.id].now) fs.unlink(music.songQ[channel.guild.id].now.filepath, (err) => {if(err)console.log(err);});
  delete music.songQ[channel.guild.id];
  delete music.votes[channel.guild.id];
  delete music.summoners[channel.guild.id];
  e.message.channel.sendMessage("✅ Disconnected from voice channel");
};

const resolveURL = (args) => {
  var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
  args = args.split(' ');
  if(args[0].startsWith(":")){
    return args;
  }
  for(dler of downloaders){
    if(dler.urlReg.test(args[0])){
      return dler.formatURL(args);
    }
  }
  if(regexp.test(args[0])){
    return args;
  }else{
    args[0] = "ytsearch:"+args.join(' ')
    return args;
  }
};

const generateUUID = () => {
  var d = new Date().getTime();

  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c=='x' ? r : (r&0x3|0x8)).toString(16);
  });
  return uuid;
};

const downloadSong = (url, user, channel, cb) => {
    const _download = (url, data, playlist) => {
      var filename = generateUUID() + ".mp3";
      var songpath = path.join(__dirname + '/songs/', filename);
      var downloaded = 0;
      var songInfo;
      var video = youtubedl(url, ['-f', 'bestaudio/best'], {cwd: __dirname, maxBuffer: Infinity});
      channel.sendTyping();
      video.on('info', info => {
        songInfo = info;
        songInfo.filepath = songpath;
        songInfo.user = user;
        for(prop in data){
          songInfo[prop] = data[prop];
        }
        console.log('Download started');
        console.log('title: ' + info.title);
        console.log('size: ' + info.size);
        sendSelfDestructMessage(channel, `⬇ Downloading \`${info.title}\`... `, 3500);
        const simulateDownload = (firstTime) => {
          var typingTime = 5000;
          if(firstTime) typingTime = 50;
          channel.sendTyping().then(() => {
            setTimeout(() => {
              if(!downloaded) simulateDownload();
            }, typingTime);
          });
        }
        simulateDownload(true);
      });
      video.pipe(fs.createWriteStream(songpath));
      video.on('end', () => {
        console.log("Download Complete!");
        if(songInfo.protocol == "m3u8") fs.unlink(songpath, (err) => {if(err)console.log(err);});
        downloaded = 1;
        cb(songInfo);
        if(playlist && playlist.length) _next(playlist[0].url, playlist[0].data, playlist.splice(1))
      });
      video.on('error', err => {
        console.log(err);
        fs.unlink(songpath, (err) => {if(err)console.log(err);});
        var spot = err.toString().indexOf("ERROR: ");
        channel.sendMessage("```"+err.toString().substring(spot)+"```");
      });
      var _next = (url, data, playlist) => {
        setTimeout(() => _download(url, data, playlist), 1000);
      }
      video.on('next', _next);
    };
      channel.sendTyping();
      if(url[0].startsWith(":")){
        downloaders.find(d => ":"+d.prefix+":" == url[0].substring(0, url[0].substr(1).indexOf(":")+2)).download(url, {user: user}, (err, res) => {
          if(err) return channel.sendMessage("Error: `"+err.message+'`');
          if(res[0].direct) cb(res[0].data)
          else{
            _download(res[0].url, res[0].data, res.splice(1));
          }
        });
      }else{
        _download(url[0]);
      }
};

const playSong = (file, channel, client, config) => {
  var voice = client.VoiceConnections.find(obj => obj.voiceConnection.guildId == channel.guild.id);
  if(!voice) return console.log("Voice not connected");

  var encoder = voice.voiceConnection.createExternalEncoder({
    type: "ffmpeg",
    source: file,
    format: "opus",
    outputArgs: ['-af', `volume=${config.volume}`],
    debug: false
  });
  if(!encoder) return console.log("No encoder");

  encoder.once("end", () => {
    encoder.stop();
  });

  encoder.once("unpipe", () => {
    encoder.destroy();
    _delete = () => {
      fs.unlink(file, (err) => {
        if(err){
          if(err.code == "EBUSY"){
            //If the file is busy, wait 5 seconds and try again
            setTimeout(_delete, 5000);
          }
          else return;
        }
      });
    }
    _delete();
    if(!channel.guild) return;
    if(music.songQ[channel.guild.id]) delete music.songQ[channel.guild.id].now;
    delete music.votes[channel.guild.id];
    processQueue(channel, client, config);
  });

  var encoderStream = encoder.play();
  encoderStream.resetTimestamp();
  encoderStream.removeAllListeners("timestamp");
  encoderStream.on("timestamp", time => {});
  return {encoderStream, encoder};
};

const processQueue = (channel, client, config) => {
  if(music.songQ[channel.guild.id] && music.songQ[channel.guild.id].q.length != 0){
    var next = music.songQ[channel.guild.id].q[0];
    music.songQ[channel.guild.id].q.shift();
    music.songQ[channel.guild.id].now = next;
    music.streams[channel.guild.id] = playSong(next.filepath, channel, client, config);
    channel.sendMessage(`🎶 Now Playing: **${next.title}**`);
    if (config.displaySongAsGame) client.User.setGame({name: next.title});
  }else{
    delete music.songQ[channel.guild.id];
    if (config.displaySongAsGame && !config.showDefaultGame) client.User.setGame({name: null});
    if (config.showDefaultGame) client.User.setGame(config.defaultGame);
  }
};

const calculateVotes = users => {
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
};

const getTimeInBetween = (now, starttime) => {
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

/* EXIT HANDLING */
process.stdin.resume();

const disconnect = err => {
  if (err){
    console.log(err);
    console.log(err.stack);
  }
  client.disconnect();
  process.exit();
};
process.on('exit', disconnect);
process.on('SIGINT', disconnect);
process.on('uncaughtException', disconnect);
