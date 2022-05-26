const path = require("path");
const fs = require("fs-extra");

const { Component } = require("projen");
const { JobPermission } = require("projen/lib/github/workflows-model");

const DEFAULT_UBUNTU = "ubuntu-latest";

class BasicDeployWorkflow extends Component {
  workflow;
  buildJobId;
  buildJob;

  constructor(project, options) {
    super(project);

    this.buildJobId = options.jobId ?? "build";

    const github = project.github;
    if (!github) {
      throw new Error("no github support");
    }

    const workflow = github.addWorkflow(options.name);

    if (options.trigger) {
      if (options.trigger.issue_comment) {
        throw new Error(
          '"issue_comment" should not be used as a trigger due to a security issue'
        );
      }

      workflow.on(options.trigger);
    }

    this.workflow = workflow;

    const condition = options.condition ? { if: options.condition } : {};
    const preBuildSteps = options.preBuildSteps ?? [];
    const preCheckoutSteps = options.preCheckoutSteps ?? [];
    const checkoutWith = options.checkoutWith
      ? { with: options.checkoutWith }
      : {};
    const postSteps = options.postSteps ?? [];

    const antitamperSteps = options.antitamperDisabled
      ? []
      : this.antiTamperSteps();

    this.buildJob = {
      runsOn: [DEFAULT_UBUNTU],
      env: {
        CI: "true",
        ...options.environment,
      },
      ...condition,
      steps: [
        ...preCheckoutSteps,

        // check out sources.
        {
          name: "Checkout",
          uses: "actions/checkout@v2",
          ...checkoutWith,
        },

        // sets git identity so we can push later
        {
          name: "Set git identity",
          run: [
            'git config user.name "Automation"',
            'git config user.email "github-actions@github.com"',
          ].join("\n"),
        },

        // install dependencies
        ...this.installWorkflowSteps(),

        // perform an anti-tamper check immediately after we run projen.
        ...antitamperSteps,

        ...preBuildSteps,

        // build (compile + test)
        {
          name: "Build",
          run: project.runTaskCommand(project.buildTask),
        },

        // anti-tamper check (fails if there were changes to committed files)
        // this will identify any non-committed files generated during build (e.g. test snapshots)
        ...antitamperSteps,

        ...postSteps,
      ],
      permissions: {
        contents: JobPermission.READ,
        ...options.permissions,
      },
      container: options.image ? { image: options.image } : undefined,
    };

    if (options.artifactDirectory || options.artifactName) {
      this.buildJob.steps.push({
        name: "Upload artifact",
        uses: "actions/upload-artifact@v2.1.1",
        with: {
          name: options.artifactName || "build-artifact",
          path: options.artifactDirectory || "cdk.out",
        },
      });
    }

    this.workflow.addJobs({ [this.buildJobId]: this.buildJob });
  }

  installWorkflowSteps() {
    const project = this.project;

    return [
      {
        name: "Setup Node.js",
        uses: "actions/setup-node@v2.2.0",
        with: { "node-version": project.minNodeVersion },
      },
      {
        name: "Cache Node Modules",
        id: "cache-node",
        uses: "actions/cache@v2",
        with: {
          path: "node_modules",
          key: "node-modules-${{ hashFiles('package-lock.json') }}",
        },
      },
      {
        name: "Install dependencies",
        run: project.package.installCommand,
        if: "steps.cache-node.outputs.cache-hit != 'true'",
      },
    ];
  }

  antiTamperSteps() {
    return [
      {
        name: "Anti-tamper check",
        run: "git diff --exit-code",
      },
    ];
  }

  configureCredentialsStep() {
    return {
      name: "Configure AWS Credentials",
      uses: "aws-actions/configure-aws-credentials@v1",
      with: {
        "aws-region": "us-east-1",
        "role-to-assume": "${{ secrets.OIDC_ROLE }}", // we use secrets.OIDC_ROLE
        "role-duration-seconds": 1200,
      },
    };
  }
}

class GraphDeployWorkflow extends BasicDeployWorkflow {
  /**
   * The parsed graph from generated/graph.json
   */
  graph;

  options;

  constructor(project, options) {
    const demoStage = "graphDemo";
    const prodStage = "graphProd";

    super(project, {
      ...options,
      artifactDirectory: "cdk.out",
      artifactName: `${demoStage}-build`,
      environment: {
        STAGE: demoStage,
      },
    });

    this.graph = {};
    this.options = options;

    const filepath = path.join(
      __dirname,
      "..",
      "..",
      "generated",
      "graph.json"
    );
    if (!fs.pathExistsSync(filepath)) return;

    this.graph = fs.readJSONSync(filepath);

    this.workflow.on({
      workflowDispatch: {}, // allow manual triggering
      push: {
        branches: ["main"],
      },
    });

    const checkoutWith = options.checkoutWith
      ? { with: options.checkoutWith }
      : {};

    const demoJobs = this.addStageJobs({
      buildJobId: this.buildJobId,
      stage: demoStage,
    });

    const prodBuildJobId = "build_prod";
    this.workflow.addJob(prodBuildJobId, {
      runsOn: [DEFAULT_UBUNTU],
      needs: [this.buildJobId],
      permissions: {
        contents: JobPermission.WRITE,
      },
      environment: prodStage,
      concurrency: {
        group: prodBuildJobId,
        "cancel-in-progress": false,
      },
      env: {
        STAGE: prodStage,
      },
      steps: [
        // check out sources.
        {
          name: "Checkout",
          uses: "actions/checkout@v2",
          ...checkoutWith,
        },
        // install dependencies
        ...this.installWorkflowSteps(),
        // synth
        {
          name: "Synth",
          run: "npx projen synth",
        },
        {
          name: "Upload artifact",
          uses: "actions/upload-artifact@v2.1.1",
          with: {
            name: `${prodStage}-build`,
            path: "cdk.out",
          },
        },
      ],
    });

    this.addStageJobs({
      buildJobId: prodBuildJobId,
      stage: prodStage,
      needs: demoJobs,
    });
  }

  addStageJobs({ buildJobId, stage, needs = [] }) {
    const stacks = this.graph[stage].stacks;
    const checkoutWith = this.options.checkoutWith
      ? { with: this.options.checkoutWith }
      : {};

    const stageJobNames = [];

    for (const stack of stacks) {
      stack.jobName = stack.name.replace("-", "_");
      stageJobNames.push(stack.jobName);

      const deps = stack.dependencies.map((name) => name.replace("-", "_"));

      this.workflow.addJob(stack.jobName, {
        runsOn: [DEFAULT_UBUNTU],
        needs: [buildJobId, ...deps, ...needs],
        concurrency: {
          group: stack.jobName,
          "cancel-in-progress": false,
        },
        environment: stage,
        env: {
          STAGE: stage,
        },
        steps: [
          {
            name: "Checkout",
            uses: "actions/checkout@v2",
            ...checkoutWith,
          },
          {
            name: "Download build artifact",
            uses: "actions/download-artifact@v2",
            with: {
              name: `${stage}-build`,
              path: "cdk.out",
            },
          },
          ...this.installWorkflowSteps(),
          this.configureCredentialsStep(),
          {
            name: `Deploy ${stack.name}`,
            run: `npx cdk deploy --exclusively ${stack.name} --app cdk.out --require-approval never`,
            // @ts-ignore - This exists in github but not projen
            "timeout-minutes": 20,
          },
        ],
        permissions: {
          contents: JobPermission.READ,
          // @ts-ignore - This exists in github but not projen
          "id-token": JobPermission.WRITE,
        },
        container: this.options.image
          ? { image: this.options.image }
          : undefined,
      });
    }

    return stageJobNames;
  }
}

module.exports = {
  GraphDeployWorkflow,
};
