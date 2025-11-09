import { Module } from '@nestjs/common';
import { PlanService } from './service/plan.service';
import { PlanController } from './controller/plan.controller';
import { PlanParticipantService } from './service/participant.service';
import { PlanParticipantController } from './controller/participant.controller';
import { PlanPermissionService } from './service/permission.service';

@Module({
  controllers: [PlanController, PlanParticipantController],
  providers: [PlanService, PlanParticipantService, PlanPermissionService],
  exports: [PlanService, PlanParticipantService, PlanPermissionService],
})
export class PlanModule {}
