const express = require("express");
const app = express();
const router = express.Router();
const path = require('path');

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const axios = require('axios');

function strip(string) {
  return string.replace(/^\s+|\s+$/g, '');
}

async function getDom(url) {
    try {
        const res = await axios.get(url);
        return new JSDOM(res.data).window.document;
    } catch (error) {
        throw new Error("Failed to retrieve page content.");
    }
}

const getAc = async (url) => {
    try {
        const dom = await getDom(url);
        // Similar to your existing processing logic.
        let standing = dom.querySelector('.standings');
        let problemsA = standing.rows[0].querySelectorAll('a');
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
            // Existing team parsing logic
        }

        return {
            'status': 'OK',
            'result': {
                'contest': contest,
                'contestants': data
            },
        };
    } catch (err) {
        return {
            'status': 'FAILED',
            'result': 'There was an error processing the request.',
            'error': err.message
        };
    }
}

router.get('/ac/g/:groupId/c/:contestId/p/:page', async (req, res) => {
    try {
        let { groupId, contestId, page } = req.params;
        const url = `https://codeforces.com/group/${groupId}/contest/${contestId}/standings/page/${page}?showUnofficial=true`;
        const ret = await getAc(url);
        res.status(200).send(ret);
    } catch (error) {
        res.status(500).send({ status: "FAILED", error: error.message });
    }
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

app.use('/ac', router);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'error.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
