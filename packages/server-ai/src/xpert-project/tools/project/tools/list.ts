import { tool } from '@langchain/core/tools'
import { TAgentRunnableConfigurable } from '@metad/contracts'
import { z } from 'zod'
import { XpertProjectTaskService } from '../../../services'
import { ProjectToolEnum } from '../project'

export const createListTasksTool = ({
	projectId,
	service
}: {
	projectId: string
	service: XpertProjectTaskService
}) => {
	const listTasksTool = tool(
		async (_, config) => {
			const { configurable } = config ?? {}
			const { subscriber, thread_id } = <TAgentRunnableConfigurable>configurable ?? {}
			return await service.findAll({ where: { projectId, threadId: thread_id } })
		},
		{
			name: ProjectToolEnum.ListTasks,
			schema: z.object({}),
			description: 'List all task in project.'
		}
	)
	return listTasksTool
}
