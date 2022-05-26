import { App } from "aws-cdk-lib";

import { ApiStack } from "./stacks/api-stack";
import { AsyncJobsStack } from "./stacks/async-jobs-stack";
import { DashboardStack } from "./stacks/dashboard-stack";
import { DataStoreStack } from "./stacks/datastore-stack";
import { IngestionStack } from "./stacks/ingestion-stack";
import { SecretsStack } from "./stacks/secrets-stack";
import { WebhooksStack } from "./stacks/webhooks-stack";

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1",
};

const app = new App();

const dataStoreStack = new DataStoreStack(app, generateStackName("Datastore"), {
  env: devEnv,
});
const secretStack = new SecretsStack(app, generateStackName("Secrets"), {
  env: devEnv,
});

new IngestionStack(app, generateStackName("Ingestion"), { env: devEnv });

const apiStack = new ApiStack(app, generateStackName("Api"), {
  table: dataStoreStack.table,
  secretOne: secretStack.secretOne,
  secretTwo: secretStack.secretTwo,
  env: devEnv,
});

const asyncJobsStack = new AsyncJobsStack(app, generateStackName("AsyncJobs"), {
  table: dataStoreStack.table,
  secretOne: secretStack.secretOne,
  env: devEnv,
});

const webhooksStack = new WebhooksStack(app, generateStackName("Webhooks"), {
  secretOne: secretStack.secretOne,
  secretTwo: secretStack.secretTwo,
  env: devEnv,
});

new DashboardStack(app, generateStackName("Dashboard"), {
  table: dataStoreStack.table,
  lambdaFunctions: [
    ...apiStack.functions,
    ...asyncJobsStack.functions,
    ...webhooksStack.functions,
  ],
  env: devEnv,
});

app.synth();

function generateStackName(name: string) {
  const stage = process.env.STAGE ?? "demo";
  return `CDKDay-${name}-${stage}`;
}
