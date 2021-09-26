# 📻 Discord Radio 🎶
Discord Radio is the first ever Discord Rich Presence feature which not only shares the song/video you are currently listening/watching on YouTube, but also competes with the Spotify Premium Listen Along feature by allowing friends to listen along!
With our dear friend Groovy receiving a cease and desist from Google 😢, and probably many music bots at risk of following, we hope you agree that Discord Radio is the next best thing in town!

## How it works
### For listening along
It's as easy as pressing the listen along button on your friends Discord activity. No client or anything needed!
Many browsers block media autoplay, so you might have to press play on the initial loading and then the client will sync itself automatically for you.

### For sharing your activity and hosting sessions
We wanted to make the hosting experience as intuitive as possible. We know you just want to open up YouTube in your favourite browser and start sharing your activity.
That's why we made a browser extension for that kick-ass browser of yours which handles most of the work. Unfortunately, due to the limitations of browser extensions and the hassle of connecting to Discord in a TOS conform way, you will need to install a small application which gives the browser extension the power to communicate with Discord and update your activity.

## How To Install
To share your own YouTube activity you need 2 things:
  * The Browser Extension
  * The Command Line Client

### Host-Client

To get the Host-Client up and running you need to have node v16 and a node package manager installed on your system.
Execute following commands:
```bash
cd ./host-client && npm install && npm start
```

If everything ran smoothly the console should output `🎉 All set up and ready to go!`

### Browser Extension
> This is subject to change soon™

To install the browser extension you have to follow these 4 steps:
* Navigate to `chrome://extensions/` (ToDo: firefox)
* Enable `Developer mode` in the top right corner
* Click the button `Load unpacked` in the top left corner
* Select the `extension` folder located in this repository

## Usage
After you've successfully completed the installation you can start up the host client by executing following command:
```bash
cd ./host-client && npm start
```

Now you can open your favorite song on YouTube and right click to track the current tab.
> The Extension will tell you if the tab is currently tracked or an error occured.

After you tracked your tab the host-client will output that it is currently tracking a YouTube video.
Check back to your Discord and you'll see yourself playing Discord Radio!

### Error detection
The most common error will occur if you reload the extension without restarting the browser afterwards.
If that doesn't solve the problem, feel free to contact `Scar#5966` or `Lancear#6961` on Discord about it!
