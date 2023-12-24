import express, { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { json } from 'body-parser';
import { celebrate, Joi, errors } from 'celebrate';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { getMatchup, castBallot, validateEnv } from './utils'; // Refactored utility functions

dotenv.config();
validateEnv(); // Validate necessary environment variables

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Enable CORS
app.use(helmet()); // Set security headers
app.use(json()); // Body parser
app.use(rateLimit({ // Rate limiting
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
}));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.get('/get-matchups', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const matchup = await getMatchup(supabase);
		res.json(matchup);
	} catch (error) {
		next(error);
	}
});

app.post('/cast-ballot', celebrate({ // Validate input
	body: Joi.object({
		selected_tweet_id: Joi.string().required(),
		matchup_id: Joi.string().required()
	})
}), async (req: Request, res: Response, next: NextFunction) => {
	try {
		const voteData = req.body;
		const vote = await castBallot(supabase, voteData, req.ip);
		res.json(vote);
	} catch (error) {
		next(error);
	}
});

// Celebrate error handler
app.use(errors());

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	console.error(err.stack);
	res.status(500).send({ error: 'Internal Server Error' });
});

app.listen(port, () => {
	console.log(`Express is listening at http://localhost:${port}`);
});