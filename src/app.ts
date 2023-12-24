import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { VoteData } from './VoteData';
import bodyParser, { json } from 'body-parser';

import type { Database } from './database';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const supabase = createClient<Database>(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

function respondWithError(res: Response, error: string, statusCode: number = 500) {
    res.setHeader('Content-Type', 'application/json');
    res.status(statusCode).send(JSON.stringify({ error }));
}

// GET /get-matchup
app.get('/get-matchups', async (req: Request, res: Response) => {
	let { data: matchup, error: matchupError } = await supabase
		.from('matchups')
		.insert({})
		.select(`
			matchup_id,
			tweet_1:tweet_id1_str(*, tweet_media(*), users(*), in_reply_to_status_id(*, tweet_media(*))),
			tweet_2:tweet_id2_str(*, tweet_media(*), users(*), in_reply_to_status_id(*, tweet_media(*)))
	`)

	if (matchupError || !matchup) throw new Error(`Error creating matchup: ${matchupError?.message}`);

	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(matchup));
});

// POST: /cast-ballot. Accepts a JSON body with the VoteData interface.
app.post('/cast-ballot', async (req: Request, res: Response) => {
    const voteData: any = req.body;

	console.log("Received selected_tweet_id:", voteData.selected_tweet_id);

    // Validate if the selected_tweet_id exists in the tweets table
    let { data: tweetExists, error: tweetError } = await supabase
        .from('matchups')
        .select('tweet_id1_str, tweet_id2_str')

    // Check if the selected_tweet_id exists in the matchup
	if (tweetError || !tweetExists) return respondWithError(res, tweetError?.message);
	if (!tweetExists[0].tweet_id1_str.includes(voteData.selected_tweet_id) && !tweetExists[0].tweet_id2_str.includes(voteData.selected_tweet_id)) {
		return respondWithError(res, 'Selected tweet does not exist in the matchup', 400);
	}


	const { data: vote, error: voteError } = await supabase
		.from('votes')
		.insert({
			matchup_id: voteData.matchup_id,
			selected_tweet_id_str: voteData.selected_tweet_id
		} as any)
		.select()

	res.setHeader('Content-Type', 'application/json');
	if (voteError || !vote) {
		if (voteError?.message.includes('duplicate key value')) {
			return respondWithError(res, 'Vote already exists', 409);
		}
		return respondWithError(res, voteError?.message);
	};

	res.send(JSON.stringify(vote));
});

app.listen(port, () => {
	return console.log(`Express is listening at http://localhost:${port}`);
});