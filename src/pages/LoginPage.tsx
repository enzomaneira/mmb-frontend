import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { saveToken } from "../lib/auth";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.auth.login(username.trim(), password),
    onSuccess: (data) => saveToken(data.access_token),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="section-card w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src="/logo.svg" alt="Logo" className="h-16 w-16" />
          <h1 className="font-display text-xl font-bold text-brand-pink-deep">
            Michelle Maneira Bonecas
          </h1>
          <p className="text-sm text-gray-500">Entre para acessar o sistema</p>
        </div>

        {mutation.isError && (
          <Alert type="error" message={mutation.error.message} onClose={() => mutation.reset()} />
        )}

        <Input
          label="Usuário"
          required
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          label="Senha"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full py-3" loading={mutation.isPending}>
          Entrar
        </Button>
      </form>
    </div>
  );
}
