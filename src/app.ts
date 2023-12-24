import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import type { Database } from './database';

dotenv.config();

const app = express();
const port = 3000;

app.get('/get-matchups', async (req: Request, res: Response) => {
	const supabase = createClient<Database>(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

	let { data: matchup, error: matchupError } = await supabase
		.from('matchups')
		// .insert({})
		.select(`
		matchup_id,
		tweet_1:tweet_id1(*, tweet_media(*), in_reply_to_status_id(*, tweet_media(*))),
		tweet_2:tweet_id2(*, tweet_media(*), in_reply_to_status_id(*, tweet_media(*)))
	`)

	if (matchupError || !matchup) throw new Error(`Error creating matchup: ${matchupError?.message}`);

	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(matchup));
});

app.listen(port, () => {
	return console.log(`Express is listening at http://localhost:${port}`);
});