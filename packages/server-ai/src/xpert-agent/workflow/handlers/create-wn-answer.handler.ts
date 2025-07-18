import { AIMessage } from '@langchain/core/messages'
import { AIMessagePromptTemplate } from '@langchain/core/prompts'
import { RunnableLambda } from '@langchain/core/runnables'
import {
	channelName,
	IWFNAnswer,
	IXpertAgentExecution,
	TAgentRunnableConfigurable,
	WorkflowNodeTypeEnum
} from '@metad/contracts'
import { Logger } from '@nestjs/common'
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs'
import { I18nService } from 'nestjs-i18n'
import { AgentStateAnnotation, nextWorkflowNodes, stateToParameters } from '../../../shared'
import { wrapAgentExecution } from '../../../shared/agent/execution'
import { FakeStreamingChatModel } from '../../agent'
import { CreateWNAnswerCommand } from '../create-wn-answer.command'

@CommandHandler(CreateWNAnswerCommand)
export class CreateWNAnswerHandler implements ICommandHandler<CreateWNAnswerCommand> {
	readonly #logger = new Logger(CreateWNAnswerHandler.name)

	constructor(
		private readonly commandBus: CommandBus,
		private readonly queryBus: QueryBus,
		private readonly i18nService: I18nService
	) {}

	public async execute(command: CreateWNAnswerCommand) {
		const { graph, node } = command
		const { environment } = command.options

		const entity = node.entity as IWFNAnswer

		return {
			workflowNode: {
				graph: RunnableLambda.from(async (state: typeof AgentStateAnnotation.State, config) => {
					const configurable: TAgentRunnableConfigurable = config.configurable
					const { thread_id, checkpoint_ns, checkpoint_id, subscriber, executionId } = configurable

					const aiMessage = await AIMessagePromptTemplate.fromTemplate(entity.promptTemplate, {
						templateFormat: 'mustache'
					}).format(stateToParameters(state, environment))

					const execution: IXpertAgentExecution = {
						category: 'workflow',
						type: WorkflowNodeTypeEnum.ANSWER,
						parentId: executionId,
						threadId: thread_id,
						checkpointNs: checkpoint_ns,
						checkpointId: checkpoint_id,
						agentKey: node.key,
						title: entity.title
					}
					return await wrapAgentExecution(
						async () => {
							await new FakeStreamingChatModel({ responses: [aiMessage] }).invoke([], config)
							return {
								state: {
									[channelName(node.key)]: {
										messeges: [aiMessage]
									},
									// Append to main message channel
									messages: [
										new AIMessage({
											content: aiMessage.content
										})
									]
								},
								output: aiMessage.content as string
							}
						},
						{
							commandBus: this.commandBus,
							queryBus: this.queryBus,
							subscriber: subscriber,
							execution
						}
					)()
				}),
				ends: []
			},
			navigator: async (state: typeof AgentStateAnnotation.State, config) => {
				return nextWorkflowNodes(graph, node.key, state)
			}
		}
	}
}
