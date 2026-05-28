import QuizForm from "../_components/QuizForm";

export default function NewQuizPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Create quiz</h1>
      <p className="text-gray-500 text-sm mb-6">
        Fill in the details below. The Quiz ID is generated automatically.
      </p>
      <QuizForm mode="create" />
    </div>
  );
}