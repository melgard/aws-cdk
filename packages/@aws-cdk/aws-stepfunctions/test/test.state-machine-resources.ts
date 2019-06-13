import { expect, haveResource } from '@aws-cdk/assert';
import iam = require('@aws-cdk/aws-iam');
import cdk = require('@aws-cdk/cdk');
import { Test } from 'nodeunit';
import stepfunctions = require('../lib');

export = {
    'Tasks can add permissions to the execution role'(test: Test) {
        // GIVEN
        const stack = new cdk.Stack();
        const task = new stepfunctions.Task(stack, 'Task', {
            task: {
                bind: () => ({
                    resourceArn: 'resource',
                    policyStatements: [new iam.PolicyStatement({
                        actions: ['resource:Everything'],
                        resources: ['resource']
                    })],
                })
            }
        });

        // WHEN
        new stepfunctions.StateMachine(stack, 'SM', {
            definition: task
        });

        // THEN
        expect(stack).to(haveResource('AWS::IAM::Policy', {
            PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: "resource:Everything",
                        Effect: "Allow",
                        Resource: "resource"
                    }
                ],
            }
        }));

        test.done();
    },

    'Tasks hidden inside a Parallel state are also included'(test: Test) {
        // GIVEN
        const stack = new cdk.Stack();
        const task = new stepfunctions.Task(stack, 'Task', {
            task: {
                bind: () => ({
                    resourceArn: 'resource',
                    policyStatements: [
                        new iam.PolicyStatement({
                            actions: ['resource:Everything'],
                            resources: ['resource']
                        })
                    ]
                })
            }
        });

        const para = new stepfunctions.Parallel(stack, 'Para');
        para.branch(task);

        // WHEN
        new stepfunctions.StateMachine(stack, 'SM', {
            definition: para
        });

        // THEN
        expect(stack).to(haveResource('AWS::IAM::Policy', {
            PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: "resource:Everything",
                        Effect: "Allow",
                        Resource: "resource"
                    }
                ],
            }
        }));

        test.done();
    },

    'Task should render InputPath / Parameters / OutputPath correctly'(test: Test) {
        // GIVEN
        const stack = new cdk.Stack();
        const task = new stepfunctions.Task(stack, 'Task', {
            inputPath: "$",
            outputPath: "$.state",
            task: {
                bind: () => ({
                    resourceArn: 'resource',
                    parameters: {
                        "input.$": "$",
                        "stringArgument": "inital-task",
                        "numberArgument": 123,
                        "booleanArgument": true,
                        "arrayArgument": ["a", "b", "c"]
                    }
                })
            }
        });

        // WHEN
        const taskState = task.toStateJson();

        // THEN
        test.deepEqual(taskState, { End: true,
            Retry: undefined,
            Catch: undefined,
            InputPath: '$',
            Parameters:
             { 'input.$': '$',
               'stringArgument': 'inital-task',
               'numberArgument': 123,
               'booleanArgument': true,
               'arrayArgument': [ 'a', 'b', 'c' ] },
            OutputPath: '$.state',
            Type: 'Task',
            Comment: undefined,
            Resource: 'resource',
            ResultPath: undefined,
            TimeoutSeconds: undefined,
            HeartbeatSeconds: undefined
        });

        test.done();
    },

};