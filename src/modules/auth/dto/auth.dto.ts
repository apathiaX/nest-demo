import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AuthProvider } from 'prisma-mysql';

export class ChangePasswordDto {
  @ApiProperty({
    description: '当前密码',
    example: 'oldPassword123',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    description: '新密码（至少8位，包含字母和数字）',
    example: 'newPassword123',
    minLength: 8,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: '密码至少需要8个字符' })
  @MaxLength(50, { message: '密码最多50个字符' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]/, {
    message: '密码必须包含字母和数字',
  })
  newPassword: string;

  @ApiProperty({
    description: '确认新密码',
    example: 'newPassword123',
  })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  @ApiProperty({
    description: '验证码',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/, { message: 'Verification code must be 4-6 digits' })
  verificationCode: string;
}

/**
 * 换绑手机号 DTO
 */
export class ChangePhoneDto {
  @ApiProperty({
    example: '+8613900139000',
    description: '新手机号',
  })
  @IsNotEmpty({ message: 'New phone number is required' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  newPhone: string;

  @ApiProperty({
    example: '123456',
    description: '旧手机号验证码（用于验证身份）',
  })
  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  @Length(4, 6, { message: 'Verification code must be 4-6 digits' })
  @Matches(/^\d+$/, { message: 'Verification code must be numeric' })
  oldPhoneCode: string;

  @ApiProperty({
    example: '654321',
    description: '新手机号验证码（确保新手机号可用）',
  })
  @IsString()
  @IsNotEmpty({ message: 'New phone verification code is required' })
  @Length(4, 6, { message: 'Verification code must be 4-6 digits' })
  @Matches(/^\d+$/, { message: 'Verification code must be numeric' })
  newPhoneCode: string;
}

/**
 * 手机号登录 DTO
 */
export class LoginDto {
  @ApiProperty({
    example: '+8613800138000',
    description: '手机号',
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

/**
 * 验证码登录 DTO
 */
export class PhoneLoginDto {
  @ApiProperty({
    description: '手机号',
    example: '13800138000',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/, { message: 'Verification code must be 4-6 digits' })
  code: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refresh_token: string;
}

/**
 * 手机号注册 DTO
 * 仅支持手机号 + 密码注册，不支持 email 注册
 */
export class RegisterDto {
  @ApiProperty({ example: '+8613800138000', description: '手机号（必填）' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ example: 'Password123!', description: '密码（必填）' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: '昵称（可选）',
    required: false,
  })
  @IsString()
  @MaxLength(50, { message: 'Nickname must not exceed 50 characters' })
  nickName?: string;
}

/**
 * 发送验证码 DTO
 */
export class SendVerificationCodeDto {
  @ApiProperty({
    example: '+8613800138000',
    description: '手机号',
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({
    enum: ['register', 'login', 'change_phone', 'reset_password'],
    example: 'login',
    description: '验证码用途',
  })
  @IsEnum(['register', 'login', 'change_phone', 'reset_password'])
  @IsNotEmpty()
  type: 'register' | 'login' | 'change_phone' | 'reset_password';

  @ApiProperty({
    example: 3,
    description: '最大使用次数（默认1次，0表示无限制）',
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUses?: number;
}

/**
 * 验证验证码 DTO
 */
export class VerifyCodeDto {
  @ApiProperty({
    example: '+8613800138000',
    description: '手机号',
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({
    example: '123456',
    description: '验证码',
  })
  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  @Matches(/^\d{4,6}$/, { message: 'Verification code must be 4-6 digits' })
  code: string;

  @ApiProperty({
    enum: ['register', 'login', 'change_phone', 'reset_password'],
    example: 'change_phone',
    description: '验证码用途',
  })
  @IsEnum(['register', 'login', 'change_phone', 'reset_password'])
  @IsNotEmpty()
  type: 'register' | 'login' | 'change_phone' | 'reset_password';
}

/**
 * 第三方登录 DTO
 */
export class ThirdPartyLoginDto {
  @ApiProperty({
    enum: AuthProvider,
    example: 'huawei',
    description: '第三方平台类型',
  })
  @IsEnum(AuthProvider)
  @IsNotEmpty()
  provider: AuthProvider;

  @ApiProperty({
    example: 'unionid_or_openid_from_provider',
    description: '第三方平台返回的用户唯一标识（UnionID/OpenID）',
  })
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({
    example: 'access_token_from_provider',
    description: '第三方平台返回的访问令牌',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    example: 'refresh_token_from_provider',
    description: '第三方平台返回的刷新令牌',
    required: false,
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiProperty({
    example: 1704067200,
    description: '令牌过期时间戳（秒）',
    required: false,
  })
  @IsOptional()
  expiresIn?: number;

  @ApiProperty({
    description: '第三方平台返回的用户信息（昵称、头像等）',
    required: false,
    example: {
      nickname: '张三',
      avatar: 'https://example.com/avatar.jpg',
      gender: 'male',
    },
  })
  @IsObject()
  @IsOptional()
  providerData?: Record<string, any>;
}

/**
 * 第三方账号绑定 DTO
 */
export class BindThirdPartyDto {
  @ApiProperty({
    enum: AuthProvider,
    example: 'wechat',
    description: '要绑定的第三方平台类型',
  })
  @IsEnum(AuthProvider)
  @IsNotEmpty()
  provider: AuthProvider;

  @ApiProperty({
    example: 'unionid_or_openid_from_provider',
    description: '第三方平台返回的用户唯一标识',
  })
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({
    example: 'access_token_from_provider',
    description: '第三方平台返回的访问令牌',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    example: 'refresh_token_from_provider',
    description: '第三方平台返回的刷新令牌',
    required: false,
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiProperty({
    example: 1704067200,
    description: '令牌过期时间戳（秒）',
    required: false,
  })
  @IsOptional()
  expiresIn?: number;

  @ApiProperty({
    description: '第三方平台返回的用户信息',
    required: false,
  })
  @IsObject()
  @IsOptional()
  providerData?: Record<string, any>;
}
