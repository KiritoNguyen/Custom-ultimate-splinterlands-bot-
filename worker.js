//'use strict';
require('dotenv').config()
const puppeteer = require('puppeteer');
const fetch = require("node-fetch");

const splinterlandsPage = require('./splinterlandsPage');
const user = require('./user');
const card = require('./cards');
const helper = require('./helper');
const quests = require('./quests');
const ask = require('./possibleTeams');
const api = require('./api');
const version = 0.2;

// const {
//     parentPort,
//     workerData
// } = require("worker_threads")
// const fs = require("fs-extra");
// const firstName = require("./data/first_name.json");
// const middleName = reguire("./data/middle_name.json");
// const lastName = require("./data/last_name.json");
// const {
//     arrNum,
//     arrAcc,
//     arrPass
// } = workerData;
   function checkForUpdate() {
	console.log('-----------------------------------------------------------------------------------------------------');
	  fetch('http://jofri.pf-control.de/prgrms/splnterlnds/version.txt')
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

   function checkForMissingConfigs() {
	if (!process.env.LOGIN_VIA_EMAIL) {
		console.log("Missing LOGIN_VIA_EMAIL parameter in .env - see updated .env-example!");
		  sleep(60000);
	}
	if (!process.env.HEADLESS) {
		console.log("Missing HEADLESS parameter in .env - see updated .env-example!");
		  sleep(60000);
	}
	if (!process.env.KEEP_BROWSER_OPEN) {
		console.log("Missing KEEP_BROWSER_OPEN parameter in .env - see updated .env-example!");
		  sleep(60000);
	}
	if (!process.env.CLAIM_QUEST_REWARD) {
		console.log("Missing CLAIM_QUEST_REWARD parameter in .env - see updated .env-example!");
		  sleep(60000);
	}
	if (!process.env.USE_CLASSIC_BOT_PRIVATE_API) {
		console.log("Missing USE_CLASSIC_BOT_PRIVATE_API parameter in .env - see updated .env-example!");
		  sleep(60000);
	}
	if (!process.env.USE_API) {
		console.log("Missing USE_API parameter in .env - see updated .env-example!");
		  sleep(60000);
	}
	if (!process.env.API_URL || (process.env.USE_API === 'true' && !process.env.API_URL.includes('http'))) {
		console.log("Missing API_URL parameter in .env - see updated .env-example!");
		  sleep(60000);
	}
	
	if (process.env.USE_API === 'true' && process.env.USE_CLASSIC_BOT_PRIVATE_API === 'true') {
		console.log('Please only set USE_API or USE_CLASSIC_BOT_PRIVATE_API to true');
		  sleep(60000);
	}
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Close popups by Jones
   function closePopups(page) {
	if (  clickOnElement(page, '.close', 4000) ) return;
	  clickOnElement(page, '.modal-close-new', 1000);
}

//   loading circle by Jones
   function waitUntilLoaded(page) {
	try {
          page.waitForSelector('.loading', { timeout: 6000 })
            .then(() => {
				console.log('Waiting until page is loaded...');
			});
    } catch (e) {
        console.info('No loading circle...')
		return;
    }
	
	  page.waitForFunction(() => !document.querySelector('.loading'), { timeout: 120000 });
}

   function clickMenuFightButton(page) {
	try {
          page.waitForSelector('#menu_item_battle', { timeout: 6000 })
            .then(button => button.click());
    } catch (e) {
        console.info('fight button not found')
    }
	
}

// LOAD MY CARDS
   function getCards() {
    const myCards =   user.getPlayerCards(process.env.ACCUSERNAME.split('@')[0]) //split to prevent email use
    return myCards;
} 

   function getQuest() {
    return quests.getPlayerQuest(process.env.ACCUSERNAME.split('@')[0])
        .then(x=>x)
        .catch(e=>console.log('No quest data, splinterlands API didnt respond, or you are wrongly using the email and password instead of username and posting key'))
}

   function createBrowsers(count, headless) {
	let browsers = [];
	for (let i = 0; i < count; i++) {
		const browser =   puppeteer.launch({
			headless: headless,
		});
		const page =   browser.newPage();
		  page.setDefaultNavigationTimeout(500000);
		  page.on('dialog',    dialog => {
			  dialog.accept();
		});
		
		browsers[i] = browser;
	}
	
	return browsers;
}

   function clickOnElement(page, selector, timeout=20000, delayBeforeClicking = 0) {
	try {
        const elem =   page.waitForSelector(selector, { timeout: timeout });
		if(elem) {
			  sleep(delayBeforeClicking);
			console.log('Clicking element', selector);
			  elem.click();
			return true;
		}
    } catch (e) {
    }
	console.log('Error: Could not find element', selector);
	return false;
}

   function selectCorrectBattleType(page) {
	try {
		  page.waitForSelector("#battle_category_type", { timeout: 20000 })
		let battleType = (  page.$eval('#battle_category_type', el => el.innerText)).trim();
		while (battleType !== "RANKED") {
			console.log("Wrong battleType! battleType is", battleType, "Trying to change it");
			try {
				  page.waitForSelector('#right_slider_btn', { timeout: 500 })
					.then(button => button.click());
			} catch (e) {
				console.info('Slider button not found', e)
			}
			  page.waitForTimeout(1000);
			battleType = (  page.$eval('#battle_category_type', el => el.innerText)).trim();
		}
	} catch (error) {
		console.log("Error: couldn't find battle category type", error);
	}
}

   function startBotPlayMatch(page, myCards, quest, claimQuestReward, prioritizeQuest, useAPI) {
    
    console.log( new Date().toLocaleString())
    if(myCards) {
        console.log(process.env.ACCUSERNAME, ' deck size: '+myCards.length)
    } else {
        console.log(process.env.EMAIL, ' playing only basic cards')
    }
      page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
      page.setViewport({
        width: 1800,
        height: 1500,
        deviceScaleFactor: 1,
    });

      page.goto('https://splinterlands.io/');
      page.waitForTimeout(4000);

    let item =   page.waitForSelector('#log_in_button > button', {
        visible: true,
      })
      .then(res => res)
      .catch(()=> console.log('Already logged in'))

    if (item != undefined)
    {console.log('Login')
          splinterlandsPage.login(page).catch(e=>{
            console.log(e);
            throw new Error('Login Error');
        });
    }
	
	  waitUntilLoaded(page);
	  page.waitForTimeout(1000);
      closePopups(page);
	  page.waitForTimeout(2000);
	  clickMenuFightButton(page);
      page.waitForTimeout(3000);

    //check if season reward is available
    if (process.env.CLAIM_SEASON_REWARD === 'true') {
        try {
            console.log('Season reward check: ');
              page.waitForSelector('#claim-btn', { visible:true, timeout: 3000 })
            .then(   (button) => {
                button.click();
                console.log(`claiming the season reward. you can check them here https://peakmonsters.com/@${process.env.ACCUSERNAME}/explorer`);
                  page.waitForTimeout(20000);
            })
            .catch(()=>console.log('no season reward to be claimed, but you can still check your data here https://peakmonsters.com/@${process.env.ACCUSERNAME}/explorer'));
        }
        catch (e) {
            console.info('no season reward to be claimed')
        }
    }

    //if quest done claim reward
    console.log('Quest details: ', quest);
	if (claimQuestReward) {
		try {
			  page.waitForSelector('#quest_claim_btn', { timeout: 5000 })
				.then(button => button.click());
		} catch (e) {
			console.info('no quest reward to be claimed waiting for the battle...')
		}

		  page.waitForTimeout(1000);
	}

	if (!page.url().includes("battle_history")) {
		console.log("Seems like battle button menu didn't get clicked correctly - try again");
		console.log('Clicking fight menu button again');
		  clickMenuFightButton(page);
		  page.waitForTimeout(5000);
	}

    // LAUNCH the battle
    try {
        console.log('waiting for battle button...')
		  selectCorrectBattleType(page);
		
          page.waitForXPath("//button[contains(., 'BATTLE')]", { timeout: 1000 })
            .then(button => {
				console.log('Battle button clicked'); button.click()
				})
            .catch(e=>console.error('[ERROR] waiting for Battle button. is Splinterlands in maintenance?'));
          page.waitForTimeout(5000);

        console.log('waiting for an opponent...')
          page.waitForSelector('.btn--create-team', { timeout: 25000 })
            .then(()=>console.log('start the match'))
            .catch(   (e)=> {
            console.error('[Error while waiting for battle]');
			console.log('Clicking fight menu button again');
			  clickMenuFightButton(page);
            console.error('Refreshing the page and retrying to retrieve a battle');
              page.waitForTimeout(5000);
              page.reload();
              page.waitForTimeout(5000);
              page.waitForSelector('.btn--create-team', { timeout: 50000 })
                .then(()=>console.log('start the match'))
                .catch(   ()=>{
                    console.log('second attempt failed reloading from homepage...');
                      page.goto('https://splinterlands.io/');
                      page.waitForTimeout(5000);
                      page.waitForXPath("//button[contains(., 'BATTLE')]", { timeout: 20000 })
                        .then(button => button.click())
                        .catch(e=>console.error('[ERROR] waiting for Battle button second time'));
                      page.waitForTimeout(5000);
                      page.waitForSelector('.btn--create-team', { timeout: 25000 })
                        .then(()=>console.log('start the match'))
                        .catch((e)=>{
                            console.log('third attempt failed');
                            throw new Error(e);})
                        })
        })
    } catch(e) {
        console.error('[Battle cannot start]:', e)
        throw new Error('The Battle cannot start');

    }
      page.waitForTimeout(10000);
    let [mana, rules, splinters] =   Promise.all([
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
	
      page.waitForTimeout(2000);   
    //TEAM SELECTION
    let teamToPlay;
	if (useAPI) {
		const apiResponse =   api.getPossibleTeams(matchDetails);
		if (apiResponse) {
			console.log('API Response', apiResponse);
		
			teamToPlay = { summoner: Object.values(apiResponse)[1], cards: [ Object.values(apiResponse)[1], Object.values(apiResponse)[3], Object.values(apiResponse)[5], Object.values(apiResponse)[7], Object.values(apiResponse)[9], 
							Object.values(apiResponse)[11], Object.values(apiResponse)[13], Object.values(apiResponse)[15] ] };
		}
		else {
			console.log('API failed, using local history with most cards used tactic');
			const possibleTeams =   ask.possibleTeams(matchDetails).catch(e=>console.log('Error from possible team API call: ',e));
	
			if (possibleTeams && possibleTeams.length) {
				//console.log('Possible Teams based on your cards: ', possibleTeams.length, '\n', possibleTeams);
				console.log('Possible Teams based on your cards: ', possibleTeams.length);
			} else {
				console.log('Error:', matchDetails, possibleTeams)
				throw new Error('NO TEAMS available to be played');
			}
			teamToPlay =   ask.teamSelection(possibleTeams, matchDetails, quest);
		}
	} else {
		const possibleTeams =   ask.possibleTeams(matchDetails).catch(e=>console.log('Error from possible team API call: ',e));

		if (possibleTeams && possibleTeams.length) {
			//console.log('Possible Teams based on your cards: ', possibleTeams.length, '\n', possibleTeams);
			console.log('Possible Teams based on your cards: ', possibleTeams.length);
		} else {
			console.log('Error:', matchDetails, possibleTeams)
			throw new Error('NO TEAMS available to be played');
		}
		teamToPlay =   ask.teamSelection(possibleTeams, matchDetails, quest);
	}

    if (teamToPlay) {
        page.click('.btn--create-team')[0];
    } else {
        throw new Error('Team Selection error');
    }
      page.waitForTimeout(5000);
    try {
          page.waitForXPath(`//div[@card_detail_id="${teamToPlay.summoner}"]`, { timeout: 10000 }).then(summonerButton => summonerButton.click());
        if (card.color(teamToPlay.cards[0]) === 'Gold') {
			console.log('Dragon play TEAMCOLOR', helper.teamActualSplinterToPlay(teamToPlay.cards.slice(0, 6)))
              page.waitForXPath(`//div[@data-original-title="${helper.teamActualSplinterToPlay(teamToPlay.cards.slice(0, 6))}"]`, { timeout: 8000 })
                .then(selector => selector.click())
        }
          page.waitForTimeout(5000);
        for (i = 1; i <= 7; i++) {
            console.log('play: ', teamToPlay.cards[i].toString())
			  teamToPlay.cards[i] ? page.waitForXPath(`//div[@card_detail_id="${teamToPlay.cards[i].toString()}"]`, { timeout: 10000 })
                .then(selector => selector.click()) : console.log('nocard ', i);
              page.waitForTimeout(1000);
        }

          page.waitForTimeout(5000);
        try {
              page.click('.btn-green')[0]; //start fight
        } catch {
            console.log('Start Fight didnt work, waiting 5 sec and retry');
              page.waitForTimeout(5000);
              page.click('.btn-green')[0]; //start fight
        }
          page.waitForTimeout(5000);
          page.waitForSelector('#btnRumble', { timeout: 90000 }).then(()=>console.log('btnRumble visible')).catch(()=>console.log('btnRumble not visible'));
          page.waitForTimeout(5000);
          page.$eval('#btnRumble', elem => elem.click()).then(()=>console.log('btnRumble clicked')).catch(()=>console.log('btnRumble didnt click')); //start rumble
          page.waitForSelector('#btnSkip', { timeout: 10000 }).then(()=>console.log('btnSkip visible')).catch(()=>console.log('btnSkip not visible'));
          page.$eval('#btnSkip', elem => elem.click()).then(()=>console.log('btnSkip clicked')).catch(()=>console.log('btnSkip not visible')); //skip rumble
		if (useAPI) {
			try {
				const element =   page.waitForSelector('section.player.winner .bio__name__display',  { timeout: 15000 }); // select the element
				const winner =   element.evaluate(el => el.textContent); // grab the textContent from the element, by evaluating this function in the browser context
				if (winner.trim() == process.env.ACCUSERNAME.trim()) {
					console.log('You won!');
				}
				else {
					console.log('You lost :(');
					api.reportLoss(winner);
				}
			} catch {
				console.log('Could not find winner - draw?');
			}
			  clickOnElement(page, '.btn--done', 1000, 2500);
		} else {
			  clickOnElement(page, '.btn--done', 15000, 2500);
		}
    } catch (e) {
        throw new Error(e);
    }
}


~function   () {
    console.log("LUONG CUA ",process.env['EMAIL']);
		const headless = JSON.parse(process.env.HEADLESS.toLowerCase());
		const useAPI = JSON.parse(process.env.USE_API.toLowerCase());
		const keepBrowserOpen = JSON.parse(process.env.KEEP_BROWSER_OPEN.toLowerCase());
		const claimQuestReward = JSON.parse(process.env.CLAIM_QUEST_REWARD.toLowerCase());
		const prioritizeQuest = JSON.parse(process.env.QUEST_PRIORITY.toLowerCase());
		// let browsers = [];

    // if (keepBrowserOpen && browsers.length == 0) {
    //     console.log('Opening browsers');
    //     browsers =   createBrowsers(accounts.length, headless);
    // } else if (!keepBrowserOpen) { // close browser, only have 1 instance at a time
    //     console.log('Opening browser');
    //     browsers =   createBrowsers(1, headless);
    // }
    // browsers =   createBrowsers(1, headless);

    // const page = (  (keepBrowserOpen ? browsers : browsers[0]).pages())[1];
    // const browser =  puppeteer.launch({
    //     headless: true,
    //     args: ['--no-sandbox']
    // }); // default is true
    // const page =  browser.newPage();
    // page.setDefaultNavigationTimeout(500000);
    // page.on('dialog',    dialog => {
    //     dialog.accept();
    // });
    // page.goto('https://splinterlands.io/');

    // const browser =   puppeteer.launch({
    //     headless: headless,
    // });
    // const page =   browser.newPage();
    //   page.setDefaultNavigationTimeout(500000);
    //   page.on('dialog',    dialog => {
    //       dialog.accept();
    // });
    // page.goto('https://splinterlands.io/');

    // if (keepBrowserOpen && browsers.length == 0) {
    //     browsers =  createBrowsers(1, headless);

        
	// 	const page =   browser.newPage();
	// 	  page.setDefaultNavigationTimeout(500000);
	// 	  page.on('dialog',    dialog => {
	// 		  dialog.accept();
	// 	});
    // }

    const browser =  puppeteer.launch({ headless: headless })
    const page =    browser.newPage();
    page.setDefaultNavigationTimeout(500000);
    page.on('dialog',    dialog => {
        dialog.accept();
  });

    // const page =  browsers.pages()[1];

    console.log('getting user cards collection from splinterlands API...')
    const myCards =   getCards()
        .then((x)=>{console.log('cards retrieved'); return x})
        .catch(()=>console.log('cards collection api didnt respond. Did you use username? avoid email!'));
    console.log('getting user quest info from splinterlands API...');
    const quest =   getQuest();
    if(!quest) {
        console.log('Error for quest details. Splinterlands API didnt work or you used incorrect username')
    }
      startBotPlayMatch(page, myCards, quest, claimQuestReward, prioritizeQuest, useAPI)
        .then(() => {
            console.log('Closing battle', new Date().toLocaleString());        
        })
        .catch((e) => {
            console.log(e)
        })
    
      page.waitForTimeout(5000);
    if (keepBrowserOpen) {
          page.goto('about:blank');	
    } else {
        browser.close();
    }

///////////////////////////

}()


