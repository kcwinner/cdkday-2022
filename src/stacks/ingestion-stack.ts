import { DeliveryStream } from "@aws-cdk/aws-kinesisfirehose";
import { S3Bucket } from "@aws-cdk/aws-kinesisfirehose-destinations";
import { Bucket } from "@aws-cdk/aws-s3";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

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
