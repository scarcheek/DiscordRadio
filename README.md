# DiscordRadio
A Discord Rich Presence feature to share your currently watched YouTube video or song!

## How To Install
To share your own YouTube activity you need 2 things:
  * The Google Chrome Extension
  * The Command Line Client

### Host-Client
To get the Host-Client up and running you need to have a node package manager installed on your system.
Execute following commands:
```bash
cd ./host-client && npm install && npm start
```

If everything ran smoothly the console should output `🎉 All set up and ready to go!`

### Chrome Extension
> This is subject to change soon™

To install the chrome extension you have to follow these 4 steps:
* Navigate to `chrome://extensions/`
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
The most common error will occur if you reload the extension without restarting chrome afterwards.
If that doesn't solve the problem, feel free to contact `Scar#9670` or `Lancear#6961` on Discord about it!