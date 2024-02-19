import Koa from "koa";
import serve from "koa-static";
import Path from "path";
import ServerlessHttp from "serverless-http";

const app = new Koa();
app.use(serve(Path.resolve(__dirname, "static")));

const isAWSLambda = !!(process.env as any).LAMBDA_TASK_ROOT;

if (!isAWSLambda) {
  app.listen(3000, () => {
    console.log("Server started on port 3000");
  });
} else {
  module.exports.handler = ServerlessHttp(app);
}
