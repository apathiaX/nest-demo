import { Controller, Get, Post, Param, ParseIntPipe, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PlanParticipantService } from '../service/participant.service';
import { PlanPermissionService } from '../service/permission.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import {
  InviteParticipantDto,
  JoinPlanDto,
  LeavePlanDto,
  RemoveParticipantDto,
  UpdateParticipantRoleDto,
} from '../dto/participant.dto';

@ApiTags('Plan Members')
@ApiBearerAuth('JWT-auth')
@Controller('plans/members')
export class PlanParticipantController {
  constructor(
    private readonly participantService: PlanParticipantService,
    private readonly permissionService: PlanPermissionService,
  ) {}

  @Get('list')
  @ApiOperation({ summary: 'Get all participants of a plan' })
  @ApiResponse({ status: 200, description: 'Participants list retrieved' })
  async getPlanParticipants(@Param('planId', ParseIntPipe) planId: number) {
    return this.participantService.getPlanParticipants(planId);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join a plan' })
  @ApiResponse({ status: 201, description: 'Successfully joined the plan' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 409, description: 'Already joined this plan' })
  async joinPlan(@Body() joinDto: JoinPlanDto, @CurrentUser() user: any) {
    return this.participantService.joinPlan(joinDto.plan_id, user.id);
  }

  @Post('leave')
  @ApiOperation({ summary: 'Leave a plan' })
  @ApiResponse({ status: 200, description: 'Successfully left the plan' })
  @ApiResponse({ status: 404, description: 'Not a participant of this plan' })
  @ApiResponse({ status: 409, description: 'Creator cannot leave their own plan' })
  async leavePlan(@Body() leaveDto: LeavePlanDto, @CurrentUser() user: any) {
    return this.participantService.leavePlan(leaveDto.plan_id, user.id);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a participant to the plan (admin/owner only)' })
  @ApiResponse({ status: 201, description: 'Participant invited successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User already a participant' })
  async inviteParticipant(@Body() inviteDto: InviteParticipantDto, @CurrentUser() user: any) {
    return this.participantService.inviteParticipant(inviteDto.plan_id, user.id, inviteDto);
  }

  @Post('remove')
  @ApiOperation({ summary: 'Remove a participant from plan (admin/owner only)' })
  @ApiResponse({ status: 200, description: 'Participant removed successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  async removeParticipant(@Body() removeDto: RemoveParticipantDto, @CurrentUser() user: any) {
    return this.participantService.removeParticipant(
      removeDto.plan_id,
      removeDto.user_key,
      removeDto.phone,
      user.id,
    );
  }

  @Post('update-role')
  @ApiOperation({ summary: 'Update participant role (owner only)' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'Participant not found' })
  async updateRole(@Body() updateDto: UpdateParticipantRoleDto, @CurrentUser() user: any) {
    return this.participantService.updateParticipantRole(updateDto.plan_id, user.id, updateDto);
  }
}
