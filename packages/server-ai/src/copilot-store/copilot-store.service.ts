import { TenantOrganizationAwareCrudService } from '@metad/server-core'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CopilotStore } from './copilot-store.entity'
import { CommandBus, QueryBus } from '@nestjs/cqrs'

@Injectable()
export class CopilotStoreService extends TenantOrganizationAwareCrudService<CopilotStore> {
	constructor(
		@InjectRepository(CopilotStore)
		repository: Repository<CopilotStore>,
		private readonly commandBus: CommandBus,
		private readonly queryBus: QueryBus,
	) {
		super(repository)
	}
}
