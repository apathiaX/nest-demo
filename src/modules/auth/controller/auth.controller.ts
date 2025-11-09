import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  Param,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SmsService } from '@/common/services';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../service/auth.service';
import {
  BindThirdPartyDto,
  ChangePasswordDto,
  ChangePhoneDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  SendVerificationCodeDto,
  ThirdPartyLoginDto,
} from '../dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 设置认证 Cookie
   */
  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = this.configService.get<string>('nodeEnv') === 'production';
    const cookieOptions = {
      httpOnly: true, // 防止 XSS 攻击
      secure: isProduction, // 生产环境使用 HTTPS
      sameSite: 'lax' as const, // CSRF 保护
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    };

    // 设置 access_token cookie
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15分钟
    });

    // 设置 refresh_token cookie
    res.cookie('refresh_token', refreshToken, cookieOptions);
  }

  /**
   * 清除认证 Cookie
   */
  private clearCookies(res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }

  @Post('register')
  @Public()
  @ApiOperation({
    summary: '手机号注册',
    description: '使用手机号 + 密码注册新用户（不支持 email 注册）。成功后自动设置 Cookie',
  })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Phone number already exists' })
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(registerDto);
    this.setCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '手机号登录',
    description: '使用手机号 + 密码登录。成功后自动设置 Cookie',
  })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    this.setCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @Post('third-party/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '第三方登录',
    description:
      '支持华为、微信、QQ、支付宝登录。如果是首次登录会自动创建账号。成功后自动设置 Cookie',
  })
  @ApiResponse({ status: 200, description: 'Successfully logged in with third-party account' })
  @ApiResponse({ status: 401, description: 'Invalid third-party credentials' })
  async thirdPartyLogin(
    @Body() thirdPartyLoginDto: ThirdPartyLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.thirdPartyLogin(thirdPartyLoginDto);
    if (result.needBindPhone || !result.templateData) {
      throw new BadRequestException('Invalid third-party credentials');
    }
    this.setCookies(res, result.templateData.accessToken, result.templateData.refreshToken);
    return result;
  }

  @Post('third-party/bind')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '绑定第三方账号',
    description: '将第三方账号（华为、微信、QQ、支付宝）绑定到当前用户',
  })
  @ApiResponse({ status: 200, description: 'Successfully bound third-party account' })
  @ApiResponse({ status: 409, description: 'Account already bound' })
  async bindThirdParty(@CurrentUser() user: any, @Body() bindDto: BindThirdPartyDto) {
    return this.authService.bindThirdParty(user.id, bindDto);
  }

  @Delete('third-party/unbind/:provider')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '解绑第三方账号',
    description: '解除第三方账号绑定（需保留至少一种登录方式）',
  })
  @ApiResponse({ status: 200, description: 'Successfully unbound third-party account' })
  @ApiResponse({ status: 400, description: 'Cannot unbind the last authentication method' })
  async unbindThirdParty(@CurrentUser() user: any, @Param('provider') provider: string) {
    return this.authService.unbindThirdParty(user.id, provider);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: '刷新访问令牌。可以从 Cookie 或请求体中获取 refresh_token',
  })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshToken(refreshTokenDto.refresh_token);
    this.setCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '退出登录',
    description: '退出登录，清除 Cookie 中的认证信息',
  })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@Res({ passthrough: true }) res: Response) {
    this.clearCookies(res);
    return {
      message: 'Successfully logged out',
    };
  }

  @Post('send-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '发送短信验证码',
    description: '发送验证码到指定手机号，支持注册、登录、换绑手机号、重置密码等场景',
  })
  @ApiResponse({ status: 200, description: 'Verification code sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone number' })
  async sendVerificationCode(@Body() sendCodeDto: SendVerificationCodeDto) {
    return this.smsService.sendVerificationCode(sendCodeDto.phone, sendCodeDto.type);
  }

  @Post('change-phone')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '换绑手机号',
    description: '更换绑定的手机号，需要验证旧手机号和新手机号的验证码',
  })
  @ApiResponse({ status: 200, description: 'Phone number changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  @ApiResponse({ status: 409, description: 'Phone number already in use' })
  async changePhone(@CurrentUser() user: any, @Body() changePhoneDto: ChangePhoneDto) {
    return this.authService.changePhone(user.id, changePhoneDto, this.smsService);
  }

  @Post('change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '修改密码',
    description: '修改用户密码，需要验证当前密码',
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid password or passwords do not match' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(@CurrentUser() user: any, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }
}
