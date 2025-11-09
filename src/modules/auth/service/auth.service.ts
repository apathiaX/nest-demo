import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/service/user.service';
import { EncryptionUtil } from '@/common/utils/encryption.util';
import { AuthProvider } from 'prisma-mysql';
import { BindThirdPartyDto, LoginDto, RegisterDto, ThirdPartyLoginDto } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 验证用户凭证（手机号 + 密码）
   */
  async validateUser(phone: string, password: string): Promise<any> {
    const user = await this.userService.findByPhone(phone);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 使用 bcrypt.compare 验证密码（bcrypt 每次 hash 结果不同，但 compare 能正确验证）
    const isPasswordValid = await EncryptionUtil.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  /**
   * 用户注册（仅支持手机号注册）
   */
  async register(registerDto: RegisterDto) {
    const { phone, password, nickName } = registerDto;

    // 检查手机号是否已存在
    const existingUser = await this.userService.findByPhone(phone);
    if (existingUser) {
      throw new ConflictException('Phone number already exists');
    }

    // 加密密码
    const hashedPassword = await EncryptionUtil.hashPassword(password);

    // 创建用户
    const user = await this.userService.create({
      phone,
      password: hashedPassword,
      nick_name: nickName,
      phone_verified: false, // 需要后续验证
      status: 'active',
    });

    // 创建手机号认证关系
    await this.userService.createAuthRelation({
      user_id: user.id,
      provider: AuthProvider.phone,
      provider_user_id: phone,
    });

    return this.generateTokens(user);
  }

  /**
   * 用户登录（手机号 + 密码）
   */
  async login(loginDto: LoginDto) {
    const { phone, password } = loginDto;
    const user = await this.validateUser(phone, password);

    // 更新最后登录时间
    await this.userService.updateLastLogin(user.id);

    return this.generateTokens(user);
  }

  /**
   * 验证码登录/注册
   * 如果用户不存在则自动注册
   */
  async phoneLogin(phone: string, code: string, smsService: any) {
    // 1. 验证验证码（不自动删除，允许多次使用）
    const isValid = await smsService.verifyCode(phone, code, 'login', false);

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // 2. 查找或创建用户
    let user: any = await this.userService.findByPhone(phone);

    if (!user) {
      // 用户不存在，自动注册
      user = await this.userService.create({
        phone,
        nick_name: `用户${phone.slice(-4)}`,
        phone_verified: true, // 验证码登录视为已验证
        status: 'active',
      });

      // 创建手机号认证关系
      await this.userService.createAuthRelation({
        user_id: user.id,
        provider: AuthProvider.phone,
        provider_user_id: phone,
      });

      this.logger.log(`📱 新用户通过验证码注册 - 手机号: ${phone}`);
    }

    // 3. 检查账号状态
    if (user?.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // 4. 更新最后登录时间
    await this.userService.updateLastLogin(user.id);

    // 5. 手动删除验证码（登录成功后删除，防止被盗用）
    smsService.deleteCode(phone, 'login');

    return this.generateTokens(user);
  }

  /**
   * 第三方登录
   * ⚠️ 第三方登录用户必须绑定手机号才能完整使用系统
   * 如果用户已存在则登录，否则返回需要绑定手机号的标识
   */
  async thirdPartyLogin(thirdPartyLoginDto: ThirdPartyLoginDto) {
    const { provider, providerId, accessToken, refreshToken, expiresIn, providerData } =
      thirdPartyLoginDto;

    // 验证第三方令牌（实际项目中应该调用第三方 API 验证）
    // 这里先假设前端已经验证过

    // 查找是否已有关联账号
    const authRelation = await this.userService.findAuthRelationByProvider(provider, providerId);

    let user;
    if (authRelation) {
      // 已存在，直接登录并更新令牌
      user = await this.userService.findById(authRelation.user_id);

      // ⚠️ 检查是否已绑定手机号
      if (!user.phone) {
        return {
          needBindPhone: true,
          tempUserId: user.id,
          message: 'Please bind your phone number to complete registration',
          provider,
          providerId,
        };
      }

      // 更新第三方令牌
      await this.userService.updateAuthRelation(authRelation.id, {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresIn ? new Date(expiresIn * 1000) : null,
        provider_data: providerData,
        last_synced_at: new Date(),
      });
    } else {
      // ⚠️ 新用户必须先绑定手机号，不能直接创建无手机号的账户
      return {
        needBindPhone: true,
        isNewUser: true,
        message: 'Please provide your phone number to complete registration',
        provider,
        providerId,
        tempData: {
          nickname: providerData?.nickname || providerData?.nick_name || `${provider}_user`,
          avatar: providerData?.avatar || providerData?.headimgurl || null,
          accessToken,
          refreshToken,
          expiresIn,
          providerData,
        },
      };
    }

    // 更新最后登录时间
    await this.userService.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user);

    return {
      needBindPhone: false,
      templateData: {
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
      },
    };
  }

  /**
   * 第三方登录完成手机号绑定
   * 用于第三方登录后绑定手机号完成注册
   */
  async completeThirdPartyBindPhone(
    phone: string,
    code: string,
    provider: string,
    providerId: string,
    tempData: any,
    smsService: any,
  ) {
    // 1. 验证短信验证码
    const isValid = await smsService.verifyCode(phone, code, 'register', true);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // 2. 检查手机号是否已被注册
    const existingUser = await this.userService.findByPhone(phone);
    if (existingUser) {
      // 手机号已存在，检查是否已绑定该第三方账号
      const authRelation = await this.userService.findAuthRelationByProvider(provider, providerId);

      if (authRelation && authRelation.user_id === existingUser.id) {
        // 已绑定，直接登录
        await this.userService.updateLastLogin(existingUser.id);
        return this.generateTokens(existingUser);
      }

      throw new ConflictException('Phone number already registered');
    }

    // 3. 创建新用户（带手机号）
    const user = await this.userService.create({
      phone,
      nick_name: tempData?.nickname || `用户${phone.slice(-4)}`,
      avatar: tempData?.avatar || null,
      phone_verified: true, // 验证码验证通过
      status: 'active',
    });

    // 4. 创建第三方认证关系
    await this.userService.createAuthRelation({
      user_id: user.id,
      provider: provider as AuthProvider,
      provider_user_id: providerId,
      access_token: tempData?.accessToken,
      refresh_token: tempData?.refreshToken,
      expires_at: tempData?.expiresIn ? new Date(tempData.expiresIn * 1000) : null,
      provider_data: tempData?.providerData,
      last_synced_at: new Date(),
    });

    // 5. 更新最后登录时间
    await this.userService.updateLastLogin(user.id);

    this.logger.log(`📱 第三方用户绑定手机号完成 - Provider: ${provider}, Phone: ${phone}`);

    return this.generateTokens(user);
  }

  /**
   * 绑定第三方账号
   * 将第三方账号绑定到已登录的用户
   */
  async bindThirdParty(userId: number, bindDto: BindThirdPartyDto) {
    const { provider, providerId, accessToken, refreshToken, expiresIn, providerData } = bindDto;

    // 检查该第三方账号是否已被其他用户绑定
    const existingAuth = await this.userService.findAuthRelationByProvider(provider, providerId);
    if (existingAuth) {
      if (existingAuth.user_id === userId) {
        throw new ConflictException('This account is already bound to you');
      } else {
        throw new ConflictException('This account is already bound to another user');
      }
    }

    // 检查用户是否已绑定该类型的第三方账号
    const userAuths = await this.userService.findAuthRelations(userId);
    const hasProvider = userAuths.some((auth) => auth.provider === provider);
    if (hasProvider) {
      throw new ConflictException(`You have already bound a ${provider} account`);
    }

    // 创建绑定关系
    await this.userService.createAuthRelation({
      user_id: userId,
      provider: provider as AuthProvider,
      provider_user_id: providerId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresIn ? new Date(expiresIn * 1000) : null,
      provider_data: providerData,
      last_synced_at: new Date(),
    });

    return {
      message: `Successfully bound ${provider} account`,
      provider,
      providerId,
    };
  }

  /**
   * 解绑第三方账号
   */
  async unbindThirdParty(userId: number, provider: string) {
    const userAuths = await this.userService.findAuthRelations(userId);

    // 检查是否有该绑定
    const authRelation = userAuths.find((auth) => auth.provider === provider);
    if (!authRelation) {
      throw new BadRequestException(`No ${provider} account bound`);
    }

    // 检查是否至少保留一种登录方式
    if (userAuths.length === 1) {
      throw new BadRequestException('Cannot unbind the last authentication method');
    }

    // 删除绑定关系
    await this.userService.deleteAuthRelation(authRelation.id);

    return {
      message: `Successfully unbound ${provider} account`,
      provider,
    };
  }

  /**
   * 生成访问令牌和刷新令牌
   */
  async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      userKey: user.user_key,
      phone: user.phone,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.userService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * 验证JWT令牌
   */
  async validateToken(payload: any) {
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    return user;
  }

  /**
   * 换绑手机号
   * 需要验证旧手机号和新手机号的验证码
   */
  async changePhone(userId: number, changePhoneDto: any, smsService: any) {
    const { newPhone, oldPhoneCode, newPhoneCode } = changePhoneDto;

    // 1. 获取当前用户信息
    const currentUser = await this.userService.findById(userId);

    if (!currentUser) {
      throw new UnauthorizedException('User not found');
    }

    // 2. 检查用户是否有绑定手机号
    if (!currentUser.phone) {
      throw new BadRequestException('No phone number bound to this account');
    }

    const oldPhone = currentUser.phone;

    // 3. 验证旧手机号的验证码（确保是本人操作）
    const isOldPhoneValid = await smsService.verifyCode(oldPhone, oldPhoneCode, 'change_phone');
    if (!isOldPhoneValid) {
      throw new UnauthorizedException('Invalid verification code for old phone');
    }

    // 4. 验证新手机号格式和是否已被使用
    if (oldPhone === newPhone) {
      throw new BadRequestException('New phone number must be different from the old one');
    }

    const existingUser = await this.userService.findByPhone(newPhone);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Phone number already in use by another account');
    }

    // 5. 验证新手机号的验证码（确保新手机号可用且属于用户）
    const isNewPhoneValid = await smsService.verifyCode(newPhone, newPhoneCode, 'change_phone');
    if (!isNewPhoneValid) {
      throw new BadRequestException('Invalid verification code for new phone');
    }

    // 6. 使用事务更新手机号（确保数据一致性）
    await this.userService.changePhoneTransaction(userId, oldPhone, newPhone);

    return {
      message: 'Phone number changed successfully',
      oldPhone: this.maskPhone(oldPhone),
      newPhone: this.maskPhone(newPhone),
      phoneVerified: true, // 新手机号已通过验证码验证
    };
  }

  /**
   * 手机号脱敏
   */
  private maskPhone(phone: string): string {
    if (phone.length <= 7) return phone;
    const prefix = phone.substring(0, 3);
    const suffix = phone.substring(phone.length - 4);
    return `${prefix}****${suffix}`;
  }

  /**
   * 验证当前密码
   * 用于敏感操作前的身份确认
   */
  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.userService.findByIdWithPassword(userId);

    if (!user || !user.password) {
      return false;
    }

    return EncryptionUtil.comparePassword(password, user.password);
  }

  /**
   * 修改密码
   * 需要验证旧密码
   */
  async changePassword(userId: number, changePasswordDto: any) {
    const { oldPassword, newPassword, confirmPassword } = changePasswordDto;

    // 1. 验证新密码和确认密码是否一致
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }

    // 2. 验证新密码不能与旧密码相同
    if (oldPassword === newPassword) {
      throw new BadRequestException('New password must be different from the old password');
    }

    // 3. 获取用户信息（包含密码）
    const user = await this.userService.findByIdWithPassword(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // 4. 验证旧密码是否正确
    if (!user.password) {
      throw new BadRequestException(
        'No password set for this account. Please use third-party login or set a password first.',
      );
    }

    const isOldPasswordValid = await EncryptionUtil.comparePassword(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // 5. 加密新密码
    const hashedNewPassword = await EncryptionUtil.hashPassword(newPassword);

    // 6. 更新密码
    await this.userService.updatePassword(userId, hashedNewPassword);

    return {
      message: 'Password changed successfully',
      userId: user.id,
      phone: this.maskPhone(user.phone || ''),
    };
  }
}
