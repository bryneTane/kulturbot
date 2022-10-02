import { ScheduledHandler } from "aws-lambda";
import { TwitterApi } from "twitter-api-v2";

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY as string,
  appSecret: process.env.TWITTER_CONSUMER_SECRET as string,
  accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY as string,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string,
});

const texts = [
  `Hey ! Did you have fun with the last game session ? 😁\n\nSomething to share with your Twitter community ? Some insteresting facts ? 😏\nYou can do it through a game session 🤩\n\nSubmit a question on https://kulturbot.app and let's play !`,
  `Hello ! 🤩\n\n"Dans des conditions de refroidissement similaires, l'eau chaude gèle plus vite que l'eau froide" 🤔\n\nDes faits similaires à partarger ? Rendez-vous sur https://kulturbot.app.\nLet's play !`,
  `Est ce que quelqu'un sait pourquoi  ? Rendez-vous sur https://kulturbot.app.\nLet's play !`,
];

export const handler: ScheduledHandler = async () => {
  await twitterClient.v2.tweetThread([texts[0]]);
};
