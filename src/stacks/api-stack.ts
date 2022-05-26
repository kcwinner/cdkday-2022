import { Stack, StackProps } from "aws-cdk-lib";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Code, Function, IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface ApiStackProps extends StackProps {
  table: Table;
  secretOne: Secret;
  secretTwo: Secret;
}

export class ApiStack extends Stack {
  public readonly functions: IFunction[];

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.functions = [];

    const apiRouterFunction = new Function(this, "ApiRouterFunction", {
      runtime: Runtime.NODEJS_16_X,
      code: Code.fromInline(
        "export async handler(event) { console.log(event); console.log(process.env.TABLE_NAME); }"
      ),
      handler: "handler",
      environment: {
        TABLE_NAME: props.table.tableName,
        SECRET_ONE_ARN: props.secretOne.secretArn,
        SECRET_TWO_ARN: props.secretTwo.secretArn,
      },
    });
    props.table.grantReadWriteData(apiRouterFunction);
    props.secretOne.grantRead(apiRouterFunction);
    props.secretTwo.grantRead(apiRouterFunction);

    this.functions.push(apiRouterFunction);

    new LambdaRestApi(this, "Api", {
      handler: apiRouterFunction,
    });
  }
}
