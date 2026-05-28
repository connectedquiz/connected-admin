import { notFound } from "next/navigation";
import { getAdminDb } from "@/lib/firebase-admin";
import { Quiz } from "@/lib/quiz-types";
import QuizForm from "../../_components/QuizForm";

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const db = getAdminDb();
  const doc = await db.collection("quizzes").doc(quizId).get();

  if (!doc.exists) notFound();

  const quiz = doc.data() as Quiz;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Edit quiz</h1>
      <p className="text-gray-500 text-sm mb-6">
        Quiz ID and identity fields are locked after creation. Edit clues below.
      </p>
      <QuizForm mode="edit" initialData={quiz} />
    </div>
  );
}