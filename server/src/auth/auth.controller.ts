import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Get,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from './guard/jwt.guard';
import { GetUser } from './decorator/get-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Yeni kullanıcı ve organizasyon kaydı',
    description:
      'Yeni bir kullanıcı oluşturur ve kullanıcıya bağlı otomatik bir organizasyon kurar.',
  })
  @ApiResponse({ status: 201, description: 'Kullanıcı başarıyla oluşturuldu.' })
  @ApiResponse({ status: 409, description: 'E-posta adresi zaten kullanımda.' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kullanıcı girişi',
    description:
      'E-posta ve şifre ile giriş yaparak JWT access token almanızı sağlar.',
  })
  @ApiResponse({ status: 200, description: 'Giriş başarılı.' })
  @ApiResponse({ status: 401, description: 'Hatalı kimlik bilgileri.' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('demo-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Enter read-only Demo Mode',
    description:
      'Issues a JWT for the pre-seeded, read-only demo account. No registration or password required.',
  })
  @ApiResponse({ status: 200, description: 'Demo session started.' })
  async demoLogin() {
    return this.authService.demoLogin();
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Profil bilgilerini getir',
    description:
      'Oturum açmış olan kullanıcının ve bağlı olduğu organizasyonun bilgilerini döndürür.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kullanıcı verileri başarıyla getirildi.',
  })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim.' })
  async me(@GetUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
