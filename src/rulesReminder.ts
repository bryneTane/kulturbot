import { ScheduledHandler } from "aws-lambda";
import { TwitterApi } from "twitter-api-v2";

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY as string,
  appSecret: process.env.TWITTER_CONSUMER_SECRET as string,
  accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY as string,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string,
});

export const handler: ScheduledHandler = async () => {
  await twitterClient.v2.tweetThread([
    `Rappel des règles ! Vous devez citer le tweet contenant la question avec le numéro (UNIQUEMENT le numéro 😅) de la réponse juste !\n\n Let's play ! 😁`,
  ]);
};
