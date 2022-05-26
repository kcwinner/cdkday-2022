import { Code, Function, IFunction, Runtime } from "@aws-cdk/aws-lambda";
import { Secret } from "@aws-cdk/aws-secretsmanager";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export interface WebhooksStackProps extends StackProps {
  secretOne: Secret;
  secretTwo: Secret;
}

export class WebhooksStack extends Stack {
  public readonly functions: IFunction[];

  constructor(scope: Construct, id: string, props: WebhooksStackProps) {
    super(scope, id, props);

    this.functions = [];

    const webhookOneFunction = new Function(this, "WebhookOneFunction", {
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromInline(
        "export async handler(event) { console.log(event); console.log(process.env.TABLE_NAME); }"
      ),
      handler: "handler",
      environment: {
        SECRET_ARN: props.secretOne.secretArn,
      },
    });
    props.secretOne.grantRead(webhookOneFunction);

    const webhookTwoFunction = new Function(this, "WebhookTwoFunction", {
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromInline(
        "export async handler(event) { console.log(event); console.log(process.env.TABLE_NAME); }"
      ),
      handler: "handler",
      environment: {
        SECRET_ARN: props.secretTwo.secretArn,
      },
    });
    props.secretOne.grantRead(webhookOneFunction);

    this.functions.push(webhookOneFunction, webhookTwoFunction);
  }
}
