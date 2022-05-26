import { Table } from "@aws-cdk/aws-dynamodb";
import { Code, Function, IFunction, Runtime } from "@aws-cdk/aws-lambda";
import { Secret } from "@aws-cdk/aws-secretsmanager";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export interface AsyncJobsStackProps extends StackProps {
  table: Table;
  secretOne: Secret;
}

export class AsyncJobsStack extends Stack {
  public readonly functions: IFunction[];

  constructor(scope: Construct, id: string, props: AsyncJobsStackProps) {
    super(scope, id, props);

    this.functions = [];

    const reporterFunction = new Function(this, "ReporterFunction", {
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromInline(
        "export async handler(event) { console.log(event); console.log(process.env.TABLE_NAME); }"
      ),
      handler: "handler",
      environment: {
        TABLE_NAME: props.table.tableName,
        SECRET_ONE_ARN: props.secretOne.secretArn,
      },
    });
    props.table.grantReadData(reporterFunction);
    props.secretOne.grantRead(reporterFunction);

    this.functions.push(reporterFunction);
  }
}
