import { ScheduledHandler } from "aws-lambda";
import { format, getDate } from "date-fns";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
  addDoc,
} from "firebase/firestore";
import axios from "axios";

import { decode } from "html-entities";

const questionsRef = collection(db, "questions");

const CATEGORIES = [
  { id: 29, category: "Entertainment: Comics" },
  { id: 9, category: "General Knowledge" },
  // { id: 10, category: "Entertainment: Books" },
  { id: 17, category: "Science & Nature" },
  // { id: 14, category: "Entertainment: Television" },
  { id: 20, category: "Mythology" },
  { id: 19, category: "Science: Mathematics" },
  { id: 15, category: "Entertainment: Video Games" },
  { id: 21, category: "Sports" },
  { id: 16, category: "Entertainment: Board Games" },
  { id: 18, category: "Science: Computers" },
  { id: 22, category: "Geography" },
  { id: 13, category: "Entertainment: Musicals & Theatres" },
  // { id: 23, category: "History" },
  // { id: 24, category: "Politics" },
  { id: 12, category: "Entertainment: Music" },
  { id: 25, category: "Art" },
  { id: 26, category: "Celebrities" },
  { id: 27, category: "Animals" },
  { id: 28, category: "Vehicles" },
  { id: 11, category: "Entertainment: Film" },
  { id: 30, category: "Science: Gadgets" },
  { id: 31, category: "Entertainment: Japanese Anime & Manga" },
  { id: 32, category: "Entertainment: Cartoon & Animations" },
];

async function getFillerQuestions(remaining: number) {
  const response = await axios.get(
    `https://opentdb.com/api.php?amount=${remaining}&category=${
      CATEGORIES[
        getDate(new Date(Timestamp.now().toMillis())) % CATEGORIES.length
      ].id
    }&type=multiple`
  );

  const apiQuestions = await response.data;

  let newRemaining = 0;
  let questionsToAdd: any[] = [];

  for (const question of apiQuestions.results) {
    const q = query(
      questionsRef,
      where("username", "!=", "bot_kultur"),
      where("question", "==", question.question)
    );

    const questions = await getDocs(q);

    if (questions?.docs?.length > 0) {
      newRemaining++;
    } else {
      questionsToAdd.push(question);
    }
  }

  if (newRemaining > 0) {
    const newQuestions = await getFillerQuestions(newRemaining);
    questionsToAdd = [...questionsToAdd, ...newQuestions];
  }

  return questionsToAdd;
}

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
  if (!questions?.docs?.length || questions.docs.length < 3) {
    const questionsToAdd = await getFillerQuestions(3);

    console.log(questionsToAdd);

    for (const question of questionsToAdd) {
      const correctAnswerNumber = Math.floor(Math.random() * 4);
      const props: { [key: string]: string } = {};
      for (let i = 0; i < 4; i++) {
        props[`prop${i + 1}`] =
          i === correctAnswerNumber
            ? decode(question.correct_answer)
            : i < correctAnswerNumber
            ? decode(question.incorrect_answers[i])
            : decode(question.incorrect_answers[i - 1]);

        if (typeof props[`prop${i + 1}`] === "undefined") {
          delete props[`prop${i + 1}`];
        }
      }
      await addDoc(collection(db, "questions"), {
        question: decode(question.question),
        ...props,
        date: format(new Date(Timestamp.now().toMillis()), "yyyy-MM-dd"),
        username: "bot_kultur",
        answer: correctAnswerNumber + 1,
      });
    }
  }
};
