var config = {
  token: "MzM5ODQ1NzEwNTc5MjM2ODY1.DFp5gA.KlnF0hCkz_zVsXKShmXJzdRrN0o", //Insert your bot token here, you can get this from https://discordapp.com/developers/applications/me
  twitchClientId: "1v79zvjnxeyocbh5x4i3mnloboyac3", //Because twitch is a dick and requires it now (https://www.twitch.tv/settings/connections)
  ownerID: "110076057167618048", //Your (bot owner's) id for extra access. Can be blank for no owner.
  cmdPrefix: ",", //The character or string commands must start with. DEFAULT: "!"
  allowInvite: true, //Boolean. If true, the !invite command is allowed, which sends an oauth link to add the bot to different servers. DEFAULT: false

  volume: 1, //Audio volume. 0 = 0%, 0.5 = 50%, 1 = 100%, etc. Be careful not to set it to 50 (500%) or something similar. DEFAULT: 0.5
  queueDisplaySize: 25, //The amount of tracks shown with the queue command. DEFAULT: 10
  limitToSummoner: false, //Give only the person who summoned the bot access to !stop or !remove, etc. DEFAULT: true
  voteSkip: false, //Vote for skipping a song, instead of just having one person skipping. DEFAULT: true

  displaySongAsGame: false, //Boolean. If true, bot will show the current song at its status. Not recommended if the bot is in multiple servers. DEFAULT: true
  showDefaultGame: true, //Boolean. If true and nothing else is playing, the bot's status will be the default game configurable below. DEFAULT: false
  defaultGame: {
    name: "with bananas", //The game name
    type: 0, //0 = "Playing", 1 = "Streaming"
    url: "" //Required for stream mode. Needs to be a valid twitch url.
  },
};

module.exports = config;
