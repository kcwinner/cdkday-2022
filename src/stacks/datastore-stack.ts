import { AttributeType, BillingMode, Table } from "@aws-cdk/aws-dynamodb";
import { Construct, RemovalPolicy, Stack, StackProps } from "@aws-cdk/core";

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
