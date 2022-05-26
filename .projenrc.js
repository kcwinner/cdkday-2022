const { awscdk, javascript } = require("projen");

const { GraphDeployWorkflow } = require("./.projen/workflows/graphDeploy");
const { SerialDeployWorkflow } = require("./.projen/workflows/serialDeploy");

const project = new awscdk.AwsCdkTypeScriptApp({
  name: "cdkday-2022",
  defaultReleaseBranch: "main",
  packageManager: javascript.NodePackageManager.NPM,

  cdkVersion: "2.24.0",

  eslintOptions: {
    prettier: true,
  },

  devDeps: ["esbuild", "fs-extra"],
  deps: [
    "@aws-cdk/aws-kinesisfirehose-alpha",
    "@aws-cdk/aws-kinesisfirehose-destinations-alpha",
  ],

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
