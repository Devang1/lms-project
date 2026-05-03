import { GraduationCap } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <main className="hero-grid flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap />
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Use the username and password issued by your admin or teacher.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="grid gap-4">
            <Input name="username" placeholder="Username" autoComplete="username" required />
            <Input name="password" type="password" placeholder="Password" required />
            {params.error === "invalid" ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Invalid username or password.
              </p>
            ) : null}
            <Button type="submit">Log in</Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">New accounts are created by Star Study Point staff.</p>
        </CardContent>
      </Card>
    </main>
  );
}
