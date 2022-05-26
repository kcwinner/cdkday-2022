import { Secret } from "@aws-cdk/aws-secretsmanager";
import { Construct, RemovalPolicy, Stack, StackProps } from "@aws-cdk/core";

export class SecretsStack extends Stack {
  public readonly secretOne: Secret;
  public readonly secretTwo: Secret;

  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    this.secretOne = new Secret(this, "SecretOne", {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.secretTwo = new Secret(this, "SecretTwo", {
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
