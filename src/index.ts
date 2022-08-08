import dotenv from "dotenv";
import { format, isBefore } from "date-fns";
import { TweetV2, TwitterApi } from "twitter-api-v2";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
  updateDoc,
} from "firebase/firestore";
import schedule from "node-schedule";

dotenv.config();

const APP_URL = "https://hostme.space";

const questionsRef = collection(db, "questions");

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY as string,
  appSecret: process.env.TWITTER_CONSUMER_SECRET as string,
  accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY as string,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string,
});

function processString(str: string) {
  return str.toLowerCase().trim();
}

async function main() {
  schedule.scheduleJob({ hour: 20, minute: 30 }, async () => {
    const q = query(
      questionsRef,
      where(
        "date",
        "==",
        format(new Date(Timestamp.now().toMillis()), "yyyy-MM-dd")
      )
    );

    const questions = await getDocs(q);
    if (!questions?.docs?.length) {
      const message = `Aucune question n'a été proposée pour ce aujourd'hui 🥺\nRendez vous demain ! N'hésite pas à proposer tes questions sur ${APP_URL} 😁`;
      await twitterClient.v1.tweet(message);
    } else {
      for (const question of questions.docs) {
        const data = question.data();
        const message = `${data.question}\n1) ${data.prop1}\n2) ${data.prop2}\n3) ${data.prop3}\n4) ${data.prop4}`;
        const tweets = await twitterClient.v1.tweetThread([
          message,
          `Proposé par @${data.username}`,
        ]);
        await updateDoc(question.ref, {
          tweetId: tweets[0].id_str,
        });
      }
    }
  });

  schedule.scheduleJob({ hour: 21, minute: 30 }, async () => {
    const messages = [];
    let winners = "";
    const q = query(
      questionsRef,
      where(
        "date",
        "==",
        format(new Date(Timestamp.now().toMillis()), "yyyy-MM-dd")
      )
    );

    const questions = await getDocs(q);
    if (questions?.docs?.length > 0) {
      for (const question of questions.docs) {
        const data = question.data();
        const quotes = await twitterClient.v2.quotes(data.tweetId, {
          expansions: ["author_id"],
          "user.fields": ["username"],
          "tweet.fields": ["author_id", "created_at", "text"],
        });
        const sortedQuotes = quotes?.data?.data
          ?.filter(
            (quote: TweetV2) =>
              processString(quote.text.split(" ")[0]) ===
                processString(`${data.answer}`) &&
              typeof quote.created_at !== "undefined"
          )
          .sort((a: TweetV2, b: TweetV2) =>
            isBefore(
              //@ts-ignore
              new Date(a.created_at),
              //@ts-ignore
              new Date(b.created_at)
            )
              ? -1
              : 1
          );
        let winner = undefined;
        if (sortedQuotes?.length > 0) {
          winner = quotes.includes.author(sortedQuotes?.[0]);
          console.log(winner?.username);
          winners += `- @${winner?.username}\n`;
        }
        messages.push(
          `${winner ? `@${winner?.username}😏\n` : ""}Question : ${
            data.question
          }\nRéponse enregistrée par @${data.username} : ${
            data[`prop${data.answer}`]
          }\n\n Tout le monde est d'accord ? 🤔`
        );
      }
      await twitterClient.v2.tweetThread([
        `🎉🎉 C'est l'heure des résultats ! 🎉🎉\n Les gagnants sont :\n\n ${winners}`,
        ...messages,
      ]);
    }
  });
}

main().catch((err) => console.log(err));
