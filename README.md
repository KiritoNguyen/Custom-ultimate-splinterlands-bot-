#Custom Ultimate Splinterlands Bot by PC Jones

## Bot configuration:

Configuration with default values:

- `QUEST_PRIORITY=true` Disable/Enable quest priority

- `MINUTES_BATTLES_INTERVAL=30` Sleep time before the bot will fight with all accounts again. Subtract 2-3 minutes per account

- `CLAIM_SEASON_REWARD=false` Disable/Enable season reward claiming

- `CLAIM_QUEST_REWARD=true` Disable/Enable quest reward claiming

- `HEADLESS=true` Disable/Enable headless("invisible") browser (e.g. to see where the bot fails)

- `KEEP_BROWSER_OPEN=true` Disable/Enable keeping the browser instances open after fighting. Recommended to have it on true to avoid having each account to login for each fight. Disable if CPU/Ram usage is too high (check in task manager)

- `LOGIN_VIA_EMAIL=false` Disable/Enable login via e-mail adress. See below for further explanation

- `EMAIL=account1@email.com,account2@email.com,account3@email.com` Your login e-mails, each account seperated by comma. Ignore line if `LOGIN_VIA_EMAIL` is `false`

- `ACCUSERNAME=username1,username2,username3` Your login usernames, each account seperated by comma. **Even if you login via email you have to also set the usernames!**

- `PASSWORD=password1,password2,password3` Your login passwords/posting keys. Use password if you login via email, **use the posting key if you login via username**

- `USE_API=true` Enable/Disable the team selection API. If disabled the bot will play the most played cards from local newHistory.json file. **Experimental - set to false if you 
- PROXY_ACCOUNT= 134.122.127.36:8080,default (example)
- MAXIMUM_DEC= 10 (example) : Limit DEC to get 
- DEC_PLAYER=reachinto (example): Player received DEC
- WRITE_FILE=false (example): Write Info Player File
