var config = {
  token: "", //Insert your bot token here, you can get this from https://discordapp.com/developers/applications/me
  cmdPrefix: "!", //The character or string commands must start with. DEFAULT: "!"
  allowInvite: true, //Boolean. If true, the !invite command is allowed, which sends an oauth link to add the bot to different servers. DEFAULT: false
  displaySongAsGame: false, //Boolean. If true, bot will show the current song at its status. Not recommended if the bot is in multiple servers. DEFAULT: true
  showDefaultGame: true, //Boolean. If true and nothing else is playing, the bot's status will be the default game configurable below. DEFAULT: false
  defaultGame: {
    game: "music", //The game name
    type: 1, //0 = "Playing", 1 = "Streaming"
    url: "https://www.twitch.tv/monstercat" //Required for stream mode. Needs to be a valid twitch url.
  },
};

module.exports = config;
