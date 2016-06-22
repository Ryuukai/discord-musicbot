var config = {
  token: "", //Insert your bot token here, you can get this from https://discordapp.com/developers/applications/me
  ownerID: "", //Your (bot owner's) id for extra access. Can be blank for no owner.
  cmdPrefix: "!", //The character or string commands must start with. DEFAULT: "!"
  allowInvite: false, //Boolean. If true, the !invite command is allowed, which sends an oauth link to add the bot to different servers. DEFAULT: false

  volume: 0.5, //Audio volume. 0 = 0%, 0.5 = 50%, 1 = 100%, etc. Be careful not to set it to 50 (500%) or something similar. DEFAULT: 0.5
  queueDisplaySize: 10, //The amount of tracks shown with the queue command. DEFAULT: 10
  limitToSummoner: true, //Give only the person who summoned the bot access to !stop or !remove, etc. DEFAULT: true
  voteSkip: true, //Vote for skipping a song, instead of just having one person skipping. DEFAULT: true

  displaySongAsGame: true, //Boolean. If true, bot will show the current song at its status. Not recommended if the bot is in multiple servers. DEFAULT: true
  showDefaultGame: false, //Boolean. If true and nothing else is playing, the bot's status will be the default game configurable below. DEFAULT: false
  defaultGame: {
    game: "", //The game name
    type: 0, //0 = "Playing", 1 = "Streaming"
    url: "" //Required for stream mode. Needs to be a valid twitch url.
  },
};

module.exports = config;
