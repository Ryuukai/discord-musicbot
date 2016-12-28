# Custom downloaders

Well, sort of...

Because youtube-dl didn't have support for all sites and I don't know python, I made this.    
It only really gets the direct url that can be passed to the main download function.    
The way I do it with all this url madness is weird yea, but it also allows for a thing I like.

## Documentation for making your own

Have some documentation ¯\\_(ツ)_/¯    
I have an `example.js` file you can look at. It's not very helpful.    
So start off with a `module.exports` object:

* `prefix` - String. This is the thing inside :: (example for `:hi:` you want to use prefix `hi`)
* `urlReg` - Regex that matches any url you want to put through.
* `formatURL(url)` - A function that turns the `url` matched in `urlReg` to an "url" you want with prefix. `url` is an Array of anything after the play command. (so modify `url[0]`)
* `download(url, extras, callback)` - A function that gets the direct url to the file needed. `url` is the same thing you returned previously. `extras` is an object of extra stuff, currently only the `user` that requested the track.

### The callback

This required it's own section. Gosh...

`callback(error, result)`. You should know how callbacks work.

`error` should be an Error object or null if there's no error.    
`result` is an Array of Objects like this:

* `url` - String. The url to download.
* `direct` - Boolean (not required). If true, the bot will bypass the download and go straight into streaming.
* `data` - Object. Alot of things can be put here. Common ones are below. Ask me if you need something else and don't know.
  * `title` - String. The title of the track the bot will label it as.
  * `user` - Discordie IUser Object. Not required unless you use direct.
  * `protocol` - String. Not required unless it's a livestream that goes forever, then use "m3u8" (I know it doesn't always mean that but screw it)

It's an array because you can have playlists.    
