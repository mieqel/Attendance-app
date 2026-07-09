import LoginForm from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
      <h1 className="font-display text-3xl font-semibold text-teal-dark">Beheer inloggen</h1>
      <LoginForm />
    </main>
  );
}
