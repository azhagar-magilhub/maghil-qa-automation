import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';

interface ProjectData {
  name: string;
  description?: string;
  jiraProjectKey?: string;
}

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async createProject(
    userId: string,
    data: ProjectData,
  ): Promise<{ id: string }> {
    const ref = this.db.collection('projects').doc();

    await ref.set({
      userId,
      name: data.name,
      description: data.description || '',
      jiraProjectKey: data.jiraProjectKey || '',
      memberCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.logger.log(`Created project ${ref.id} for user ${userId}`);
    return { id: ref.id };
  }

  async listProjects(
    userId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const snap = await this.db
      .collection('projects')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async getProject(
    userId: string,
    projectId: string,
  ): Promise<Record<string, unknown>> {
    const doc = await this.db.doc(`projects/${projectId}`).get();

    if (!doc.exists) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const data = doc.data();
    if (data?.userId !== userId) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return { id: doc.id, ...data };
  }

  async updateProject(
    userId: string,
    projectId: string,
    updates: Partial<ProjectData>,
  ): Promise<{ updated: boolean }> {
    const doc = await this.db.doc(`projects/${projectId}`).get();

    if (!doc.exists) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const data = doc.data();
    if (data?.userId !== userId) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const allowedFields: Record<string, unknown> = {};
    if (updates.name !== undefined) allowedFields.name = updates.name;
    if (updates.description !== undefined)
      allowedFields.description = updates.description;
    if (updates.jiraProjectKey !== undefined)
      allowedFields.jiraProjectKey = updates.jiraProjectKey;

    allowedFields.updatedAt = new Date();

    await this.db.doc(`projects/${projectId}`).update(allowedFields);

    this.logger.log(`Updated project ${projectId}`);
    return { updated: true };
  }

  async deleteProject(
    userId: string,
    projectId: string,
  ): Promise<{ deleted: boolean }> {
    const doc = await this.db.doc(`projects/${projectId}`).get();

    if (!doc.exists) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const data = doc.data();
    if (data?.userId !== userId) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    await this.db.doc(`projects/${projectId}`).delete();

    this.logger.log(`Deleted project ${projectId}`);
    return { deleted: true };
  }
}
