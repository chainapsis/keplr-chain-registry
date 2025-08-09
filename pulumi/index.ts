import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const stack = pulumi.getStack();

const role = new aws.iam.Role(`chain-registry-lambda-role-${stack}`, {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Principal: {
          Service: "lambda.amazonaws.com",
        },
        Effect: "Allow",
        Sid: "",
      },
    ],
  },
});
const policy = new aws.iam.Policy(`chain-registry-lambda-policy-${stack}`, {
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["s3:GetObject", "s3:PutObject"],
        Resource: "arn:aws:s3:::*",
      },
    ],
  },
});
new aws.iam.RolePolicyAttachment(
  `chain-registry-lambda-role-attachment-${stack}`,
  {
    role,
    policyArn: policy.arn,
  },
);

const lambda = new aws.lambda.Function(
  `chain-registry-lambda-function-${stack}`,
  {
    name: `chain-registry-lambda-function-${stack}`,
    role: role.arn,
    code: new pulumi.asset.FileArchive("../bundle.zip"),
    runtime: "nodejs18.x",
    handler: "bundle/index.handler",
    timeout: 15,
    memorySize: 256,
  },
);

const functionUrl = new aws.lambda.FunctionUrl(
  `chain-registry-lambda-function-url-${stack}`,
  {
    functionName: lambda.name,
    authorizationType: "NONE",
    cors: {
      allowHeaders: ["*"],
      allowMethods: ["GET"],
      allowOrigins: ["*"],
      maxAge: 3600,
    },
  },
);

export const endpoint = functionUrl.functionUrl;
