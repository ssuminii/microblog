import { Hono } from "hono";
import { federation } from "@fedify/fedify/x/hono";
import { getLogger } from "@logtape/logtape";
import fedi from "./federation.ts";
import { Layout, SetupForm } from './views.tsx';

const logger = getLogger("microblog");

const app = new Hono();
app.use(federation(fedi, () => undefined))

app.get("/setup", (c) => c.html(
    <Layout>
      <SetupForm />
    </Layout>,
  ),);

export default app;
