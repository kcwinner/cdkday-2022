import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface DataStoreStackProps extends StackProps {}

export class DataStoreStack extends Stack {
  public readonly table: Table;

  constructor(scope: Construct, id: string, props: DataStoreStackProps) {
    super(scope, id, props);

    this.table = new Table(this, "DataStoreTable", {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "pk",
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
