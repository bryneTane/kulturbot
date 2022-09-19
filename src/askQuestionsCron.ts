import { ScheduledHandler } from "aws-lambda";
import { format } from "date-fns";
import { TwitterApi } from "twitter-api-v2";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
  updateDoc,
} from "firebase/firestore";

const APP_URL = "https://kulturbot.app";

const questionsRef = collection(db, "questions");

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_CONSUMER_KEY as string,
  appSecret: process.env.TWITTER_CONSUMER_SECRET as string,
  accessToken: process.env.TWITTER_ACCESS_TOKEN_KEY as string,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string,
});

export const handler: ScheduledHandler = async () => {
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
};
