import { Hono } from "hono";
import { federation } from "@fedify/fedify/x/hono";
import { getLogger } from "@logtape/logtape";
import fedi from "./federation.ts";
import { Layout, SetupForm, Profile } from './views.tsx';
import db from './db.ts';
import type { User } from './schema.ts';

const logger = getLogger("microblog");

const app = new Hono();
app.use(federation(fedi, () => undefined))

app.get("/", (c) => c.text("Hello, Fedify!"));

app.get("/setup", (c) => {
  // 계정이 이미 있는지 검사
  const user = db.prepare<unknown[], User>("SELECT * FROM users LIMIT 1").get();
  if (user != null) return c.redirect("/");

  return c.html(
    <Layout>
      <SetupForm />
    </Layout>,
  );
});

app.post("/setup", async (c) => {
  // 계정이 이미 있는지 검사
  const user = db.prepare<unknown[], User>("SELECT * FROM users LIMIT 1").get();
  if (user != null) return c.redirect("/");

  const form = await c.req.formData();
  const username = form.get("username");
  if (typeof username !== "string" || !username.match(/^[a-z0-9_-]{1,50}$/)) {
    return c.redirect("/setup");
  }
  db.prepare("INSERT INTO users (username) VALUES (?)").run(username);
  return c.redirect("/");
});

app.get("/users/:username", async (c) => {
  const user = db
    .prepare<unknown[], User>("SELECT * FROM users WHERE username = ?")
    .get(c.req.param("username"));
  if (user == null) return c.notFound();

  const url = new URL(c.req.url);
  const handle = `@${user.username}@${url.host}`;
  return c.html(
    <Layout>
      <Profile name={user.username} handle={handle} />
    </Layout>,
  );
});


export default app;
