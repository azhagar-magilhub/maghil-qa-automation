import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

interface TeamData {
  name: string;
  description?: string;
  defaultJiraProject?: string;
  notifyOnFail?: boolean;
  notifyOnPass?: boolean;
}

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async createTeam(
    userId: string,
    teamData: TeamData,
  ): Promise<{ id: string }> {
    // Check if user already has a team
    const existing = await this.db
      .collection('teams')
      .where('ownerId', '==', userId)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Update existing team
      const teamId = existing.docs[0].id;
      await this.db.doc(`teams/${teamId}`).update({
        ...teamData,
        updatedAt: new Date(),
      });
      this.logger.log(`Updated team ${teamId} for user ${userId}`);
      return { id: teamId };
    }

    const ref = this.db.collection('teams').doc();
    await ref.set({
      ownerId: userId,
      name: teamData.name,
      description: teamData.description || '',
      defaultJiraProject: teamData.defaultJiraProject || '',
      notifyOnFail: teamData.notifyOnFail ?? true,
      notifyOnPass: teamData.notifyOnPass ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add the owner as first member
    await this.db.doc(`teams/${ref.id}/members/${userId}`).set({
      name: 'Owner',
      email: '',
      role: 'Admin',
      joinedAt: new Date(),
    });

    this.logger.log(`Created team ${ref.id} for user ${userId}`);
    return { id: ref.id };
  }

  async inviteMember(
    userId: string,
    teamId: string | undefined,
    email: string,
    role: string,
  ): Promise<{ inviteId: string }> {
    // Find the user's team if teamId not provided
    if (!teamId) {
      const teamSnap = await this.db
        .collection('teams')
        .where('ownerId', '==', userId)
        .limit(1)
        .get();

      if (teamSnap.empty) {
        throw new NotFoundException('No team found. Create a team first.');
      }
      teamId = teamSnap.docs[0].id;
    }

    const ref = this.db.collection('teamInvites').doc();
    await ref.set({
      teamId,
      email,
      role: role || 'User',
      status: 'pending',
      invitedBy: userId,
      sentAt: new Date(),
      createdAt: new Date(),
    });

    this.logger.log(`Invited ${email} to team ${teamId}`);
    return { inviteId: ref.id };
  }

  async listMembers(
    userId: string,
    teamId?: string,
  ): Promise<Array<Record<string, unknown>>> {
    if (!teamId) {
      const teamSnap = await this.db
        .collection('teams')
        .where('ownerId', '==', userId)
        .limit(1)
        .get();

      if (teamSnap.empty) {
        return [];
      }
      teamId = teamSnap.docs[0].id;
    }

    const snap = await this.db
      .collection(`teams/${teamId}/members`)
      .orderBy('joinedAt', 'desc')
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async updateMemberRole(
    userId: string,
    teamId: string | undefined,
    memberId: string,
    role: string,
  ): Promise<{ updated: boolean }> {
    if (!teamId) {
      const teamSnap = await this.db
        .collection('teams')
        .where('ownerId', '==', userId)
        .limit(1)
        .get();

      if (teamSnap.empty) {
        throw new NotFoundException('No team found.');
      }
      teamId = teamSnap.docs[0].id;
    }

    const memberRef = this.db.doc(`teams/${teamId}/members/${memberId}`);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    await memberRef.update({ role, updatedAt: new Date() });

    this.logger.log(`Updated role of member ${memberId} to ${role}`);
    return { updated: true };
  }

  async removeMember(
    userId: string,
    teamId: string | undefined,
    memberId: string,
  ): Promise<{ removed: boolean }> {
    if (!teamId) {
      const teamSnap = await this.db
        .collection('teams')
        .where('ownerId', '==', userId)
        .limit(1)
        .get();

      if (teamSnap.empty) {
        throw new NotFoundException('No team found.');
      }
      teamId = teamSnap.docs[0].id;
    }

    const memberRef = this.db.doc(`teams/${teamId}/members/${memberId}`);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    await memberRef.delete();

    this.logger.log(`Removed member ${memberId} from team ${teamId}`);
    return { removed: true };
  }
}
