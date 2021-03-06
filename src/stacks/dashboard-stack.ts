import { Duration, Stack, StackProps } from "aws-cdk-lib";
import {
  Dashboard,
  GraphWidget,
  GraphWidgetView,
  LegendPosition,
  MathExpression,
} from "aws-cdk-lib/aws-cloudwatch";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface DashboardStackProps extends StackProps {
  table: Table;
  lambdaFunctions: IFunction[];
}

export class DashboardStack extends Stack {
  constructor(scope: Construct, id: string, props: DashboardStackProps) {
    super(scope, id, props);

    const dashboard = new Dashboard(this, "Dashboard", {
      start: "-PT3H",
    });

    const period = Duration.minutes(5);

    const lambdaErrorsWidget = new GraphWidget({
      liveData: false,
      stacked: false,
      view: GraphWidgetView.TIME_SERIES,
      legendPosition: LegendPosition.BOTTOM,
      title: "Lambda Health",
      left: this.buildLambdaMetricsLeft(props.lambdaFunctions),
      leftYAxis: {
        min: 0,
        label: "Total Error Count",
        showUnits: false,
      },
      right: this.buildLambdaMetricsRight(props.lambdaFunctions),
      rightYAxis: {
        min: 0,
        max: 100,
        label: "Success Rate %",
        showUnits: false,
      },
      period,
      width: 12,
      height: 6,
    });

    dashboard.addWidgets(lambdaErrorsWidget);

    const dynamoWidget = new GraphWidget({
      stacked: false,
      view: GraphWidgetView.TIME_SERIES,
      title: "Table Usage",
      left: [props.table.metricConsumedReadCapacityUnits()],
      right: [props.table.metricConsumedWriteCapacityUnits()],
      // period,
      // width: 12,
      // height: 6,
    });

    dashboard.addWidgets(dynamoWidget);
  }

  buildLambdaMetricsRight(lambdaFunctions: IFunction[]) {
    const successPercentage = lambdaFunctions.map((func, idx) => {
      const errorsName = `errors${idx}`;
      const invocationsName = `invocations${idx}`;
      return new MathExpression({
        label: `${func.functionName} Success %`,
        expression: `100 - 100 * ${errorsName} / MAX([${errorsName}, ${invocationsName}])`,
        usingMetrics: {
          [errorsName]: func.metricErrors(),
          [invocationsName]: func.metricInvocations(),
        },
      });
    });

    return [...successPercentage];
  }

  buildLambdaMetricsLeft(lambdaFunctions: IFunction[]) {
    const errors = lambdaFunctions.map((func) => {
      return func.metricErrors();
    });

    return [...errors];
  }
}
