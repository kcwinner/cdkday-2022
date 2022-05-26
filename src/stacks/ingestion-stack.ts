import { DeliveryStream } from "@aws-cdk/aws-kinesisfirehose-alpha";
import { S3Bucket } from "@aws-cdk/aws-kinesisfirehose-destinations-alpha";
import { Stack, StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface IngestionStackProps extends StackProps {}

export class IngestionStack extends Stack {
  constructor(scope: Construct, id: string, props: IngestionStackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "FirehoseBucket");

    new DeliveryStream(this, "S3Ingestion", {
      destinations: [new S3Bucket(bucket)],
    });
  }
}
