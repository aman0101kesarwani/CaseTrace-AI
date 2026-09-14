import React from "react";

import { Button } from "@/atoms/button";
import { Input } from "@/atoms/input";
import { Label } from "@/atoms/label";
import { cn } from "@/lib/utils";
import { Spinner } from "@/molecules";
import { useNavigate } from "react-router-dom";

import { setLoggedInUser } from "@/store/user-slice";
import { useAppDispatch } from "@/store/store";
import { ROOT } from "@/router";

interface UserAuthFormProps
  extends React.HTMLAttributes<HTMLDivElement> { }

export function UserAuthForm({
  className,
  ...props
}: UserAuthFormProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      localStorage.setItem("caseflow_access_token", data.access_token);

      const tokenPayload = JSON.parse(
        atob(data.access_token.split(".")[1])
      );

      dispatch(
        setLoggedInUser({
          id: Number(tokenPayload.sub),
          name: email,
          email: tokenPayload.email,
          role: tokenPayload.role,
          company: "",
        })
      );

      navigate(ROOT);
    } catch (error) {
      console.error("Login failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to login"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>

            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              Password
            </Label>

            <Input
              id="password"
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="bg-blue-800 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading && <Spinner />}
            Sign In with Email
          </Button>
        </div>
      </form>
    </div>
  );
}