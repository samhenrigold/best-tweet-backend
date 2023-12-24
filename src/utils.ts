import { SupabaseClient } from '@supabase/supabase-js';

// Environment Variable Validation
export function validateEnv() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        throw new Error("Missing necessary environment variables: SUPABASE_URL or SUPABASE_ANON_KEY");
    }
}

// Retrieve Matchup Data
export async function getMatchup(supabase: SupabaseClient, isDebug: boolean) {
    if (!isDebug) {
        let { data: matchup, error } = await supabase
            .from('matchups')
            .insert({})
            .select(`
                matchup_id,
                tweet_1:tweet_id1_str(*, tweet_media(*), users(*), in_reply_to_status_id(*, tweet_media(*))),
                tweet_2:tweet_id2_str(*, tweet_media(*), users(*), in_reply_to_status_id(*, tweet_media(*)))
            `);

        if (error || !matchup) {
            throw new Error(`Error retrieving matchup: ${error?.message}`);
        }

        return matchup;
    } else {
        let { data: matchup, error } = await supabase
            .from('matchups')
            .select(`
                matchup_id,
                tweet_1:tweet_id1_str(*, tweet_media(*), users(*), in_reply_to_status_id(*, tweet_media(*))),
                tweet_2:tweet_id2_str(*, tweet_media(*), users(*), in_reply_to_status_id(*, tweet_media(*)))
            `)
            .limit(1);

        if (error || !matchup) {
            throw new Error(`Error retrieving matchup: ${error?.message}`);
        }

        return matchup[0];
    }
}

// Cast Ballot
export async function castBallot(supabase: SupabaseClient, voteData: any, userIp: string) {
    // Validate if the selected_tweet_id exists in the tweets table
    let { data: tweetExists, error: tweetError } = await supabase
        .from('matchups')
        .select('tweet_id1_str, tweet_id2_str')
        .eq('matchup_id', voteData.matchup_id);

    console.log(tweetExists);

    if (tweetError || !tweetExists) {
        throw new Error(tweetError?.message);
    }

    let exists = tweetExists.some(tweet => 
        tweet.tweet_id1_str == String(voteData.selected_tweet_id) || 
        tweet.tweet_id2_str == String(voteData.selected_tweet_id)
    );

    if (!exists) {
        throw new Error('Selected tweet does not exist in the matchup. Make sure you’re using the `tweet_id_str` and not `tweet_id` — JS is doing some weird stuff with large numbers.');
    }

    const { data: vote, error: voteError } = await supabase
        .from('votes')
        .insert({
            matchup_id: voteData.matchup_id,
            selected_tweet_id_str: voteData.selected_tweet_id,
            user_ip: userIp
        })
        .select();

    if (voteError || !vote) {
        throw new Error(voteError?.message);
    }

    return vote;
}
