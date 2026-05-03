import { createManagedUserAction } from "@/app/actions/auth";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, courses] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } })
  ]);

  return (
    <AppShell role="ADMIN">
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Add teacher or student</CardTitle></CardHeader>
          <CardContent>
            <form action={createManagedUserAction} className="grid gap-3">
              <Input name="name" placeholder="Full name" required />
              <Input name="username" placeholder="Username" required />
              <Input name="password" type="password" placeholder="Temporary password" minLength={6} required />
              <select name="role" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="STUDENT">
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
              </select>
              <select name="courseId" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="">
                <option value="">No initial course</option>
                {courses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}
              </select>
              <Button type="submit">Create account</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>User management</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {users.map((user) => (
              <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={user.id}>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <Badge variant="outline">{user.role}</Badge>
                <Badge variant={user.isApproved ? "secondary" : "accent"}>{user.isApproved ? "Approved" : "Pending"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
