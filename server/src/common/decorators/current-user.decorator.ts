import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface FirebaseUser {
  uid: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'USER';
}

export const CurrentUser = createParamDecorator(
  (data: keyof FirebaseUser | undefined, ctx: ExecutionContext): FirebaseUser | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as FirebaseUser;
    return data ? user[data] : user;
  },
);
