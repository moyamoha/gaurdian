import { MailerService } from '@nestjs-modules/mailer';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import mongoose, { Model } from 'mongoose';
import { faker } from '@faker-js/faker';

import { UserDocument } from 'src/schemas/user.schema';
import {
  Verification,
  VerificationDocument,
} from 'src/schemas/verification.schema';
import { UserService } from './user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @InjectModel(Verification.name)
    private verifModel: Model<VerificationDocument>,
    private mailerService: MailerService,
  ) {}

  async login(user: UserDocument): Promise<{ accessToken: string }> {
    user.lastLoggedIn = new Date();
    if (!user.isActive) user.isActive = true;
    const payload = {
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
    });
    await user.save();
    return { accessToken };
  }

  async validateUser(email: string, pass: string): Promise<UserDocument> {
    const user = await this.userService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return user;
    }
    return null;
  }

  async singup(userObj: Partial<UserDocument>) {
    await this.userService.createUser(userObj);
  }

  async sendVerificationCode(user: UserDocument): Promise<void> {
    const randomNum = parseInt(
      faker.random.numeric(7, { allowLeadingZeros: false }),
    );
    const verif = this.verifModel.findOneAndUpdate(
      {
        user: new mongoose.Types.ObjectId(user._id),
      },
      { code: randomNum },
    );
    if (!user.mfaEnabled || !verif) {
      throw new ForbiddenException(
        'User has not enabled multi-factorauthentication',
      );
    }
    this.mailerService.sendMail({
      from: process.env.EMAIL_SENDER,
      to: user.email,
      subject: 'Verificationn code',
      html: `<p><strong>Dear ${user.firstname}!</strong><br></br>Your verification code is <strong>${randomNum}</strong>
      <br></br><i>Team Gaurdian.</i></p>`,
    });
  }

  async verifyLogin(code: number): Promise<{ accessToken: string }> {
    const verif = await this.verifModel.findOne({
      code: code,
    });
    const foundUser = await this.userService.getUserById(verif.user);
    console.log(foundUser);
    if (foundUser) {
      await this.verifModel.findOneAndUpdate(
        {
          user: new mongoose.Types.ObjectId(foundUser._id),
        },
        { code: 0 },
      );
      return this.login(foundUser);
    } else {
      throw new UnauthorizedException(
        'The verification code you provided is wrong!',
      );
    }
  }
}
