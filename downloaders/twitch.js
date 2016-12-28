const m3u8 = require('m3u8');
const stream = require('stream');
const request = require('request');
const config = require('../config');

module.exports = {
  prefix: "twitch",
  urlReg: /(http|https):\/\/(www.)?twitch.tv\/[a-zA-Z0-9]+/i,
  formatURL: function(url){
    url[0] = ":twitch:"+url[0].substring(url[0].indexOf("tv/")+3);
    return url;
  },
  download: function(url, extras, callback){
    if(url[0].startsWith(':twitch:')){
      var channel = url[0].replace(":twitch:", "");
      request("http://api.twitch.tv/api/channels/"+channel+"/access_token?client_id="+config.twitchClientId, (err, res, body) => {
        if(!err){
          var token = JSON.parse(body);
          request("http://usher.twitch.tv/api/channel/hls/"+channel+".m3u8?player=twitchweb&&token="+token.token+"&sig="+token.sig+"&allow_audio_only=true&type=any&p="+Math.floor(Math.random() * 100000)+"&client_id="+config.twitchClientId, (err, res, body) => {
            if(!err){
              var parser = m3u8.createStream();
              var s = new stream.Readable();
              s.push(body);
              s.push(null);
              s.pipe(parser);
              parser.on('item', item => {
                if(item.get('video') == "audio_only"){
                  return callback(null, [{url: item.get('uri'),direct:true,data:{url: item.get('uri'), user: extras.user, title: channel, protocol: "m3u8"}}]);
                }
              });
              parser.on('error', err => {
                if(!err) return callback(new Error("Stream unavailable"));
              });
            }else{
              return callback(new Error("Stream unavailable1"));
            }
          });
        }else{
          return callback(new Error("Stream unavailable2"));
        }
      });
    }else{
      return callback(new Error("Invalid URL for this downloader"));
    }
  }
}
