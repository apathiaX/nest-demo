import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PlanService } from '../service/plan.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { PlanType, PlanSource } from 'prisma-mysql';
import {
  CreatePlanDto,
  DeletePlanDto,
  GetPlanInfoDto,
  GetPlanStatsDto,
  UpdatePlanDto,
} from '../dto/plan.dto';

@ApiTags('Plans')
@ApiBearerAuth('JWT-auth')
@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new plan' })
  @ApiResponse({ status: 201, description: 'Plan successfully created' })
  async createPlan(@CurrentUser() user: any, @Body() createPlanDto: CreatePlanDto) {
    return this.planService.create(user.id, createPlanDto);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get all plans' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Plans list retrieved' })
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;
    const take = pageSize || 10;

    return this.planService.findAll({
      skip,
      take,
      userId: user.id,
    });
  }

  @Get('public')
  @Public()
  @ApiOperation({ summary: 'Get public plans (marketplace)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiQuery({ name: 'type', required: false, enum: PlanType })
  @ApiQuery({ name: 'source', required: false, enum: PlanSource })
  @ApiResponse({ status: 200, description: 'Public plans retrieved' })
  async findPublicPlans(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('type') type?: PlanType,
    @Query('source') source?: PlanSource,
  ) {
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;
    const take = pageSize || 20;

    return this.planService.findPublicPlans({ skip, take, type, source });
  }

  @Post('info')
  @ApiOperation({ summary: 'Get plan info' })
  @ApiResponse({ status: 200, description: 'Plan info retrieved' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlanInfo(@Body() getPlanInfoDto: GetPlanInfoDto) {
    return this.planService.findOne(getPlanInfoDto.plan_id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get plan statistics' })
  @ApiResponse({ status: 200, description: 'Plan statistics retrieved' })
  async getPlanStats(@Body() getPlanStatsDto: GetPlanStatsDto) {
    return this.planService.getPlanStats(getPlanStatsDto.plan_id);
  }

  @Post('update')
  @ApiOperation({ summary: 'Update plan' })
  @ApiResponse({ status: 200, description: 'Plan updated' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updatePlan(@CurrentUser() user: any, @Body() updatePlanDto: UpdatePlanDto) {
    return this.planService.update(updatePlanDto.plan_id, user.id, updatePlanDto);
  }

  @Post('delete')
  @ApiOperation({ summary: 'Delete plan' })
  @ApiResponse({ status: 200, description: 'Plan deleted' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deletePlan(@CurrentUser() user: any, @Body() deletePlanDto: DeletePlanDto) {
    return this.planService.remove(deletePlanDto.plan_id, user.id);
  }
}
