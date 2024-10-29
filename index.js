const express = require("express");
const app = express();
const router = express.Router();
const path = require('path');
const axios = require('axios');
const { JSDOM } = require("jsdom");

// Function to strip extra whitespace
function strip(string) {
    return string.replace(/^\s+|\s+$/g, '');
}

// Function to get the DOM of a webpage
async function getDom(url) {
    return axios.get(url)
        .then((res) => {
            const dom = new JSDOM(res.data);
            return dom.window.document;
        })
        .catch(err => {
            console.error("Error fetching DOM:", err);
            throw err;
        });
}

// Function to get accepted solutions for each contestant
const getAc = async (url) => {
    try {
        const dom = await getDom(url);
        let standing = dom.querySelector('.standings');
        let problemsA = standing.rows.querySelectorAll('a');

        let problems = [];
        for (let problem of problemsA) {
            problems.push({
                'name': problem.title,
                'link': 'https://codeforces.com' + problem.href
            });
        }

        let sheetNameA = dom.querySelector(".contest-name").querySelector('a');
        let contest = {
            'name': strip(sheetNameA.textContent),
            'link': 'https://codeforces.com' + sheetNameA.href,
            'problems': problems
        };

        let data = {};
        for (let i = 1; i < standing.rows.length - 1; i++) {
            let team = 'Not a team', contestants = [];
            let tr = standing.rows[i].querySelectorAll('td'), isTeam = true;
            try {
                trA = tr.querySelector('span').querySelectorAll('a');
                if (!trA.length) isTeam = false;
            } catch {
                isTeam = false;
            }
            if (isTeam && trA.href.includes('team')) { // it's a team
                team = trA['title'];
                for (let k = 1; k < trA.length; k++) {
                    tmp = (trA[k].title.split(' '));
                    contestants.push(tmp[tmp.length - 1]);
                }
            } else { // it's a contestant 
                tmp = (tr.querySelector('a').title.split(' '));
                contestants.push(tmp[tmp.length - 1]);
            }

            let tds = standing.rows[i].querySelectorAll('td');
            for (let i = 4; i < tds.length; i++) {
                let txt = strip(tds[i].querySelector('span').textContent) || '-';
                if (txt == '-') continue;
                for (let j = 0; j < contestants.length; j++) {
                    if (!(contestants[j] in data)) { // new contestant to the data
                        data[contestants[j]] = [];
                    }
                    let pNum = problems[i - 4].name.split(' - ');
                    if (!data[contestants[j]].includes(pNum))
                        data[contestants[j]].push(pNum);
                }
            }
        }

        let keys = Object.keys(data);
        keys.forEach(async (key) => {
            data[key] = {
                ac: data[key].join('-')
            }
        });

        return {
            'status': 'OK',
            'result': {
                'contest': contest,
                'contestants': data
            },
        }
    } catch (err) {
        console.error("Error processing data:", err);
        return {
            'status': 'FAILED',
            'result': 'There is something wrong :(',
            'err': err.message
        }
    }
}

// Routes
router.get('/g/:groupId/c/:contestId/p/:page', async (req, res) => {
    try {
        let { groupId, contestId, page } = req.params;
        let url = `https://codeforces.com/group/${groupId}/contest/${contestId}/standings/page/${page}?showUnofficial=true`
        let ret = await getAc(url);
        res.status(200).send(ret);
    } catch (err) {
        console.error("Error in route /g/:groupId/c/:contestId/p/:page:", err);
        res.status(500).send({ status: 'FAILED', result: 'Internal Server Error' });
    }
});

router.get('/g/:groupId/c/:contestId/p/:page/l/:listId', async (req, res) => {
    try {
        let { groupId, contestId, listId, page } = req.params;
        let url = `https://codeforces.com/group/${groupId}/contest/${contestId}/standings/page/${page}?list=${listId}&showUnofficial=true`
        let ret = await getAc(url);
        res.status(200).send(ret);
    } catch (err) {
        console.error("Error in route /g/:groupId/c/:contestId/p/:page/l/:listId:", err);
        res.status(500).send({ status: 'FAILED', result: 'Internal Server Error' });
    }
});

// Static files and routes
app.use(express.static(__dirname));
app.use('/ac', router);

// Catch-all route for 404
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'error.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error("Internal Server Error:", err);
    res.status(500).send('Internal Server Error');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
