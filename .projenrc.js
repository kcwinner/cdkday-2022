const { awscdk, javascript } = require("projen");

const { GraphDeployWorkflow } = require("./.projen/workflows/graphDeploy");
const { SerialDeployWorkflow } = require("./.projen/workflows/serialDeploy");

const project = new awscdk.AwsCdkTypeScriptApp({
  name: "cdkday-2022",
  defaultReleaseBranch: "main",
  packageManager: javascript.NodePackageManager.NPM,

  cdkVersion: "1.157.0", // we will switch to "2.24.0", cdkv2 later
  cdkVersionPinning: true,
  cdkDependencies: [
    "@aws-cdk/aws-apigateway",
    "@aws-cdk/aws-cloudwatch",
    "@aws-cdk/aws-dynamodb",
    "@aws-cdk/aws-kinesisfirehose",
    "@aws-cdk/aws-kinesisfirehose-destinations",
    "@aws-cdk/aws-iam",
    "@aws-cdk/aws-lambda",
    "@aws-cdk/aws-s3",
    "@aws-cdk/aws-secretsmanager",

    "@aws-cdk/core",
  ],

  eslintOptions: {
    prettier: true,
  },

  devDeps: ["esbuild"],

  // Turn these off for demo repo
  stale: false,
  depsUpgrade: false,

  githubOptions: {
    mergify: false,
  },
});

project.addTask("generate:stack-graphs", {
  exec: "node bin/generateStackGraphs.js",
});

new SerialDeployWorkflow(project, {
  name: "SerialDeploy",
});

new GraphDeployWorkflow(project, {
  name: "GraphDeploy",
});

project.synth();
