//'use strict';
require('dotenv').config()
const puppeteer = require('puppeteer');
const fetch = require("node-fetch");
// const chalk = require('chalk');

const splinterlandsPage = require('./splinterlandsPage');
const user = require('./user');
const card = require('./cards');
const helper = require('./helper');
const quests = require('./quests');
const ask = require('./possibleTeams');
const api = require('./api');
const useProxy = require('puppeteer-page-proxy');
const version = 0.3;

const cluster = require("cluster");
const numCPUs = require("os").cpus().length;
///////////////////////////////
require('chromedriver');
const fs = require('fs');

async function checkForUpdate() {
	console.log('-----------------------------------------------------------------------------------------------------');
	await fetch('http://jofri.pf-control.de/prgrms/splnterlnds/version.txt')
	.then(response=>response.json())
	.then(newestVersion=>{ 
		if (newestVersion > version) {
			console.log('New Update! Please download on https://github.com/PCJones/ultimate-splinterlands-bot');
			console.log('New Update! Please download on https://github.com/PCJones/ultimate-splinterlands-bot');
			console.log('New Update! Please download on https://github.com/PCJones/ultimate-splinterlands-bot');
		} else {
			console.log('No update available');
		}
	})
	console.log('-----------------------------------------------------------------------------------------------------');
}

async function checkForMissingConfigs() {
	if (!process.env.LOGIN_VIA_EMAIL) {
		console.log("Missing LOGIN_VIA_EMAIL parameter in .env - see updated .env-example!");
		await sleep(60000);
	}
	if (!process.env.HEADLESS) {
		console.log("Missing HEADLESS parameter in .env - see updated .env-example!");
		await sleep(60000);
	}
	if (!process.env.KEEP_BROWSER_OPEN) {
		console.log("Missing KEEP_BROWSER_OPEN parameter in .env - see updated .env-example!");
		await sleep(60000);
	}
	if (!process.env.CLAIM_QUEST_REWARD) {
		console.log("Missing CLAIM_QUEST_REWARD parameter in .env - see updated .env-example!");
		await sleep(60000);
	}
	if (!process.env.USE_CLASSIC_BOT_PRIVATE_API) {
		console.log("Missing USE_CLASSIC_BOT_PRIVATE_API parameter in .env - see updated .env-example!");
		await sleep(60000);
	}
	if (!process.env.USE_API) {
		console.log("Missing USE_API parameter in .env - see updated .env-example!");
		await sleep(60000);
	}
	if (!process.env.API_URL || (process.env.USE_API === 'true' && !process.env.API_URL.includes('http'))) {
		console.log("Missing API_URL parameter in .env - see updated .env-example!");
		await sleep(60000);
	}
	
	if (process.env.USE_API === 'true' && process.env.USE_CLASSIC_BOT_PRIVATE_API === 'true') {
		console.log('Please only set USE_API or USE_CLASSIC_BOT_PRIVATE_API to true');
		await sleep(60000);
	}
	
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Close popups by Jones
async function closePopups(page) {
	if (await clickOnElement(page, '.close', 4000) ) return;
	await clickOnElement(page, '.modal-close-new', 1000);
}

// await loading circle by Jones
async function waitUntilLoaded(page) {
	try {
        await page.waitForSelector('.loading', { timeout: 6000 })
            .then(() => {
				console.log('Waiting until page is loaded...' + process.env.ACCUSERNAME);
			});
    } catch (e) {
        console.info('No loading circle...')
		return;
    }
	
	await page.waitForFunction(() => !document.querySelector('.loading'), { timeout: 120000 });
}

async function clickMenuFightButton(page) {
	try {
        await page.waitForSelector('#menu_item_battle', { timeout: 6000 })
            .then(button => button.click());
    } catch (e) {
        console.info('fight button not found')
    }
	
}

// LOAD MY CARDS
async function getCards() {
    const myCards = await user.getPlayerCards(process.env.ACCUSERNAME.split('@')[0]) //split to prevent email use
    return myCards;
} 

async function getQuest() {
    return quests.getPlayerQuest(process.env.ACCUSERNAME.split('@')[0])
        .then(x=>x)
        .catch(e=>console.log('No quest data, splinterlands API didnt respond, or you are wrongly using the email and password instead of username and posting key' +process.env.ACCUSERNAME))
}

async function createBrowsers(count, headless) {
	let browsers = [];
	for (let i = 0; i < count; i++) {
		const proxyacc=process.env['PROXY_ACCOUNT'].toLowerCase();
		
		if(proxyacc != "default"){
			const ROUTER_PROXY = `--proxy-server=http=${proxyacc}`;
	
			var browser = await puppeteer.launch({
				args: [ ROUTER_PROXY,'--ignore-certificate-errors','--ignore-certificate-errors-spki-list ' ],
				headless: headless
			  });
		}
		else{
			var browser = await puppeteer.launch({
				headless: headless,
			});

		}

		const page = await browser.newPage();

		await page.setDefaultNavigationTimeout(500000);
		await page.on('dialog', async dialog => {
			await dialog.accept();
		});
		

		browsers[i] = browser;
	}
	
	return browsers;
}

async function getElementText(page, selector, timeout=20000) {
	const element = await page.waitForSelector(selector,  { timeout: timeout });
	const text = await element.evaluate(el => el.textContent);
	return text;
}

async function clickOnElement(page, selector, timeout=20000, delayBeforeClicking = 0) {
	try {
        const elem = await page.waitForSelector(selector, { timeout: timeout });
		if(elem) {
			await sleep(delayBeforeClicking);
			console.log('Clicking element', selector);
			await elem.click();
			return true;
		}
    } catch (e) {
    }
	console.log('Error: Could not find element', selector);
	return false;
}

async function selectCorrectBattleType(page) {
	try {
		await page.waitForSelector("#battle_category_type", { timeout: 20000 })
		let battleType = (await page.$eval('#battle_category_type', el => el.innerText)).trim();
		while (battleType !== "RANKED") {
			console.log("Wrong battleType! battleType is", battleType, "Trying to change it");
			try {
				await page.waitForSelector('#right_slider_btn', { timeout: 500 })
					.then(button => button.click());
			} catch (e) {
				console.info('Slider button not found', e)
			}
			await page.waitForTimeout(1000);
			battleType = (await page.$eval('#battle_category_type', el => el.innerText)).trim();
		}
	} catch (error) {
		console.log("Error: couldn't find battle category type", error);
	}
}

async function startBotPlayMatch(page, myCards, quest, claimQuestReward, prioritizeQuest, useAPI) {
    
    console.log( new Date().toLocaleString())
    if(myCards) {
        console.log(process.env.ACCUSERNAME, ' deck size: '+myCards.length)
    } else {
        console.log(process.env.EMAIL, ' playing only basic cards')
    }
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    await page.setViewport({
        width: 1800,
        height: 1500,
        deviceScaleFactor: 1,
    });

    await page.goto('https://splinterlands.com/?p=battle_history');
    await page.waitForTimeout(8000);

    let item = await page.waitForSelector('#log_in_button > button', {
        visible: true,
      })
      .then(res => res)
      .catch(()=> console.log('Already logged in' + process.env.EMAIL))

    if (item != undefined)
    {console.log('Login ' + process.env.EMAIL)
        await splinterlandsPage.login(page).catch(e=>{
            console.log(e);
            throw new Error('Login Error' + process.env.ACCUSERNAME);
        });
    }
	
	await waitUntilLoaded(page);
	await page.waitForTimeout(2000);
    await closePopups(page);
	await page.waitForTimeout(4000);
	if (!page.url().includes("battle_history")) {
		await clickMenuFightButton(page);
		await page.waitForTimeout(3000);
	}

    //check if season reward is available
    if (process.env.CLAIM_SEASON_REWARD === 'true') {
        try {
            await page.waitForSelector('#claim-btn', { visible:true, timeout: 3000 })
            .then(async (button) => {
                button.click();
                console.log(`claiming the season reward. you can check them here https://peakmonsters.com/@${process.env.ACCUSERNAME}/explorer`);
                await page.waitForTimeout(20000);
            })
            .catch(()=>console.log('no season reward to be claimed, but you can still check your data here https://peakmonsters.com/@${process.env.ACCUSERNAME}/explorer'));
        }
        catch (e) {
            console.info('no season reward to be claimed')
        }
    }

    //if quest done claim reward
    console.log('Quest details: '+ quest + process.env.ACCUSERNAME);
	if (claimQuestReward) {
		try {
			await page.waitForSelector('#quest_claim_btn', { timeout: 5000 })
				.then(button => button.click());
		} catch (e) {
			console.info('no quest reward to be claimed waiting for the battle...')
		}

		await page.waitForTimeout(1000);
	}

	if (!page.url().includes("battle_history")) {
		console.log("Seems like battle button menu didn't get clicked correctly - try again");
		console.log('Clicking fight menu button again');
		await clickMenuFightButton(page);
		await page.waitForTimeout(5000);
	}

    // LAUNCH the battle
    try {
        console.log('waiting for battle button...')
		await selectCorrectBattleType(page);
		
        await page.waitForXPath("//button[contains(., 'BATTLE')]", { timeout: 10000 })
            .then(button => {
				console.log('Battle button clicked'+ process.env.ACCUSERNAME); button.click()
				})
            .catch(e=>console.error('[ERROR] waiting for Battle button. is Splinterlands in maintenance?'));
        await page.waitForTimeout(5000);

        console.log('waiting for an opponent...')
        await page.waitForSelector('.btn--create-team', { timeout: 25000 })
            .then(()=>console.log('start the match' + process.env.ACCUSERNAME))
            .catch(async (e)=> {
            console.error('[Error while waiting for battle]');
			console.log('Clicking fight menu button again' + process.env.ACCUSERNAME);
			await clickMenuFightButton(page);
            console.error('Refreshing the page and retrying to retrieve a battle');
            await page.waitForTimeout(5000);
            await page.reload();
            await page.waitForTimeout(5000);
            await page.waitForSelector('.btn--create-team', { timeout: 50000 })
                .then(()=>console.log('start the match' + process.env.ACCUSERNAME))
                .catch(async ()=>{
                    console.log('second attempt failed reloading from homepage...' + process.env.ACCUSERNAME);
                    await page.goto('https://splinterlands.io/');
                    await page.waitForTimeout(5000);
                    await page.waitForXPath("//button[contains(., 'BATTLE')]", { timeout: 20000 })
                        .then(button => button.click())
                        .catch(e=>console.error('[ERROR] waiting for Battle button second time'));
                    await page.waitForTimeout(5000);
                    await page.waitForSelector('.btn--create-team', { timeout: 25000 })
                        .then(()=>console.log('start the match' + process.env.ACCUSERNAME))
                        .catch((e)=>{
                            console.log('third attempt failed');
                            throw new Error(e);})
                        })
        })
    } catch(e) {
        console.error('[Battle cannot start]:', e)
        throw new Error('The Battle cannot start' + process.env.ACCUSERNAME);

    }
    await page.waitForTimeout(10000);
    let [mana, rules, splinters] = await Promise.all([
        splinterlandsPage.checkMatchMana(page).then((mana) => mana).catch(() => 'no mana'),
        splinterlandsPage.checkMatchRules(page).then((rulesArray) => rulesArray).catch(() => 'no rules'),
        splinterlandsPage.checkMatchActiveSplinters(page).then((splinters) => splinters).catch(() => 'no splinters')
    ]);

    const matchDetails = {
        mana: mana,
        rules: rules,
        splinters: splinters,
        myCards: myCards,
		quest: prioritizeQuest ? quest : '',
    }
	console.log("matchDetails "+process.env.ACCUSERNAME+ ":"+matchDetails);
    await page.waitForTimeout(2000);   
    //TEAM SELECTION
    let teamToPlay;
	if (useAPI) {
		const apiResponse = await api.getPossibleTeams(matchDetails);
		if (apiResponse) {
			console.log('API Response', apiResponse);
		
			teamToPlay = { summoner: Object.values(apiResponse)[1], cards: [ Object.values(apiResponse)[1], Object.values(apiResponse)[3], Object.values(apiResponse)[5], Object.values(apiResponse)[7], Object.values(apiResponse)[9], 
							Object.values(apiResponse)[11], Object.values(apiResponse)[13], Object.values(apiResponse)[15] ] };
							
			console.log('api team', teamToPlay);
			// TEMP, testing
			// if (Object.values(apiResponse)[1] == '') {
			// 	console.log('Seems like the API found no possible team - using local history');
			// 	const possibleTeams = await ask.possibleTeams(matchDetails).catch(e=>console.log('Error from possible team API call: ',e));
			// 	teamToPlay = await ask.teamSelection(possibleTeams, matchDetails, quest);
			// }
		}
		else {
			console.log('API failed, using local history with most cards used tactic' + process.env.ACCUSERNAME);
			const possibleTeams = await ask.possibleTeams(matchDetails).catch(e=>console.log('Error from possible team API call: ',e));
	
			if (possibleTeams && possibleTeams.length) {
				//console.log('Possible Teams based on your cards: ', possibleTeams.length, '\n', possibleTeams);
			} else {
				console.log('Error:', matchDetails, possibleTeams)
				throw new Error('NO TEAMS available to be played');
			}
			teamToPlay = await ask.teamSelection(possibleTeams, matchDetails, quest);
			useAPI = false;
		}
	} else {
		const possibleTeams = await ask.possibleTeams(matchDetails).catch(e=>console.log('Error from possible team API call: ',e));
		if (possibleTeams && possibleTeams.length) {
			//console.log('Possible Teams based on your cards: ', possibleTeams.length, '\n', possibleTeams);
		} else {
			console.log('Error:', matchDetails, possibleTeams)
			throw new Error('NO TEAMS available to be played');
		}
		teamToPlay = await ask.teamSelection(possibleTeams, matchDetails, quest);
		useAPI = false;
	}

    if (teamToPlay) {
        page.click('.btn--create-team')[0];
    } else {
        throw new Error('Team Selection error');
    }
    await page.waitForTimeout(5000);
    try {
        await page.waitForXPath(`//div[@card_detail_id="${teamToPlay.summoner}"]`, { timeout: 10000 }).then(summonerButton => summonerButton.click());
        if (card.color(teamToPlay.cards[0]) === 'Gold') {
			console.log('Dragon play TEAMCOLOR', helper.teamActualSplinterToPlay(teamToPlay.cards.slice(0, 6)))
            await page.waitForXPath(`//div[@data-original-title="${helper.teamActualSplinterToPlay(teamToPlay.cards.slice(0, 6))}"]`, { timeout: 8000 })
                .then(selector => selector.click())
        }
        await page.waitForTimeout(5000);
        for (i = 1; i <= 6; i++) {
            // console.log('play: ', teamToPlay.cards[i].toString())
			await teamToPlay.cards[i] ? page.waitForXPath(`//div[@card_detail_id="${teamToPlay.cards[i].toString()}"]`, { timeout: 10000 })
                .then(selector => selector.click()) : console.log(' ');
            await page.waitForTimeout(1000);
        }

        await page.waitForTimeout(5000);
        try {
            await page.click('.btn-green')[0]; //start fight
        } catch {
            console.log('Start Fight didnt work, waiting 5 sec and retry' + process.env.ACCUSERNAME);
            await page.waitForTimeout(5000);
            await page.click('.btn-green')[0]; //start fight
        }
        await page.waitForTimeout(5000);
        await page.waitForSelector('#btnRumble', { timeout: 90000 }).then(()=>console.log('btnRumble visible' + process.env.ACCUSERNAME)).catch(()=>console.log('btnRumble not visible' + process.env.ACCUSERNAME));
        await page.waitForTimeout(5000);
        await page.$eval('#btnRumble', elem => elem.click()).then(()=>console.log('btnRumble clicked'+ process.env.ACCUSERNAME)).catch(()=>console.log('btnRumble didnt click' + process.env.ACCUSERNAME)); //start rumble
        await page.waitForSelector('#btnSkip', { timeout: 10000 }).then(()=>console.log('btnSkip visible'+ process.env.ACCUSERNAME)).catch(()=>console.log('btnSkip not visible'+process.env.ACCUSERNAME));
        await page.$eval('#btnSkip', elem => elem.click()).then(()=>console.log('btnSkip clicked' + process.env.ACCUSERNAME)).catch(()=>console.log('btnSkip not visible' + process.env.ACCUSERNAME)); //skip rumble
		
		var checkSendBalance=true;
		if(checkSendBalance){
			await sendDECBalance(page);
		}

    } catch (e) {
        throw new Error(e);
    }


}
async function runThread(keepBrowserOpen, browsers, headless, claimQuestReward, prioritizeQuest, useAPI,accounts,i){
	if (keepBrowserOpen && browsers.length == 0) {
		console.log('Opening browsers ' + process.env.ACCUSERNAME);
		browsers = await createBrowsers(accounts.length, headless);
	} else if (!keepBrowserOpen) { // close browser, only have 1 instance at a time
		console.log('Opening browser ' + process.env.ACCUSERNAME);
		browsers = await createBrowsers(1, headless);
	}
				
	const page = (await (keepBrowserOpen ? browsers[i] : browsers[0]).pages())[1];
	
	//page.goto('https://splinterlands.io/');
	// console.log('getting user cards collection from splinterlands API...')
	const myCards = await getCards()
		.then((x)=>{console.log('cards retrieved' + process.env.ACCUSERNAME); return x})
		.catch(()=>console.log('cards collection api didnt respond. Did you use username? avoid email!'));
	console.log('getting user quest info from splinterlands API...');
	const quest = await getQuest();
	if(!quest) {
		console.log('Error for quest details. Splinterlands API didnt work or you used incorrect username')
	}
	await startBotPlayMatch(page, myCards, quest, claimQuestReward, prioritizeQuest, useAPI)
		.then(() => {
			console.log('Closing battle'+ new Date().toLocaleString() + process.env.ACCUSERNAME);        
		})
		.catch((e) => {
			console.log(e)
		})
	
	await page.waitForTimeout(5000);
	var writeFile=JSON.parse(process.env.WRITE_FILE.toLowerCase());
	if(writeFile){
		await getBattleHistory(process.env['EMAIL'].split('@')[0])
		.then((x)=>{
			const data = JSON.stringify(x);
				// write file to disk
				fs.writeFile('./data/user '+process.env['EMAIL'].split('@')[0]+ '.json', data, 'utf8', (err) => {

					if (err) {
						console.log(`Error writing file: ${err}`);
					} else {
						console.log(`File is written successfully! ` + process.env.ACCUSERNAME);
					}

				});
			})
	}
	await page.waitForTimeout(10000);


	if (keepBrowserOpen) {
		await page.goto('about:blank');	
	} else {
		await browsers[0].close();
	}

}
async function sendDECBalance(page) {
	// const proxyne='134.122.127.36:8080';

	// const ROUTER_PROXY = `--proxy-server=http=${proxyne}`;

	// const browser = await puppeteer.launch({
	// 	args: [ ROUTER_PROXY,'--ignore-certificate-errors','--ignore-certificate-errors-spki-list ' ],
	// 	headless: false
	//   });

	// const page = await browser.newPage();

	// await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    // await page.setViewport({
    //     width: 1800,
    //     height: 1500,
    //     deviceScaleFactor: 1,
    // });

    // await page.goto('https://splinterlands.com/?p=battle_history');
    // await page.waitForTimeout(4000);

    // let item = await page.waitForSelector('#log_in_button > button', {
    //     visible: true,
    //   })
    //   .then(res => res)
    //   .catch(()=> console.log('Already logged in'))

    // if (item != undefined)
    // {console.log('Login')
    //     await splinterlandsPage.login(page).catch(e=>{
    //         console.log(e);
    //         throw new Error('Login Error');
    //     });
    // }
	// const datas = await useProxy.lookup(page);
	// 	console.log("dataip ne"+datas.ip);
	// await waitUntilLoaded(page);
	// await page.waitForTimeout(1000);
    // await closePopups(page);
	
	await page.waitForTimeout(5000);
	await page.goto('https://splinterlands.com/?p=battle_history');
    await page.waitForTimeout(4000);

	await page.evaluate(() => {
        document.querySelectorAll('body > div.container > nav > div.navbar-header > div > div.dec-container > div.balance')[0].click();
    });

	await page.waitForTimeout(5000);
	const element = await page.$("#total_balance");
    const decBalance = await page.evaluate(element => element.textContent, element);
	console.log("Balance DEC  "+ process.env.ACCUSERNAME +":"+decBalance);
	
	if(parseInt(decBalance) > parseInt(process.env.MAXIMUM_DEC)){
		// console.log("Vao balance");
		await page.waitForTimeout(2000);
		await page.waitForSelector('#dec_amount').then(() => page.focus('#dec_amount')).then(() => page.type('#dec_amount',parseInt(decBalance).toString()))
		// console.log("get info balance",parseInt(decBalance).toString());
		await page.waitForTimeout(2000);
		await page.waitForSelector('#dec_wallet_type').then(() => page.focus('#dec_wallet_type')).then(() =>  page.select("select#dec_wallet_type", "player"))
	
		await page.waitForTimeout(2000);
		await page.waitForSelector('#playerNameInputGroup > div > input').then(() => page.focus('#playerNameInputGroup > div > input')).then(() =>  page.type('#playerNameInputGroup > div > input', process.env.DEC_PLAYER.toString())) 
		
		await page.waitForTimeout(2000);
		await page.waitForSelector('#transfer_out_btn').then(() => page.click('#transfer_out_btn'))
	
		await page.waitForTimeout(2000);
	
		await page.on('dialog', async dialog => {
			await dialog.accept();
		  });
		
		  await page.waitForTimeout(5000);
		//   await page.screenshot({ path: './data/buddy-screenshot.png' })

	}
}


async function getBattleHistory(player) {
    const battleHistory = await fetch('https://api.splinterlands.io/players/details?name=' + player)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response;
        })
        .then((battleHistory) => {
            return battleHistory.json();
        })
        .catch((error) => {
            console.error('There has been a problem with your fetch operation:', error);
        });
    return battleHistory;
}

// 30 MINUTES INTERVAL BETWEEN EACH MATCH (if not specified in the .env file)
const sleepingTimeInMinutes = process.env.MINUTES_BATTLES_INTERVAL || 30;
const sleepingTime = sleepingTimeInMinutes * 60000;

let forks = numCPUs; 
(async () => {
	try {
		// await checkForUpdate();
		await checkForMissingConfigs();
		const loginViaEmail = JSON.parse(process.env.LOGIN_VIA_EMAIL.toLowerCase());
		const accountusers = process.env.ACCUSERNAME.split(',');
		const proxyaccs = process.env.PROXY_ACCOUNT.split(',');
		const accounts = loginViaEmail ? process.env.EMAIL.split(',') : accountusers;
		const passwords = process.env.PASSWORD.split(',');
		const headless = JSON.parse(process.env.HEADLESS.toLowerCase());
		const useAPI = JSON.parse(process.env.USE_API.toLowerCase());
		const keepBrowserOpen = JSON.parse(process.env.KEEP_BROWSER_OPEN.toLowerCase());
		const claimQuestReward = JSON.parse(process.env.CLAIM_QUEST_REWARD.toLowerCase());
		const prioritizeQuest = JSON.parse(process.env.QUEST_PRIORITY.toLowerCase());
		let browsers = [];
		console.log('Headless', headless);
		console.log('Keep Browser Open', keepBrowserOpen);
		console.log('Login via Email', loginViaEmail);
		console.log('Claim Quest Reward', claimQuestReward);
		console.log('Prioritize Quests', prioritizeQuest);
		console.log('Use API', useAPI);
		console.log('Loaded', accounts.length, ' Accounts')
		console.log('START ', accounts, new Date().toLocaleString())

		// edit by jones, neues while true

		
		console.log("NUBMER OF CORE: ",forks);
		while (true) {
			// var checkNumberThread=0;
			for (let i = 0; i < accounts.length; i++) {
				try {
					process.env['EMAIL'] = accounts[i];
					process.env['PASSWORD'] = passwords[i];
					process.env['ACCUSERNAME'] = accountusers[i];
					process.env['PROXY_ACCOUNT'] = proxyaccs[i];

					console.log('EMAIL THREAD ',process.env['EMAIL'] )
					console.log('PROXY THREAD',process.env['PROXY_ACCOUNT'] )

					if (cluster.isMaster) {
						// for (let j = 0; j < parseInt(process.env.THREAD_NUM); j++) {
							let worker=cluster.fork();
							console.log(`Thread ${worker.id} is started.`);
						// }
					} else {
						await runThread(keepBrowserOpen,browsers,headless,claimQuestReward,prioritizeQuest,useAPI,accounts,i);
					}
				} catch (error) {
					console.log("error thread " +process.env['EMAIL']+" : " +error);
				}
				
				// checkNumberThread=0;
			}
			await console.log('Waiting for the next battle in', sleepingTime / 1000 / 60 , ' minutes at ', new Date(Date.now() +sleepingTime).toLocaleString() );
			await console.log('Join the telegram group https://t.me/ultimatesplinterlandsbot and discord https://discord.gg/hwSr7KNGs9');
			await new Promise(r => setTimeout(r, sleepingTime));
		}
	} catch (e) {
		console.log('Routine error at: ', new Date().toLocaleString(), e)
	}
})();