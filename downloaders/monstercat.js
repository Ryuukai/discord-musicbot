const request = require('request');
const api = "https://connect.monstercat.com/api/";
const data = "https://s3.amazonaws.com/data.monstercat.com/blobs/";

module.exports = {
  prefix: "monstercat",
  urlReg: /(http|https):\/\/(www.)?monstercat.com\/(release|playlist)\/[a-zA-Z0-9]+/i,
  formatURL: function(url){
    var splits = url[0].split('/')
    if(splits[splits.length-2] == "playlist"){
      url[0] = ":monstercat:p:"+splits[splits.length-1];
    }else{
      url[0] = ":monstercat:"+splits[splits.length-1];
    }
    return url;
  },
  download: function(url, extras, callback){
    if(url[0].startsWith(':monstercat:')){
      var thing = url[0].replace(':monstercat:', '')
      if(thing.startsWith('p:')){
        getPlaylist(thing.replace('p:', ''), (err, res) => {
          if(err) return callback(err);
          processTracks(res, url, callback);
        })
      }else{
        getRelease(thing, (err, res) => {
          if(err) return callback(err);
          processTracks(res, url, callback);
        })
      }
    }else{
      return callback(new Error("Invalid URL"))
    }
  }
}

getRelease = (cid, cb) => {
  request(api+'catalog/release/'+cid, (err, res, body) => {
    if(err) return cb(new Error('Unable to get release'));
    body = JSON.parse(body);
    if(body.name == "Error") return cb(new Error('Not found'));
    var id = body._id;
    request(api+'catalog/release/'+id+'/tracks', (err, res, body2) => {
      if(err) return cb(new Error('Unable to get tracks'));
      body2 = JSON.parse(body2);
      if(body2.name == "Error") return cb(new Error('Not found'));
      return cb(null, body2);
    })
  })
}

getPlaylist = (pid, cb) => {
  request(api+'playlist/'+pid+'/tracks', (err, res, body) => {
    if(err) return cb(new Error('Unable to get playlist'));
    body = JSON.parse(body);
    if(body.name == "CastError") return cb(new Error('Not found'));
    return cb(null, body);
  })
}

processTracks = (body, url, callback) => {
  var tracks = [];
  if(parseInt(url[1]) && body.total >= url[1] && url[1] > 0){
    var results = [body.results[url[1]-1]];
  }else{
    var results = body.results;
  }
  results.forEach((song, index) => {
    var url = song.albums.find(s => s.streamHash != "").streamHash;
    if(url) tracks.push({url: data+url, data:{title: song.artistsTitle+" - "+song.title}});
    if(index == results.length-1){
      return callback(null, tracks);
    }
  });
}
